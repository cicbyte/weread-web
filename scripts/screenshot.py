"""
README 截图脚本 - 使用 Playwright 对各页面进行截图
用法: python scripts/screenshot.py [--base-url http://localhost:8898] [--output docs/screenshots]
前置: 前端开发服务器已启动 (npm run dev)，后端已启动 (go run main.go)
"""

import argparse
import os
import sys
import time

sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

from playwright.sync_api import sync_playwright


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def take_screenshot(page, name: str, output_dir: str, dark: bool = False):
    suffix = "_dark" if dark else ""
    path = os.path.join(output_dir, f"{name}{suffix}.png")
    page.screenshot(path=path, full_page=True)
    mode = "深色" if dark else "浅色"
    print(f"  [{mode}] {name}{suffix}.png")


def auto_login(base_url: str, api_key: str) -> tuple[str, str] | None:
    """通过后端 API 自动登录，返回 (token, vid) 或 None"""
    import json
    import urllib.request
    import urllib.error

    url = f"{base_url}/api/v1/auth/login"
    data = json.dumps({"apiKey": api_key}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("code") == 0 and result.get("data"):
                d = result["data"]
                return d["token"], d["vid"]
            print(f"登录失败: {result.get('message', '未知错误')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"登录失败 (HTTP {e.code}): {body[:200]}")
    except Exception as e:
        print(f"登录请求失败: {e}")
    return None


def main():
    parser = argparse.ArgumentParser(description="WeRead Plus README 截图")
    parser.add_argument("--base-url", default="http://localhost:8898", help="前端地址")
    parser.add_argument("--output", default="docs/screenshots", help="输出目录")
    parser.add_argument("--token", default="", help="JWT Token（或设置 WEREAD_TOKEN 环境变量）")
    parser.add_argument("--vid", default="", help="用户 VID（或设置 WEREAD_VID 环境变量）")
    parser.add_argument("--api-key", default="", help="微信读书 API Key（或设置 WEREAD_API_KEY 环境变量）")
    args = parser.parse_args()

    # Token 来源：参数 > 环境变量
    token = args.token or os.environ.get("WEREAD_TOKEN", "")
    vid = args.vid or os.environ.get("WEREAD_VID", "")
    api_key = args.api_key or os.environ.get("WEREAD_API_KEY", "")

    # 无 token 时尝试用 API Key 自动登录
    if not token and api_key:
        print(f"使用 API Key 自动登录 {args.base_url} ...")
        result = auto_login(args.base_url, api_key)
        if result:
            token, vid = result
            print(f"登录成功，vid={vid[:8]}...")
        else:
            print("自动登录失败，退出")
            return

    ensure_dir(args.output)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # === 浅色模式 ===
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
        )
        ctx.set_default_timeout(15000)
        page = ctx.new_page()

        # 确保已登录
        if token:
            # 先到一个无路由守卫的页面（login 页），注入 localStorage，再跳转
            page.goto(f"{args.base_url}/login", wait_until="networkidle")
            page.evaluate(f"""
                localStorage.setItem('weread_token', '{token}');
                localStorage.setItem('weread_vid', '{vid}');
            """)
            page.goto(f"{args.base_url}/", wait_until="networkidle")
            time.sleep(1)
        else:
            page.goto(args.base_url, wait_until="networkidle")
            time.sleep(1)

        current_url = page.url
        if "/login" in current_url:
            print("未登录。请通过以下方式之一提供认证信息：")
            print("  1. --api-key 参数（自动登录获取 token）")
            print("  2. WEREAD_API_KEY 环境变量")
            print("  3. --token 和 --vid 参数")
            print("  4. WEREAD_TOKEN 和 WEREAD_VID 环境变量")
            ctx.close()
            browser.close()
            return

        print("\n=== 浅色模式截图 ===")

        # 1. 仪表盘
        page.goto(f"{args.base_url}/", wait_until="networkidle")
        time.sleep(2)
        take_screenshot(page, "dashboard", args.output)

        # 2. 书架
        page.goto(f"{args.base_url}/bookshelf", wait_until="networkidle")
        time.sleep(2)
        take_screenshot(page, "bookshelf", args.output)

        # 3. 笔记
        page.goto(f"{args.base_url}/notes", wait_until="networkidle")
        time.sleep(2)
        take_screenshot(page, "notes", args.output)

        # 4. 设置
        page.goto(f"{args.base_url}/settings", wait_until="networkidle")
        time.sleep(1)
        take_screenshot(page, "settings", args.output)

        # 5. 书籍详情（从书架点进第一本书）
        page.goto(f"{args.base_url}/bookshelf", wait_until="networkidle")
        time.sleep(1)
        first_book = page.query_selector('a[href^="/book/"]')
        if first_book:
            first_book.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            take_screenshot(page, "book_detail", args.output)
        else:
            print("  [跳过] 书架无书籍，无法截图书籍详情")

        # 6. 全局搜索（输入关键词触发下拉）
        page.goto(f"{args.base_url}/", wait_until="networkidle")
        time.sleep(1)
        search_input = page.query_selector('input[placeholder*="搜索"]')
        if search_input:
            search_input.fill("微信")
            time.sleep(1.5)  # 等待防抖和请求
            take_screenshot(page, "search", args.output)
        else:
            print("  [跳过] 未找到搜索框")

        ctx.close()

        # === 深色模式 ===
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
            color_scheme="dark",
        )
        ctx.set_default_timeout(15000)
        page = ctx.new_page()

        # 注入 token + 开启深色模式
        if token:
            page.goto(f"{args.base_url}/login", wait_until="networkidle")
            page.evaluate(f"""
                localStorage.setItem('weread_token', '{token}');
                localStorage.setItem('weread_vid', '{vid}');
                localStorage.setItem('weread_dark_mode', 'true');
            """)
        else:
            page.goto(args.base_url, wait_until="networkidle")
            page.evaluate("localStorage.setItem('weread_dark_mode', 'true');")

        page.goto(f"{args.base_url}/", wait_until="networkidle")
        time.sleep(2)

        print("\n=== 深色模式截图 ===")

        # 仪表盘 - 深色
        page.goto(f"{args.base_url}/", wait_until="networkidle")
        time.sleep(2)
        take_screenshot(page, "dashboard", args.output, dark=True)

        # 书架 - 深色
        page.goto(f"{args.base_url}/bookshelf", wait_until="networkidle")
        time.sleep(2)
        take_screenshot(page, "bookshelf", args.output, dark=True)

        ctx.close()
        browser.close()

    print(f"\n截图已保存到 {os.path.abspath(args.output)}/")
    print("可用文件：")
    for f in sorted(os.listdir(args.output)):
        if f.endswith(".png"):
            print(f"  {f}")


if __name__ == "__main__":
    main()

# WeRead Plus

> 微信读书增强平台 — 书架管理、阅读统计、笔记导出、智能搜索，一站式管理你的微信读书数据。

## 预览

<table>
  <tr>
    <td align="center"><b>仪表盘</b></td>
    <td align="center"><b>书架</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dashboard.png" alt="仪表盘" width="480" /></td>
    <td><img src="docs/screenshots/bookshelf.png" alt="书架" width="480" /></td>
  </tr>
  <tr>
    <td align="center"><b>笔记中心</b></td>
    <td align="center"><b>设置</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/notes.png" alt="笔记中心" width="480" /></td>
    <td><img src="docs/screenshots/settings.png" alt="设置" width="480" /></td>
  </tr>
  <tr>
    <td align="center"><b>全局搜索</b></td>
    <td align="center"><b>深色模式</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/search.png" alt="全局搜索" width="480" /></td>
    <td><img src="docs/screenshots/dashboard_dark.png" alt="深色模式" width="480" /></td>
  </tr>
</table>

## 功能特性

- **书架管理** — 同步微信读书书架，支持全部/在读/读完/推荐筛选
- **全局搜索** — 顶部搜索框实时搜索微信读书书城，下拉即达
- **阅读统计** — 仪表盘展示阅读天数、时长、趋势图、分类偏好、读书排行，支持周/月/年/总计切换
- **笔记中心** — 浏览所有笔记本，查看划线和想法，支持序号显示
- **书籍详情** — 查看目录、笔记、点评，支持 Markdown/HTML/TXT/PDF 多格式导出
- **图片缓存** — 书籍封面本地缓存代理，首次下载后从本地返回，30 天 HTTP 缓存
- **深色模式** — 完整的深色模式支持，跟随系统或手动切换
- **响应式布局** — 可收缩侧边栏，移动端适配，面包屑导航

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.24 / GoFrame v2.10.0 / MySQL |
| 前端 | React 19 / TypeScript 5.8 / Vite 6.2 / Tailwind CSS / Recharts |
| 图标 | Lucide React |
| 存储 | 本地文件系统 / S3 兼容（RustFS） |

## 快速开始

### 从源码运行

**环境要求：** Go 1.24+、Node.js 22+

```bash
# 克隆项目
git clone https://github.com/cicbyte/weread-web.git
cd weread-web

# 构建前端
cd web && npm i && npm run build && cd ..
mkdir -p resource/public/html && cp -r web/dist/* resource/public/html/

# 运行
go run main.go
```

### 前端开发

```bash
cd web
npm run dev    # 开发服务器（端口 8898）
npm run build  # 构建到 web/dist/
```

构建产物需复制到 `resource/public/html/` 供 Go 后端托管。

## 登录

首次使用需要输入微信读书 Skill API Key（通过 WeRead Skill 获取），登录后 Token 存储在本地。

## 页面说明

| 页面 | 路由 | 说明 |
|------|------|------|
| 仪表盘 | `/` | 阅读统计总览：摘要卡片、核心指标、趋势图、分类偏好、读书排行、阅读标签 |
| 书架 | `/bookshelf` | 书架管理 + 推荐，支持筛选（全部/在读/读完/推荐） |
| 笔记 | `/notes` | 笔记本列表 → 划线和想法浏览 |
| 书籍详情 | `/book/:bookId` | 目录、笔记、点评、多格式导出 |
| 设置 | `/settings` | API Key 管理 |

## 项目结构

```
weread-web/
├── api/v1/                  # API 请求/响应定义（g.Meta 路由标签）
├── internal/
│   ├── controller/          # HTTP 控制器
│   ├── service/             # Service 接口定义
│   ├── logic/               # 业务逻辑实现（init() 自动注册）
│   ├── dao/                 # 数据访问层（自动生成，勿手动编辑）
│   ├── model/               # 数据模型（entity/do/info）
│   ├── router/              # 路由注册
│   └── storage/             # 存储抽象层（Local / S3）
├── web/                     # React 前端
│   ├── components/          # 布局、Toast 等公共组件
│   ├── pages/               # 页面组件
│   └── services/            # API 调用服务
├── resource/
│   ├── public/html/         # 前端构建产物（打包进二进制）
│   └── sql/                 # 数据库初始化脚本
├── scripts/                 # 构建/测试脚本
├── manifest/config/         # 配置文件
└── Dockerfile               # 多阶段构建
```

## API

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/v1/auth/*` | 登录、刷新 Token、API Key 管理 |
| 微信读书代理 | `/api/v1/weread/proxy` | 代理转发微信读书 API |
| 图片代理 | `/api/v1/image/proxy` | 书籍封面缓存代理 |
| 笔记导出 | `/api/v1/notes/export` | Markdown/HTML/TXT/PDF 导出 |
| 数据同步 | `/api/v1/sync/*` | 书架、笔记、统计数据同步 |
| 系统 | `/api/v1/health` | 健康检查 |

## Docker 部署

```bash
docker build -t weread-plus .

docker run -d -p 8793:8793 \
  -v ./manifest:/app/manifest \
  -v ./uploads:/app/uploads \
  weread-plus
```

## License

[MIT](LICENSE)

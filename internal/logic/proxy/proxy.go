package proxy

import (
	"context"
	"fmt"
	"io"

	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
)

func init() {
	service.RegisterProxy(New())
}

func New() *sProxy {
	return &sProxy{}
}

type sProxy struct{}

// Proxy 转发请求到微信读书 API Gateway
func (s *sProxy) Proxy(ctx context.Context, r *ghttp.Request) (body []byte, err error) {
	// 获取用户的 API Key
	vid := r.GetCtxVar("vid").String()
	if vid == "" {
		return nil, fmt.Errorf("未认证")
	}

	apiKey, err := service.Auth().GetActiveApiKey(ctx, vid)
	if err != nil {
		return nil, fmt.Errorf("获取 API Key 失败: %w", err)
	}

	// 读取请求体
	reqBody, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, fmt.Errorf("读取请求体失败: %w", err)
	}

	// 转发到微信读书
	gateway := g.Cfg().MustGet(ctx, "weread.gateway").String()
	if gateway == "" {
		gateway = "https://i.weread.qq.com/api/agent/gateway"
	}

	client := g.Client()
	resp, err := client.SetHeaderMap(map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Content-Type":  "application/json",
	}).Post(ctx, gateway, reqBody)
	if err != nil {
		return nil, fmt.Errorf("请求微信读书失败: %w", err)
	}
	defer resp.Close()

	body = resp.ReadAll()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("微信读书返回错误 (HTTP %d): %s", resp.StatusCode, string(body))
	}

	return body, nil
}

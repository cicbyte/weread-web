package controller

import (
	"context"
	"fmt"

	api "github.com/cicbyte/weread-web/api/v1/proxy"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/net/ghttp"
)

var Proxy = proxyController{}

type proxyController struct {
	BaseController
}

func (c *proxyController) Proxy(ctx context.Context, req *api.ProxyReq) (res *api.ProxyRes, err error) {
	r := ghttp.RequestFromCtx(ctx)
	if r == nil {
		return nil, fmt.Errorf("request not found")
	}

	body, err := service.Proxy().Proxy(ctx, r)
	if err != nil {
		return nil, err
	}

	// 直接写入响应（微信读书返回的原始 JSON）
	r.Response.Header().Set("Content-Type", "application/json")
	r.Response.Write(body)
	r.Exit()
	return nil, nil
}

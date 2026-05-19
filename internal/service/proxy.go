package service

import (
	"context"

	"github.com/gogf/gf/v2/net/ghttp"
)

type IProxy interface {
	// Proxy 转发请求到微信读书 API Gateway
	Proxy(ctx context.Context, r *ghttp.Request) (body []byte, err error)
}

var localProxy IProxy

func Proxy() IProxy {
	if localProxy == nil {
		panic("implement not found for interface IProxy, forgot register?")
	}
	return localProxy
}

func RegisterProxy(i IProxy) {
	localProxy = i
}

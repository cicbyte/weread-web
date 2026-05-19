package controller

import (
	"context"

	"github.com/gogf/gf/v2/net/ghttp"
)

type BaseController struct {
}

// Init 自动执行的初始化方法
func (c *BaseController) Init(r *ghttp.Request) {
}

// getVidFromCtx 从 context 中获取 vid（由 JWT 中间件注入）
func getVidFromCtx(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	r := ghttp.RequestFromCtx(ctx)
	if r == nil {
		return ""
	}
	return r.GetCtxVar("vid").String()
}
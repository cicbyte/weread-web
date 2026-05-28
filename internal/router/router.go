package router

import (
	"context"

	controller "github.com/cicbyte/weread-web/internal/controller"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/net/ghttp"
)

type Router struct{}

func (router *Router) BindController(ctx context.Context, group *ghttp.RouterGroup) {
	group.Group("/api/v1", func(group *ghttp.RouterGroup) {
		group.Middleware(service.Middleware().MiddlewareCORS)

		// 公开路由
		group.Bind(
			controller.Health,
			controller.Image,
		)
		// 登录路由（单独绑定，不走认证中间件）
		group.Bind(
			controller.AuthLogin,
		)

		// 需要认证的路由
		group.Group("/", func(authGroup *ghttp.RouterGroup) {
			authGroup.Middleware(service.Middleware().MiddlewareAuth)
			authGroup.Bind(
				controller.AuthManage,
				controller.Proxy,
				controller.Sync,
			)
		})
	})
}

// BindExportRoutes 注册导出路由（不走 MiddlewareHandlerResponse，避免文件流被 JSON 包装）
func (router *Router) BindExportRoutes(s *ghttp.Server) {
	s.Group("/api/v1", func(group *ghttp.RouterGroup) {
		group.Middleware(service.Middleware().MiddlewareCORS)
		group.Middleware(service.Middleware().MiddlewareAuth)
		group.Bind(
			controller.ExportNotes,
		)
	})
}

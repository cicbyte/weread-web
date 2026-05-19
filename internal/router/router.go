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

		group.Bind(
			controller.Health,
		)
	})
}

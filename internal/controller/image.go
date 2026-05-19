package controller

import (
	"context"
	"strings"

	api "github.com/cicbyte/weread-web/api/v1/image"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/net/ghttp"
)

var Image = imageController{}

type imageController struct {
	BaseController
}

func (c *imageController) Proxy(ctx context.Context, req *api.ProxyReq) (res *api.ProxyRes, err error) {
	filePath, err := service.Image().Proxy(ctx, req.Url)
	if err != nil {
		return nil, err
	}

	r := ghttp.RequestFromCtx(ctx)
	r.Response.Header().Set("Cache-Control", "public, max-age=2592000")
	r.Response.Header().Set("Content-Type", contentTypeByExt(filePath))
	r.Response.ServeFile(filePath)
	r.Exit()

	return nil, nil
}

func contentTypeByExt(path string) string {
	switch {
	case strings.Contains(path, ".png"):
		return "image/png"
	case strings.Contains(path, ".webp"):
		return "image/webp"
	case strings.Contains(path, ".gif"):
		return "image/gif"
	default:
		return "image/jpeg"
	}
}

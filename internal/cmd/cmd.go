package cmd

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	_ "github.com/cicbyte/weread-web/internal/logic"
	"github.com/cicbyte/weread-web/internal/cron"
	"github.com/cicbyte/weread-web/internal/mcp"
	"github.com/cicbyte/weread-web/internal/router"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/os/gcmd"
)

var (
	Main = gcmd.Command{
		Name:  "main",
		Usage: "main",
		Brief: "start http server",
		Func: func(ctx context.Context, parser *gcmd.Parser) (err error) {
			ensureDataDirs(ctx)
			autoMigrate(ctx)
			migrateConstraints(ctx)

			s := g.Server()
			s.SetServerRoot("resource/public/html/")

			mcpHandler := mcp.NewStreamableHTTPServer()

			// uploads 静态文件（不走中间件，避免 JSON 包装破坏二进制数据）
			s.Group("/uploads", func(group *ghttp.RouterGroup) {
				group.ALL("/*", func(r *ghttp.Request) {
					r.Response.ServeFile("data/uploads" + r.URL.Path[len("/uploads"):])
					r.ExitAll()
				})
			})

			// 导出路由（不走 MiddlewareHandlerResponse，避免文件流被 JSON 包装）
			exportRouter := &router.Router{}
			exportRouter.BindExportRoutes(s)

			s.Group("/", func(group *ghttp.RouterGroup) {
				group.Middleware(ghttp.MiddlewareHandlerResponse)
				r := &router.Router{}
				r.BindController(ctx, group)

				// MCP 路由
				group.Group("/mcp", func(mcpGroup *ghttp.RouterGroup) {
					mcpGroup.ALL("/*", func(r *ghttp.Request) {
						mcpHandler.ServeHTTP(r.Response.Writer.ResponseWriter, r.Request)
					})
				})

				// SPA 回退
				group.Hook("/*", ghttp.HookBeforeServe, func(r *ghttp.Request) {
					path := r.URL.Path
					if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/mcp") || strings.HasPrefix(path, "/uploads/") {
						return
					}
					if strings.Contains(path, ".") && !strings.HasSuffix(path, "/") {
						return
					}
					if path != "/" && !strings.HasPrefix(path, "/api/") {
						r.Response.ServeFile("resource/public/html/index.html")
						r.ExitAll()
					}
				})
			})
			cron.StartScheduler()
			s.Run()
			return nil
		},
	}
)

func ensureDataDirs(ctx context.Context) {
	// 确保 data 目录结构存在
	for _, dir := range []string{"data/db", "data/uploads"} {
		os.MkdirAll(dir, 0755)
	}

	dbLink := g.Cfg().MustGet(ctx, "database.default.link").String()
	if strings.HasPrefix(dbLink, "sqlite") {
		re := regexp.MustCompile(`@file\((.+)\)`)
		matches := re.FindStringSubmatch(dbLink)
		if len(matches) >= 2 {
			dir := filepath.Dir(matches[1])
			if dir != "" && dir != "." {
				os.MkdirAll(dir, 0755)
			}
		}
	}
}

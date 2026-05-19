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

			s := g.Server()
			s.SetServerRoot("resource/public/html/")

			mcpHandler := mcp.NewStreamableHTTPServer()

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
					if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/mcp") {
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
	dbLink := g.Cfg().MustGet(ctx, "database.default.link").String()
	if !strings.HasPrefix(dbLink, "sqlite") {
		return
	}
	re := regexp.MustCompile(`@file\((.+)\)`)
	matches := re.FindStringSubmatch(dbLink)
	if len(matches) < 2 {
		return
	}
	dir := filepath.Dir(matches[1])
	if dir != "" && dir != "." {
		os.MkdirAll(dir, 0755)
	}
}

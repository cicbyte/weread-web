package middleware

import (
	"strings"

	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/net/ghttp"
)

func init() {
	service.RegisterMiddleware(New())
}

func New() *sMiddleware {
	return &sMiddleware{}
}

type sMiddleware struct{}

func (s *sMiddleware) MiddlewareCORS(r *ghttp.Request) {
	r.Response.Header().Set("Access-Control-Allow-Origin", "*")
	r.Response.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	r.Response.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	r.Response.Header().Set("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type")
	r.Response.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		r.Response.WriteHeader(200)
		return
	}

	r.Middleware.Next()
}

// MiddlewareAuth JWT 认证中间件
func (s *sMiddleware) MiddlewareAuth(r *ghttp.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		r.Response.WriteStatus(401, `{"code":401,"message":"缺少认证信息"}`)
		r.Exit()
		return
	}

	// 解析 Bearer Token
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		r.Response.WriteStatus(401, `{"code":401,"message":"认证格式错误"}`)
		r.Exit()
		return
	}

	vid, err := service.Auth().ParseJWT(parts[1])
	if err != nil {
		r.Response.WriteStatus(401, `{"code":401,"message":"Token 无效或已过期"}`)
		r.Exit()
		return
	}

	// 将 vid 存入 context
	r.SetCtxVar("vid", vid)
	r.Middleware.Next()
}

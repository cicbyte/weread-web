package proxy

import (
	"github.com/gogf/gf/v2/frame/g"
)

// ProxyReq 代理转发请求 - 将请求转发到微信读书 API Gateway
type ProxyReq struct {
	g.Meta `path:"/weread/proxy" method:"post" tags:"代理" summary:"微信读书 API 代理转发"`
}

// ProxyRes 代理响应
type ProxyRes struct {
	g.Meta `mime:"application/json"`
}

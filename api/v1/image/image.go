package image

import (
	"github.com/gogf/gf/v2/frame/g"
)

// ProxyReq 图片代理缓存请求
type ProxyReq struct {
	g.Meta `path:"/image/proxy" method:"get" tags:"图片" summary:"图片代理缓存"`
	Url    string `json:"url" v:"required#图片URL不能为空" dc:"原始图片URL"`
}

// ProxyRes 图片代理响应（直接写入二进制，不走 JSON 包装）
type ProxyRes struct {
	g.Meta `mime:"image/jpeg"`
}

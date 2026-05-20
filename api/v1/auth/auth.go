package auth

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
)

// LoginReq 登录请求
type LoginReq struct {
	g.Meta `path:"/auth/login" method:"post" tags:"认证" summary:"API Key 登录"`
	ApiKey string `json:"apiKey" v:"required#API Key 不能为空"`
}

// LoginRes 登录响应
type LoginRes struct {
	g.Meta `mime:"application/json"`
	Token  string `json:"token"`
	Vid    string `json:"vid"`
	Expire int64  `json:"expire"`
}

// RefreshReq 刷新 Token 请求
type RefreshReq struct {
	g.Meta `path:"/auth/refresh" method:"post" tags:"认证" summary:"刷新 Token"`
}

// RefreshRes 刷新 Token 响应
type RefreshRes struct {
	g.Meta `mime:"application/json"`
	Token  string `json:"token"`
	Expire int64  `json:"expire"`
}

// ProfileReq 获取用户信息请求
type ProfileReq struct {
	g.Meta `path:"/auth/profile" method:"get" tags:"认证" summary:"获取当前用户信息"`
}

// ProfileRes 获取用户信息响应
type ProfileRes struct {
	g.Meta    `mime:"application/json"`
	Vid       string `json:"vid"`
	Nickname  string `json:"nickname"`
	AvatarUrl string `json:"avatarUrl"`
	CreatedAt string `json:"createdAt"`
}

// ApiKeyItem API Key 条目
type ApiKeyItem struct {
	Id        int64  `json:"id"`
	IsActive  int    `json:"isActive"`
	CreatedAt string `json:"createdAt"`
	LastUsed  string `json:"lastUsed,omitempty"`
}

// ListKeysReq 列出 API Key 请求
type ListKeysReq struct {
	g.Meta `path:"/auth/keys" method:"get" tags:"认证" summary:"列出 API Key"`
}

// ListKeysRes 列出 API Key 响应
type ListKeysRes struct {
	g.Meta `mime:"application/json"`
	Keys   []ApiKeyItem `json:"keys"`
}

// BindKeyReq 绑定新 API Key 请求
type BindKeyReq struct {
	g.Meta `path:"/auth/keys" method:"post" tags:"认证" summary:"绑定新 API Key"`
	ApiKey string `json:"apiKey" v:"required#API Key 不能为空"`
}

// BindKeyRes 绑定新 API Key 响应
type BindKeyRes struct {
	g.Meta `mime:"application/json"`
	Msg    string `json:"msg"`
}

// DeleteKeyReq 删除 API Key 请求
type DeleteKeyReq struct {
	g.Meta `path:"/auth/keys/{id}" method:"delete" tags:"认证" summary:"删除 API Key"`
	Id     int64 `json:"id" v:"required#ID 不能为空"`
}

// DeleteKeyRes 删除 API Key 响应
type DeleteKeyRes struct {
	g.Meta `mime:"application/json"`
	Msg    string `json:"msg"`
}

// UpdateProfileReq 更新用户资料请求
type UpdateProfileReq struct {
	g.Meta     `path:"/auth/profile" method:"put" tags:"认证" summary:"更新用户资料" mime:"multipart/form-data"`
	Nickname   string              `json:"nickname" v:"required#昵称不能为空"`
	AvatarFile *ghttp.UploadFile   `json:"avatarFile" type:"file"`
}

// UpdateProfileRes 更新用户资料响应
type UpdateProfileRes struct {
	g.Meta    `mime:"application/json"`
	Nickname  string `json:"nickname"`
	AvatarUrl string `json:"avatarUrl"`
}

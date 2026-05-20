package service

import (
	"context"

	api "github.com/cicbyte/weread-web/api/v1/auth"
	"github.com/gogf/gf/v2/net/ghttp"
)

type IAuth interface {
	// Login 使用 API Key 登录
	Login(ctx context.Context, req *api.LoginReq) (res *api.LoginRes, err error)

	// Refresh 刷新 Token
	Refresh(ctx context.Context, vid string) (res *api.RefreshRes, err error)

	// Profile 获取用户信息
	Profile(ctx context.Context, vid string) (res *api.ProfileRes, err error)

	// ListKeys 列出 API Key
	ListKeys(ctx context.Context, vid string) (res *api.ListKeysRes, err error)

	// BindKey 绑定新 API Key
	BindKey(ctx context.Context, vid string, apiKey string) (res *api.BindKeyRes, err error)

	// DeleteKey 删除 API Key
	DeleteKey(ctx context.Context, vid string, id int64) (res *api.DeleteKeyRes, err error)

	// UpdateProfile 更新用户资料（昵称 + 头像）
	UpdateProfile(ctx context.Context, vid string, nickname string, avatarFile *ghttp.UploadFile) (res *api.UpdateProfileRes, err error)

	// ParseJWT 解析 JWT Token，返回 vid
	ParseJWT(token string) (vid string, err error)

	// GetActiveApiKey 获取用户有效的 API Key
	GetActiveApiKey(ctx context.Context, vid string) (apiKey string, err error)
}

var localAuth IAuth

func Auth() IAuth {
	if localAuth == nil {
		panic("implement not found for interface IAuth, forgot register?")
	}
	return localAuth
}

func RegisterAuth(i IAuth) {
	localAuth = i
}

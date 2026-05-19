package controller

import (
	"context"

	api "github.com/cicbyte/weread-web/api/v1/auth"
	"github.com/cicbyte/weread-web/internal/service"
)

// AuthLogin 公开认证控制器（仅登录）
var AuthLogin = authLoginController{}

type authLoginController struct {
	BaseController
}

func (c *authLoginController) Login(ctx context.Context, req *api.LoginReq) (res *api.LoginRes, err error) {
	return service.Auth().Login(ctx, req)
}

// AuthManage 受保护的认证控制器（需要 JWT）
var AuthManage = authManageController{}

type authManageController struct {
	BaseController
}

func (c *authManageController) Refresh(ctx context.Context, req *api.RefreshReq) (res *api.RefreshRes, err error) {
	return service.Auth().Refresh(ctx, getVidFromCtx(ctx))
}

func (c *authManageController) Profile(ctx context.Context, req *api.ProfileReq) (res *api.ProfileRes, err error) {
	return service.Auth().Profile(ctx, getVidFromCtx(ctx))
}

func (c *authManageController) ListKeys(ctx context.Context, req *api.ListKeysReq) (res *api.ListKeysRes, err error) {
	return service.Auth().ListKeys(ctx, getVidFromCtx(ctx))
}

func (c *authManageController) BindKey(ctx context.Context, req *api.BindKeyReq) (res *api.BindKeyRes, err error) {
	return service.Auth().BindKey(ctx, getVidFromCtx(ctx), req.ApiKey)
}

func (c *authManageController) DeleteKey(ctx context.Context, req *api.DeleteKeyReq) (res *api.DeleteKeyRes, err error) {
	return service.Auth().DeleteKey(ctx, getVidFromCtx(ctx), req.Id)
}

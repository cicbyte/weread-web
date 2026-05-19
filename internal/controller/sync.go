package controller

import (
	"context"

	api "github.com/cicbyte/weread-web/api/v1/sync"
	"github.com/cicbyte/weread-web/internal/service"
)

var Sync = syncController{}

type syncController struct {
	BaseController
}

func (c *syncController) Trigger(ctx context.Context, req *api.TriggerReq) (res *api.TriggerRes, err error) {
	logId, err := service.Sync().Trigger(ctx, getVidFromCtx(ctx), req.SyncScope)
	if err != nil {
		return nil, err
	}
	return &api.TriggerRes{
		LogId: logId,
		Msg:   "同步已触发",
	}, nil
}

func (c *syncController) Status(ctx context.Context, req *api.StatusReq) (res *api.StatusRes, err error) {
	return service.Sync().Status(ctx, getVidFromCtx(ctx))
}

func (c *syncController) History(ctx context.Context, req *api.HistoryReq) (res *api.HistoryRes, err error) {
	return service.Sync().History(ctx, getVidFromCtx(ctx), req.Page, req.Size)
}

func (c *syncController) GetConfig(ctx context.Context, req *api.GetConfigReq) (res *api.GetConfigRes, err error) {
	return service.Sync().GetConfig(ctx, getVidFromCtx(ctx))
}

func (c *syncController) UpdateConfig(ctx context.Context, req *api.UpdateConfigReq) (res *api.UpdateConfigRes, err error) {
	err = service.Sync().UpdateConfig(ctx, getVidFromCtx(ctx), req)
	if err != nil {
		return nil, err
	}
	return &api.UpdateConfigRes{Msg: "更新成功"}, nil
}

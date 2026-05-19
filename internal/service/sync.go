package service

import (
	"context"

	api "github.com/cicbyte/weread-web/api/v1/sync"
)

type ISync interface {
	// Trigger 手动触发数据同步
	Trigger(ctx context.Context, vid string, scope string) (logId int64, err error)

	// Status 获取最近同步状态
	Status(ctx context.Context, vid string) (res *api.StatusRes, err error)

	// History 获取同步历史
	History(ctx context.Context, vid string, page, size int) (res *api.HistoryRes, err error)

	// GetConfig 获取同步配置
	GetConfig(ctx context.Context, vid string) (res *api.GetConfigRes, err error)

	// UpdateConfig 更新同步配置
	UpdateConfig(ctx context.Context, vid string, req *api.UpdateConfigReq) (err error)

	// CallWeReadAPI 调用微信读书 API（内部使用）
	CallWeReadAPI(ctx context.Context, vid string, params map[string]interface{}) (body []byte, err error)
}

var localSync ISync

func Sync() ISync {
	if localSync == nil {
		panic("implement not found for interface ISync, forgot register?")
	}
	return localSync
}

func RegisterSync(i ISync) {
	localSync = i
}

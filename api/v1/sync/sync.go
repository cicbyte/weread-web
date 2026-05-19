package sync

import (
	"github.com/gogf/gf/v2/frame/g"
)

// TriggerReq 手动触发同步请求
type TriggerReq struct {
	g.Meta    `path:"/sync/trigger" method:"post" tags:"同步" summary:"手动触发数据同步"`
	SyncScope string `json:"syncScope" d:"full" v:"in:full,shelf,notes,progress,stats#同步范围无效"`
}

// TriggerRes 触发同步响应
type TriggerRes struct {
	g.Meta `mime:"application/json"`
	LogId  int64  `json:"logId"`
	Msg    string `json:"msg"`
}

// StatusReq 获取最近同步状态请求
type StatusReq struct {
	g.Meta `path:"/sync/status" method:"get" tags:"同步" summary:"获取最近同步状态"`
}

// StatusRes 同步状态响应
type StatusRes struct {
	g.Meta      `mime:"application/json"`
	Id          int64  `json:"id"`
	SyncType    string `json:"syncType"`
	Status      string `json:"status"`
	StartedAt   string `json:"startedAt"`
	FinishedAt  string `json:"finishedAt"`
	ItemsCount  int    `json:"itemsCount"`
	ErrorMsg    string `json:"errorMsg,omitempty"`
}

// HistoryReq 获取同步历史请求
type HistoryReq struct {
	g.Meta `path:"/sync/history" method:"get" tags:"同步" summary:"获取同步历史记录"`
	Page   int `json:"page" d:"1" v:"min:1#页码最小为1"`
	Size   int `json:"size" d:"20" v:"max:50#每页最多50条"`
}

// HistoryRes 同步历史响应
type HistoryRes struct {
	g.Meta `mime:"application/json"`
	Total  int         `json:"total"`
	Page   int         `json:"page"`
	Size   int         `json:"size"`
	List   []StatusRes `json:"list"`
}

// GetConfigReq 获取同步配置请求
type GetConfigReq struct {
	g.Meta `path:"/sync/config" method:"get" tags:"同步" summary:"获取同步配置"`
}

// GetConfigRes 同步配置响应
type GetConfigRes struct {
	g.Meta    `mime:"application/json"`
	Enabled   int    `json:"enabled"`
	Frequency string `json:"frequency"`
	SyncScope string `json:"syncScope"`
	SyncTime  string `json:"syncTime"`
}

// UpdateConfigReq 更新同步配置请求
type UpdateConfigReq struct {
	g.Meta    `path:"/sync/config" method:"put" tags:"同步" summary:"更新同步配置"`
	Enabled   *int    `json:"enabled"`
	Frequency string  `json:"frequency" v:"in:hourly,every6h,every12h,daily,weekly#频率无效"`
	SyncScope string  `json:"syncScope" v:"in:full,shelf,notes,progress,stats#同步范围无效"`
	SyncTime  string  `json:"syncTime" v:"length:5#时间格式为HH:MM"`
}

// UpdateConfigRes 更新配置响应
type UpdateConfigRes struct {
	g.Meta `mime:"application/json"`
	Msg    string `json:"msg"`
}

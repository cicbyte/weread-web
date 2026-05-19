package service

import (
	"context"
)

type IExport interface {
	// ExportNotes 导出笔记为指定格式
	ExportNotes(ctx context.Context, vid, bookId, format string) (filename string, content []byte, err error)
}

var localExport IExport

func Export() IExport {
	if localExport == nil {
		panic("implement not found for interface IExport, forgot register?")
	}
	return localExport
}

func RegisterExport(i IExport) {
	localExport = i
}

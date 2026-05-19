package export

import (
	"github.com/gogf/gf/v2/frame/g"
)

// ExportNotesReq 导出笔记请求
type ExportNotesReq struct {
	g.Meta  `path:"/notes/export" method:"get" tags:"导出" summary:"导出笔记"`
	BookId  string `json:"bookId" v:"required#书籍ID不能为空" dc:"书籍ID"`
	Format  string `json:"format" d:"markdown" v:"in:markdown,html,txt#格式无效" dc:"导出格式: markdown, html, txt"`
}

// ExportNotesRes 导出笔记响应（由控制器直接写文件流）
type ExportNotesRes struct {
	g.Meta `mime:"application/json"`
}

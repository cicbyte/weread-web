package controller

import (
	"context"
	"fmt"
	"net/url"

	api "github.com/cicbyte/weread-web/api/v1/export"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/net/ghttp"
)

var ExportNotes = exportController{}

type exportController struct {
	BaseController
}

func (c *exportController) ExportNotes(ctx context.Context, req *api.ExportNotesReq) (res *api.ExportNotesRes, err error) {
	r := ghttp.RequestFromCtx(ctx)
	if r == nil {
		return nil, fmt.Errorf("request not found")
	}

	vid := getVidFromCtx(ctx)
	filename, content, err := service.Export().ExportNotes(ctx, vid, req.BookId, req.Format)
	if err != nil {
		return nil, err
	}

	encodedFilename := url.QueryEscape(filename)
	r.Response.Header().Set("Content-Type", "application/octet-stream")
	r.Response.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"; filename*=UTF-8''%s`, filename, encodedFilename))
	r.Response.Write(content)
	r.ExitAll()
	return nil, nil
}

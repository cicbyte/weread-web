package sync

import (
	"context"
	"fmt"
	"io"
	"time"

	api "github.com/cicbyte/weread-web/api/v1/sync"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/encoding/gjson"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
	"github.com/gogf/gf/v2/util/gconv"
)

func init() {
	service.RegisterSync(New())
}

func New() *sSync {
	return &sSync{}
}

type sSync struct{}

// Trigger 手动触发数据同步
func (s *sSync) Trigger(ctx context.Context, vid string, scope string) (logId int64, err error) {
	// 创建同步日志
	result, err := g.DB().Model("sync_logs").Ctx(ctx).Insert(g.Map{
		"vid":        vid,
		"sync_type":  scope,
		"status":     "running",
		"started_at": gtime.Now(),
	})
	if err != nil {
		return 0, err
	}
	logId, _ = result.LastInsertId()

	// 执行同步
	var syncErr error
	var itemsCount int

	switch scope {
	case "full", "shelf":
		count, e := s.syncShelf(ctx, vid)
		if e != nil {
			syncErr = e
		}
		itemsCount += count
		if scope == "shelf" {
			break
		}
		fallthrough
	case "notes":
		count, e := s.syncNotes(ctx, vid)
		if e != nil && syncErr == nil {
			syncErr = e
		}
		itemsCount += count
		if scope == "notes" {
			break
		}
		fallthrough
	case "progress":
		count, e := s.syncProgress(ctx, vid)
		if e != nil && syncErr == nil {
			syncErr = e
		}
		itemsCount += count
		if scope == "progress" {
			break
		}
		fallthrough
	case "stats":
		count, e := s.syncStats(ctx, vid)
		if e != nil && syncErr == nil {
			syncErr = e
		}
		itemsCount += count
	}

	// 更新同步日志
	status := "success"
	errorMsg := ""
	if syncErr != nil {
		status = "failed"
		errorMsg = syncErr.Error()
	}
	g.DB().Model("sync_logs").Ctx(ctx).Where("id", logId).Data(g.Map{
		"status":      status,
		"finished_at": gtime.Now(),
		"items_count": itemsCount,
		"error_msg":   errorMsg,
	}).Update()

	return logId, nil
}

// Status 获取最近同步状态
func (s *sSync) Status(ctx context.Context, vid string) (res *api.StatusRes, err error) {
	record, err := g.DB().Model("sync_logs").Ctx(ctx).
		Where("vid", vid).
		Order("id DESC").
		One()
	if err != nil {
		return nil, err
	}
	if record == nil {
		return &api.StatusRes{Status: "never"}, nil
	}

	return &api.StatusRes{
		Id:         record["id"].Int64(),
		SyncType:   record["sync_type"].String(),
		Status:     record["status"].String(),
		StartedAt:  record["started_at"].String(),
		FinishedAt: record["finished_at"].String(),
		ItemsCount: record["items_count"].Int(),
		ErrorMsg:   record["error_msg"].String(),
	}, nil
}

// History 获取同步历史
func (s *sSync) History(ctx context.Context, vid string, page, size int) (res *api.HistoryRes, err error) {
	total, err := g.DB().Model("sync_logs").Ctx(ctx).Where("vid", vid).Count()
	if err != nil {
		return nil, err
	}

	records, err := g.DB().Model("sync_logs").Ctx(ctx).
		Where("vid", vid).
		Order("id DESC").
		Page(page, size).
		All()
	if err != nil {
		return nil, err
	}

	list := make([]api.StatusRes, 0, len(records))
	for _, r := range records {
		list = append(list, api.StatusRes{
			Id:         r["id"].Int64(),
			SyncType:   r["sync_type"].String(),
			Status:     r["status"].String(),
			StartedAt:  r["started_at"].String(),
			FinishedAt: r["finished_at"].String(),
			ItemsCount: r["items_count"].Int(),
			ErrorMsg:   r["error_msg"].String(),
		})
	}

	return &api.HistoryRes{
		Total: total,
		Page:  page,
		Size:  size,
		List:  list,
	}, nil
}

// GetConfig 获取同步配置
func (s *sSync) GetConfig(ctx context.Context, vid string) (res *api.GetConfigRes, err error) {
	record, err := g.DB().Model("sync_config").Ctx(ctx).Where("vid", vid).One()
	if err != nil {
		return nil, err
	}
	if record == nil {
		return &api.GetConfigRes{
			Enabled:   1,
			Frequency: "daily",
			SyncScope: "full",
			SyncTime:  "02:00",
		}, nil
	}

	return &api.GetConfigRes{
		Enabled:   record["enabled"].Int(),
		Frequency: record["frequency"].String(),
		SyncScope: record["sync_scope"].String(),
		SyncTime:  record["sync_time"].String(),
	}, nil
}

// UpdateConfig 更新同步配置
func (s *sSync) UpdateConfig(ctx context.Context, vid string, req *api.UpdateConfigReq) (err error) {
	data := g.Map{}
	if req.Enabled != nil {
		data["enabled"] = *req.Enabled
	}
	if req.Frequency != "" {
		data["frequency"] = req.Frequency
	}
	if req.SyncScope != "" {
		data["sync_scope"] = req.SyncScope
	}
	if req.SyncTime != "" {
		data["sync_time"] = req.SyncTime
	}

	_, err = g.DB().Model("sync_config").Ctx(ctx).
		Where("vid", vid).
		Data(data).
		Save(g.Map{"vid": vid})
	return
}

// CallWeReadAPI 调用微信读书 API
func (s *sSync) CallWeReadAPI(ctx context.Context, vid string, params map[string]interface{}) (body []byte, err error) {
	apiKey, err := service.Auth().GetActiveApiKey(ctx, vid)
	if err != nil {
		return nil, fmt.Errorf("获取 API Key 失败: %w", err)
	}

	gateway := g.Cfg().MustGet(ctx, "weread.gateway").String()
	if gateway == "" {
		gateway = "https://i.weread.qq.com/api/agent/gateway"
	}
	skillVersion := g.Cfg().MustGet(ctx, "weread.skillVersion").String()
	if skillVersion == "" {
		skillVersion = "1.0.3"
	}

	// 确保 skill_version 存在
	params["skill_version"] = skillVersion

	jsonBody := gconv.String(params)
	client := g.Client()
	resp, err := client.SetHeaderMap(map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Content-Type":  "application/json",
	}).Post(ctx, gateway, jsonBody)
	if err != nil {
		return nil, err
	}
	defer resp.Close()

	body = resp.ReadAll()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("微信读书返回错误 (HTTP %d)", resp.StatusCode)
	}

	return body, nil
}

// callWeReadAPIRaw 使用原始请求体调用微信读书 API
func (s *sSync) callWeReadAPIRaw(ctx context.Context, apiKey string, reqBody io.Reader) ([]byte, error) {
	gateway := g.Cfg().MustGet(ctx, "weread.gateway").String()
	if gateway == "" {
		gateway = "https://i.weread.qq.com/api/agent/gateway"
	}

	client := g.Client()
	resp, err := client.SetHeaderMap(map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Content-Type":  "application/json",
	}).Post(ctx, gateway, reqBody)
	if err != nil {
		return nil, err
	}
	defer resp.Close()

	body := resp.ReadAll()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("微信读书返回错误 (HTTP %d)", resp.StatusCode)
	}

	return body, nil
}

// syncShelf 同步书架数据
func (s *sSync) syncShelf(ctx context.Context, vid string) (count int, err error) {
	// 先清空旧数据
	g.DB().Model("shelf_books").Ctx(ctx).Where("vid", vid).Delete()

	body, err := s.CallWeReadAPI(ctx, vid, g.Map{
		"api_name": "/shelf/sync",
	})
	if err != nil {
		return 0, fmt.Errorf("同步书架失败: %w", err)
	}

	result, err := gjson.DecodeToJson(body)
	if err != nil {
		return 0, err
	}

	booksArr := result.Get("books").Array()
	g.Log().Debugf(ctx, "syncShelf: 获取到 %d 本书", len(booksArr))

	// 处理电子书
	books := result.Get("books")
	if books != nil {
		for _, book := range books.Array() {
			b := gconv.Map(book)
			if b == nil {
				continue
			}
			_, err := g.DB().Model("shelf_books").Ctx(ctx).
				Where("vid", vid).Where("book_id", gconv.String(b["bookId"])).
				Data(g.Map{
					"vid":             vid,
					"book_id":         gconv.String(b["bookId"]),
					"title":           gconv.String(b["title"]),
					"author":          gconv.String(b["author"]),
					"cover":           gconv.String(b["cover"]),
					"category":        gconv.String(b["category"]),
					"is_album":        0,
					"secret":          gconv.Int(b["secret"]),
					"is_top":          gconv.Int(b["isTop"]),
					"finish_reading":  gconv.Int(b["finishReading"]),
					"read_update_time": gconv.Int64(b["readUpdateTime"]),
					"synced_at":       gtime.Now(),
				}).Insert()
			if err != nil {
				g.Log().Warningf(ctx, "syncShelf: save book err=%v", err)
			} else {
				count++
			}
		}
	}

	// 处理有声书
	albums := result.Get("albums")
	if albums != nil {
		for _, album := range albums.Array() {
			a := gconv.Map(album)
			if a == nil {
				continue
			}
			info := gconv.Map(a["albumInfo"])
			if info == nil {
				continue
			}
			extra := gconv.Map(a["albumInfoExtra"])
			secret := 0
			isTop := 0
			if extra != nil {
				secret = gconv.Int(extra["secret"])
				isTop = gconv.Int(extra["isTop"])
			}
			_, err := g.DB().Model("shelf_books").Ctx(ctx).
								Where("vid", vid).Where("book_id", gconv.String(info["albumId"])).
				Data(g.Map{
					"vid":             vid,
					"book_id":         gconv.String(info["albumId"]),
					"title":           gconv.String(info["name"]),
					"author":          gconv.String(info["authorName"]),
					"cover":           gconv.String(info["cover"]),
					"is_album":        1,
					"secret":          secret,
					"is_top":          isTop,
					"synced_at":       gtime.Now(),
				}).Insert()
			if err == nil {
				count++
			}
		}
	}

	return count, nil
}

// syncNotes 同步笔记数据
func (s *sSync) syncNotes(ctx context.Context, vid string) (count int, err error) {
	// 先清空旧数据
	g.DB().Model("notes").Ctx(ctx).Where("vid", vid).Delete()

	// 获取书架上的所有书
	books, err := g.DB().Model("shelf_books").Ctx(ctx).
		Where("vid", vid).
		Fields("book_id").
		All()
	if err != nil {
		return 0, err
	}

	for _, book := range books {
		bookId := book["book_id"].String()

		// 同步划线
		body, err := s.CallWeReadAPI(ctx, vid, g.Map{
			"api_name": "/book/bookmarklist",
			"bookId":   bookId,
		})
		if err != nil {
			continue
		}
		result, _ := gjson.DecodeToJson(body)
		if result != nil {
			updated := result.Get("updated")
			if updated != nil {
				for _, item := range updated.Array() {
					m := gconv.Map(item)
					if m == nil {
						continue
					}
					g.DB().Model("notes").Ctx(ctx).
												Where("vid", vid).Where("source_id", gconv.String(m["bookmarkId"])).Where("note_type", "highlight").
						Data(g.Map{
							"vid":        vid,
							"book_id":    bookId,
							"note_type":  "highlight",
							"source_id":  gconv.String(m["bookmarkId"]),
							"chapter_uid": gconv.Int64(m["chapterUid"]),
							"content":    gconv.String(m["markText"]),
							"range_pos":  gconv.String(m["range"]),
							"created_at": time.Unix(gconv.Int64(m["createTime"]), 0).Format("2006-01-02 15:04:05"),
							"synced_at":  gtime.Now(),
						}).Insert()
					count++
				}
			}
		}

		// 同步想法/点评
		synckey := 0
		for {
			body, err = s.CallWeReadAPI(ctx, vid, g.Map{
				"api_name": "/review/list/mine",
				"bookid":   bookId,
				"synckey":  synckey,
				"count":    50,
			})
			if err != nil {
				break
			}
			result, _ = gjson.DecodeToJson(body)
			if result == nil {
				break
			}

			reviews := result.Get("reviews")
			if reviews == nil || len(reviews.Array()) == 0 {
				break
			}

			for _, item := range reviews.Array() {
				m := gconv.Map(item)
				if m == nil {
					continue
				}
				review := gconv.Map(m["review"])
				if review == nil {
					continue
				}
				g.DB().Model("notes").Ctx(ctx).
										Where("vid", vid).Where("source_id", gconv.String(review["reviewId"])).Where("note_type", "review").
					Data(g.Map{
						"vid":        vid,
						"book_id":    bookId,
						"note_type":  "review",
						"source_id":  gconv.String(review["reviewId"]),
						"chapter_uid": gconv.Int64(review["chapterUid"]),
						"content":    gconv.String(review["content"]),
						"created_at": time.Unix(gconv.Int64(review["createTime"]), 0).Format("2006-01-02 15:04:05"),
						"synced_at":  gtime.Now(),
					}).Insert()
				count++
			}

			if result.Get("hasMore").Int() != 1 {
				break
			}
			synckey = result.Get("synckey").Int()
		}
	}

	return count, nil
}

// syncProgress 同步阅读进度
func (s *sSync) syncProgress(ctx context.Context, vid string) (count int, err error) {
	// 先清空旧数据
	g.DB().Model("reading_progress").Ctx(ctx).Where("vid", vid).Delete()

	books, err := g.DB().Model("shelf_books").Ctx(ctx).
		Where("vid", vid).
		Fields("book_id").
		All()
	if err != nil {
		return 0, err
	}

	for _, book := range books {
		bookId := book["book_id"].String()

		body, err := s.CallWeReadAPI(ctx, vid, g.Map{
			"api_name": "/book/getprogress",
			"bookId":   bookId,
		})
		if err != nil {
			continue
		}

		result, _ := gjson.DecodeToJson(body)
		if result == nil {
			continue
		}

		progress := result.Get("book.progress")
		if progress == nil {
			continue
		}

		g.DB().Model("reading_progress").Ctx(ctx).Insert(g.Map{
			"vid":           vid,
			"book_id":       bookId,
			"progress":      result.Get("book.progress").Int(),
			"chapter_uid":   result.Get("book.chapterUid").Int64(),
			"chapter_offset": result.Get("book.chapterOffset").Int(),
			"read_time":     result.Get("book.recordReadingTime").Int(),
			"update_time":   result.Get("book.updateTime").Int64(),
			"snapshot_at":   gtime.Now(),
		})
		count++
	}

	return count, nil
}

// syncStats 同步阅读统计
func (s *sSync) syncStats(ctx context.Context, vid string) (count int, err error) {
	// 先清空旧数据
	g.DB().Model("reading_stats").Ctx(ctx).Where("vid", vid).Delete()

	modes := []string{"weekly", "monthly", "annually", "overall"}

	for _, mode := range modes {
		body, err := s.CallWeReadAPI(ctx, vid, g.Map{
			"api_name": "/readdata/detail",
			"mode":     mode,
		})
		if err != nil {
			continue
		}

		result, _ := gjson.DecodeToJson(body)
		if result == nil {
			continue
		}

		g.DB().Model("reading_stats").Ctx(ctx).Insert(g.Map{
			"vid":             vid,
			"mode":            mode,
			"base_time":       result.Get("baseTime").Int64(),
			"total_read_time": result.Get("totalReadTime").Int(),
			"read_days":       result.Get("readDays").Int(),
			"raw_data":        string(body),
			"snapshot_at":     gtime.Now(),
		})
		count++
	}

	return count, nil
}

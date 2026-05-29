package sync

import (
	"context"
	"fmt"
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

// shelfBook 记录一次同步中的书架信息
type shelfBook struct {
	BookId         string
	ReadUpdateTime int64
}

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

	var syncErr error
	var itemsCount int
	var syncedBooks []shelfBook

	switch scope {
	case "full", "shelf":
		count, books, e := s.syncShelf(ctx, vid)
		if e != nil {
			syncErr = e
		}
		itemsCount += count
		syncedBooks = books
		if scope == "shelf" {
			break
		}
		fallthrough
	case "notes":
		count, e := s.syncNotes(ctx, vid, syncedBooks)
		if e != nil && syncErr == nil {
			syncErr = e
		}
		itemsCount += count
		if scope == "notes" {
			break
		}
		fallthrough
	case "progress":
		count, e := s.syncProgress(ctx, vid, syncedBooks)
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
	// 自动修复超时的 running 记录（超过 10 分钟仍在 running 视为中断）
	g.DB().Model("sync_logs").Ctx(ctx).
		Where("vid", vid).
		Where("status", "running").
		Where("started_at < ?", gtime.Now().Add(-10*time.Minute)).
		Data(g.Map{
			"status":      "failed",
			"error_msg":   "同步超时，可能进程已中断",
			"finished_at": gtime.Now(),
		}).Update()

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

// syncShelf 同步书架数据（upsert + 清理已移除的书）
// 返回 (处理条数, 本次同步的书架列表)
func (s *sSync) syncShelf(ctx context.Context, vid string) (count int, books []shelfBook, err error) {
	body, err := s.CallWeReadAPI(ctx, vid, g.Map{
		"api_name": "/shelf/sync",
	})
	if err != nil {
		return 0, nil, fmt.Errorf("同步书架失败: %w", err)
	}

	result, err := gjson.DecodeToJson(body)
	if err != nil {
		return 0, nil, err
	}

	syncedIds := make(map[string]bool)

	// 处理电子书
	for _, book := range result.Get("books").Array() {
		b := gconv.Map(book)
		if b == nil {
			continue
		}
		bookId := gconv.String(b["bookId"])
		syncedIds[bookId] = true
		books = append(books, shelfBook{
			BookId:         bookId,
			ReadUpdateTime: gconv.Int64(b["readUpdateTime"]),
		})

		_, e := g.DB().Model("shelf_books").Ctx(ctx).OnConflict("vid", "book_id").
			Data(g.Map{
				"vid":              vid,
				"book_id":          bookId,
				"title":            gconv.String(b["title"]),
				"author":           gconv.String(b["author"]),
				"cover":            gconv.String(b["cover"]),
				"category":         gconv.String(b["category"]),
				"is_album":         0,
				"secret":           gconv.Int(b["secret"]),
				"is_top":           gconv.Int(b["isTop"]),
				"finish_reading":   gconv.Int(b["finishReading"]),
				"read_update_time": gconv.Int64(b["readUpdateTime"]),
				"synced_at":        gtime.Now(),
			}).Save()
		if e != nil {
			g.Log().Warningf(ctx, "syncShelf: save book err=%v", e)
		} else {
			count++
		}
	}

	// 处理有声书
	for _, album := range result.Get("albums").Array() {
		a := gconv.Map(album)
		if a == nil {
			continue
		}
		info := gconv.Map(a["albumInfo"])
		if info == nil {
			continue
		}
		bookId := gconv.String(info["albumId"])
		syncedIds[bookId] = true
		books = append(books, shelfBook{
			BookId:         bookId,
			ReadUpdateTime: gconv.Int64(info["updateTime"]),
		})

		extra := gconv.Map(a["albumInfoExtra"])
		secret := 0
		isTop := 0
		if extra != nil {
			secret = gconv.Int(extra["secret"])
			isTop = gconv.Int(extra["isTop"])
		}
		_, e := g.DB().Model("shelf_books").Ctx(ctx).OnConflict("vid", "book_id").
			Data(g.Map{
				"vid":              vid,
				"book_id":          bookId,
				"title":            gconv.String(info["name"]),
				"author":           gconv.String(info["authorName"]),
				"cover":            gconv.String(info["cover"]),
				"is_album":         1,
				"secret":           secret,
				"is_top":           isTop,
				"read_update_time": gconv.Int64(info["updateTime"]),
				"synced_at":        gtime.Now(),
			}).Save()
		if e == nil {
			count++
		}
	}

	// 清理已从书架移除的书
	if len(syncedIds) > 0 {
		ids := make([]string, 0, len(syncedIds))
		for id := range syncedIds {
			ids = append(ids, id)
		}
		delResult, _ := g.DB().Model("shelf_books").Ctx(ctx).
			Where("vid", vid).
			Where("book_id NOT IN(?)", ids).
			Delete()
		if delResult != nil {
			deleted, _ := delResult.RowsAffected()
			if deleted > 0 {
				g.Log().Infof(ctx, "syncShelf: 清理 %d 本已移除的书", deleted)
			}
		}
	}

	g.Log().Infof(ctx, "syncShelf: 同步 %d 本, 书架共 %d 本", count, len(syncedIds))
	return count, books, nil
}

// syncNotes 增量同步笔记数据
// syncedBooks: 本次书架同步的结果（含 readUpdateTime），为空时从数据库读取
func (s *sSync) syncNotes(ctx context.Context, vid string, syncedBooks []shelfBook) (count int, err error) {
	// 如果没有传入书架数据（单独同步 notes scope），从本地数据库读取
	if len(syncedBooks) == 0 {
		records, e := g.DB().Model("shelf_books").Ctx(ctx).
			Where("vid", vid).
			Fields("book_id, read_update_time").
			All()
		if e != nil {
			return 0, e
		}
		for _, r := range records {
			syncedBooks = append(syncedBooks, shelfBook{
				BookId:         r["book_id"].String(),
				ReadUpdateTime: r["read_update_time"].Int64(),
			})
		}
		// 没有 shelf 数据时全量拉取
		return s.syncNotesFull(ctx, vid, syncedBooks)
	}

	// 检查哪些书需要同步笔记（readUpdateTime 有变化，或本地无笔记）
	localBooks, _ := g.DB().Model("shelf_books").Ctx(ctx).
		Where("vid", vid).
		Fields("book_id, read_update_time").
		All()
	localUpdateTime := make(map[string]int64)
	for _, r := range localBooks {
		localUpdateTime[r["book_id"].String()] = r["read_update_time"].Int64()
	}

	// 检查哪些书本地有笔记
	localNoteBooks, _ := g.DB().Model("notes").Ctx(ctx).
		Where("vid", vid).
		Fields("DISTINCT book_id").
		All()
	hasNotes := make(map[string]bool)
	for _, r := range localNoteBooks {
		hasNotes[r["book_id"].String()] = true
	}

	// 筛选需要同步的书
	var needSync []shelfBook
	for _, sb := range syncedBooks {
		localRUT := localUpdateTime[sb.BookId]
		// 需要同步的条件：首次同步（本地无笔记）或 readUpdateTime 有变化
		if !hasNotes[sb.BookId] || sb.ReadUpdateTime != localRUT {
			needSync = append(needSync, sb)
		}
	}

	if len(needSync) == 0 {
		g.Log().Info(ctx, "syncNotes: 所有书的笔记均无变化，跳过")
		return 0, nil
	}

	g.Log().Infof(ctx, "syncNotes: 需同步 %d/%d 本书的笔记", len(needSync), len(syncedBooks))

	for _, sb := range needSync {
		n, e := s.syncBookNotes(ctx, vid, sb.BookId)
		if e != nil {
			g.Log().Warningf(ctx, "syncNotes: bookId=%s err=%v", sb.BookId, e)
		}
		count += n
	}

	// 更新本地 shelf_books 的 read_update_time 为最新值（确保下次增量判断准确）
	for _, sb := range needSync {
		g.DB().Model("shelf_books").Ctx(ctx).
			Where("vid", vid).Where("book_id", sb.BookId).
			Data(g.Map{"read_update_time": sb.ReadUpdateTime}).
			Update()
	}

	return count, nil
}

// syncNotesFull 全量同步笔记（无书架数据时使用）
func (s *sSync) syncNotesFull(ctx context.Context, vid string, books []shelfBook) (count int, err error) {
	g.Log().Infof(ctx, "syncNotesFull: 全量同步 %d 本书的笔记", len(books))

	for _, sb := range books {
		n, e := s.syncBookNotes(ctx, vid, sb.BookId)
		if e != nil {
			g.Log().Warningf(ctx, "syncNotesFull: bookId=%s err=%v", sb.BookId, e)
		}
		count += n
	}
	return count, nil
}

// syncBookNotes 同步单本书的划线和想法（upsert）
func (s *sSync) syncBookNotes(ctx context.Context, vid string, bookId string) (count int, err error) {
	remoteSourceIds := make(map[string]bool)

	// 同步划线
	body, err := s.CallWeReadAPI(ctx, vid, g.Map{
		"api_name": "/book/bookmarklist",
		"bookId":   bookId,
	})
	if err == nil {
		result, _ := gjson.DecodeToJson(body)
		if result != nil {
			for _, item := range result.Get("updated").Array() {
				m := gconv.Map(item)
				if m == nil {
					continue
				}
				sourceId := gconv.String(m["bookmarkId"])
				remoteSourceIds[sourceId] = true
				_, _ = g.DB().Model("notes").Ctx(ctx).OnConflict("vid", "source_id", "note_type").
				Data(g.Map{
					"vid":         vid,
					"book_id":     bookId,
					"note_type":   "highlight",
					"source_id":   sourceId,
					"chapter_uid": gconv.Int64(m["chapterUid"]),
					"content":     gconv.String(m["markText"]),
					"range_pos":   gconv.String(m["range"]),
					"created_at":  time.Unix(gconv.Int64(m["createTime"]), 0).Format("2006-01-02 15:04:05"),
					"synced_at":   gtime.Now(),
				}).Save()
				count++
			}
		}
	}

	// 同步想法/点评（分页）
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
		result, _ := gjson.DecodeToJson(body)
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
			sourceId := gconv.String(review["reviewId"])
			remoteSourceIds[sourceId] = true
			_, _ = g.DB().Model("notes").Ctx(ctx).OnConflict("vid", "source_id", "note_type").
				Data(g.Map{
					"vid":         vid,
					"book_id":     bookId,
					"note_type":   "review",
					"source_id":   sourceId,
					"chapter_uid": gconv.Int64(review["chapterUid"]),
					"content":     gconv.String(review["content"]),
					"created_at":  time.Unix(gconv.Int64(review["createTime"]), 0).Format("2006-01-02 15:04:05"),
					"synced_at":   gtime.Now(),
				}).Save()
			count++
		}

		if result.Get("hasMore").Int() != 1 {
			break
		}
		synckey = result.Get("synckey").Int()
	}

	// 清理该书中本地有但远程已删除的笔记
	if len(remoteSourceIds) > 0 {
		ids := make([]string, 0, len(remoteSourceIds))
		for id := range remoteSourceIds {
			ids = append(ids, id)
		}
		g.DB().Model("notes").Ctx(ctx).
			Where("vid", vid).
			Where("book_id", bookId).
			Where("source_id NOT IN(?)", ids).
			Delete()
	}

	return count, nil
}

// syncProgress 同步阅读进度（upsert + 清理已移除书）
func (s *sSync) syncProgress(ctx context.Context, vid string, syncedBooks []shelfBook) (count int, err error) {
	// 如果没有传入书架数据，从本地读取
	if len(syncedBooks) == 0 {
		records, e := g.DB().Model("shelf_books").Ctx(ctx).
			Where("vid", vid).
			Fields("book_id").
			All()
		if e != nil {
			return 0, e
		}
		for _, r := range records {
			syncedBooks = append(syncedBooks, shelfBook{BookId: r["book_id"].String()})
		}
	}

	for _, sb := range syncedBooks {
		body, err := s.CallWeReadAPI(ctx, vid, g.Map{
			"api_name": "/book/getprogress",
			"bookId":   sb.BookId,
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

		_, _ = g.DB().Model("reading_progress").Ctx(ctx).OnConflict("vid", "book_id").
			Data(g.Map{
				"vid":            vid,
				"book_id":        sb.BookId,
				"progress":       result.Get("book.progress").Int(),
				"chapter_uid":    result.Get("book.chapterUid").Int64(),
				"chapter_offset": result.Get("book.chapterOffset").Int(),
				"read_time":      result.Get("book.recordReadingTime").Int(),
				"update_time":    result.Get("book.updateTime").Int64(),
				"snapshot_at":    gtime.Now(),
			}).Save()
		count++
	}

	// 清理已从书架移除的书的进度
	if len(syncedBooks) > 0 {
		ids := make([]string, 0, len(syncedBooks))
		for _, sb := range syncedBooks {
			ids = append(ids, sb.BookId)
		}
		g.DB().Model("reading_progress").Ctx(ctx).
			Where("vid", vid).
			Where("book_id NOT IN(?)", ids).
			Delete()
	}

	return count, nil
}

// syncStats 同步阅读统计
func (s *sSync) syncStats(ctx context.Context, vid string) (count int, err error) {
	// 统计数据量小，保持全量覆盖
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

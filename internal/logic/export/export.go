package export

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/encoding/gjson"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/util/gconv"
)

func init() {
	service.RegisterExport(New())
}

func New() *sExport {
	return &sExport{}
}

type sExport struct{}

type noteGroup struct {
	ChapterUID  int64
	ChapterName string
	Highlights  []highlight
	Reviews     []review
}

type highlight struct {
	Content string
	Range   string
}

type review struct {
	Content  string
	Abstract string
}

// ExportNotes 导出笔记
func (s *sExport) ExportNotes(ctx context.Context, vid, bookId, format string) (filename string, content []byte, err error) {
	// 获取书籍信息
	bookBody, err := service.Sync().CallWeReadAPI(ctx, vid, g.Map{
		"api_name": "/book/info",
		"bookId":   bookId,
	})
	if err != nil {
		return "", nil, fmt.Errorf("获取书籍信息失败: %w", err)
	}
	bookJson, _ := gjson.DecodeToJson(bookBody)
	bookTitle := "未知书名"
	bookAuthor := ""
	if bookJson != nil {
		bookTitle = bookJson.Get("title").String()
		bookAuthor = bookJson.Get("author").String()
	}

	// 获取划线
	hlBody, err := service.Sync().CallWeReadAPI(ctx, vid, g.Map{
		"api_name": "/book/bookmarklist",
		"bookId":   bookId,
	})
	if err != nil {
		return "", nil, fmt.Errorf("获取划线失败: %w", err)
	}

	highlights := make(map[int64][]highlight)
	chapters := make(map[int64]string)
	hlJson, _ := gjson.DecodeToJson(hlBody)
	if hlJson != nil {
		// 章节映射
		for _, ch := range hlJson.Get("chapters").Array() {
			m := gconv.Map(ch)
			uid := gconv.Int64(m["chapterUid"])
			chapters[uid] = gconv.String(m["title"])
		}
		// 划线
		for _, item := range hlJson.Get("updated").Array() {
			m := gconv.Map(item)
			uid := gconv.Int64(m["chapterUid"])
			highlights[uid] = append(highlights[uid], highlight{
				Content: gconv.String(m["markText"]),
				Range:   gconv.String(m["range"]),
			})
		}
	}

	// 获取想法
	rvBody, err := service.Sync().CallWeReadAPI(ctx, vid, g.Map{
		"api_name": "/review/list/mine",
		"bookid":   bookId,
		"count":    100,
	})
	reviews := make(map[int64][]review)
	if err == nil {
		rvJson, _ := gjson.DecodeToJson(rvBody)
		if rvJson != nil {
			for _, item := range rvJson.Get("reviews").Array() {
				m := gconv.Map(item)
				r := gconv.Map(m["review"])
				if r == nil {
					continue
				}
				uid := gconv.Int64(r["chapterUid"])
				reviews[uid] = append(reviews[uid], review{
					Content:  gconv.String(r["content"]),
					Abstract: gconv.String(r["abstract"]),
				})
			}
		}
	}

	// 收集所有章节 UID 并排序
	uidSet := make(map[int64]bool)
	for uid := range highlights {
		uidSet[uid] = true
	}
	for uid := range reviews {
		uidSet[uid] = true
	}
	var uids []int64
	for uid := range uidSet {
		uids = append(uids, uid)
	}
	sort.Slice(uids, func(i, j int) bool { return uids[i] < uids[j] })

	// 生成分组
	groups := make([]noteGroup, 0, len(uids))
	for _, uid := range uids {
		chName := chapters[uid]
		if chName == "" {
			chName = fmt.Sprintf("章节 %d", uid)
		}
		groups = append(groups, noteGroup{
			ChapterUID:  uid,
			ChapterName: chName,
			Highlights:  highlights[uid],
			Reviews:     reviews[uid],
		})
	}

	// 根据格式生成
	date := time.Now().Format("2006-01-02")
	switch format {
	case "markdown":
		filename = fmt.Sprintf("%s_笔记_%s.md", bookTitle, date)
		content = []byte(s.generateMarkdown(bookTitle, bookAuthor, groups))
	case "html":
		filename = fmt.Sprintf("%s_笔记_%s.html", bookTitle, date)
		content = []byte(s.generateHTML(bookTitle, bookAuthor, groups))
	case "txt":
		filename = fmt.Sprintf("%s_笔记_%s.txt", bookTitle, date)
		content = []byte(s.generateTXT(bookTitle, bookAuthor, groups))
	default:
		filename = fmt.Sprintf("%s_笔记_%s.md", bookTitle, date)
		content = []byte(s.generateMarkdown(bookTitle, bookAuthor, groups))
	}

	return filename, content, nil
}

func (s *sExport) generateMarkdown(title, author string, groups []noteGroup) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# %s\n\n", title))
	if author != "" {
		sb.WriteString(fmt.Sprintf("**作者**: %s\n\n", author))
	}
	sb.WriteString(fmt.Sprintf("**导出时间**: %s\n\n---\n\n", time.Now().Format("2006-01-02 15:04:05")))

	for _, g := range groups {
		sb.WriteString(fmt.Sprintf("## %s\n\n", g.ChapterName))
		for _, h := range g.Highlights {
			sb.WriteString(fmt.Sprintf("> %s\n\n", h.Content))
		}
		for _, r := range g.Reviews {
			sb.WriteString(fmt.Sprintf("💡 **想法**: %s\n", r.Content))
			if r.Abstract != "" {
				sb.WriteString(fmt.Sprintf("> %s\n", r.Abstract))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

func (s *sExport) generateHTML(title, author string, groups []noteGroup) string {
	var sb strings.Builder
	sb.WriteString(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">`)
	sb.WriteString(fmt.Sprintf(`<title>%s - 笔记导出</title>`, title))
	sb.WriteString(`<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#07C160;border-bottom:2px solid #07C160;padding-bottom:10px}h2{color:#333;margin-top:2em}blockquote{border-left:3px solid #07C160;margin:1em 0;padding:0.5em 1em;background:#f0faf4;color:#555}.review{background:#fff3cd;padding:0.8em;margin:0.5em 0;border-radius:4px}.review .label{color:#856404;font-weight:bold}.abstract{border-left:2px solid #ddd;margin:0.3em 0;padding-left:0.8em;color:#888}</style>`)
	sb.WriteString(`</head><body>`)
	sb.WriteString(fmt.Sprintf(`<h1>%s</h1>`, title))
	if author != "" {
		sb.WriteString(fmt.Sprintf(`<p><strong>作者</strong>: %s</p>`, author))
	}
	sb.WriteString(fmt.Sprintf(`<p><strong>导出时间</strong>: %s</p><hr>`, time.Now().Format("2006-01-02 15:04:05")))

	for _, g := range groups {
		sb.WriteString(fmt.Sprintf(`<h2>%s</h2>`, g.ChapterName))
		for _, h := range g.Highlights {
			sb.WriteString(fmt.Sprintf(`<blockquote>%s</blockquote>`, h.Content))
		}
		for _, r := range g.Reviews {
			sb.WriteString(`<div class="review">`)
			sb.WriteString(fmt.Sprintf(`<span class="label">💡 想法</span>: %s`, r.Content))
			if r.Abstract != "" {
				sb.WriteString(fmt.Sprintf(`<div class="abstract">%s</div>`, r.Abstract))
			}
			sb.WriteString(`</div>`)
		}
	}

	sb.WriteString(`</body></html>`)
	return sb.String()
}

func (s *sExport) generateTXT(title, author string, groups []noteGroup) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("《%s》笔记导出\n", title))
	if author != "" {
		sb.WriteString(fmt.Sprintf("作者: %s\n", author))
	}
	sb.WriteString(fmt.Sprintf("导出时间: %s\n", time.Now().Format("2006-01-02 15:04:05")))
	sb.WriteString(strings.Repeat("=", 50) + "\n\n")

	for _, g := range groups {
		sb.WriteString(fmt.Sprintf("【%s】\n\n", g.ChapterName))
		for _, h := range g.Highlights {
			sb.WriteString(fmt.Sprintf("[划线] %s\n\n", h.Content))
		}
		for _, r := range g.Reviews {
			sb.WriteString(fmt.Sprintf("[想法] %s\n", r.Content))
			if r.Abstract != "" {
				sb.WriteString(fmt.Sprintf("  原文: %s\n", r.Abstract))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

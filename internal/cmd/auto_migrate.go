package cmd

import (
	"context"
	"strings"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gfile"
	"github.com/gogf/gf/v2/os/gres"
)

// autoMigrate 启动时自动检查并创建数据表
// migrateConstraints 为已有数据库补加约束（幂等）
func autoMigrate(ctx context.Context) {
	// 获取数据库类型
	dbType := g.Cfg().MustGet(ctx, "database.default.link").String()
	if dbType == "" {
		return
	}

	var sqlFile string
	var checkSQL string

	switch {
	case strings.HasPrefix(dbType, "mysql"):
		sqlFile = "resource/sql/mysql/init.sql"
		checkSQL = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()"
	case strings.HasPrefix(dbType, "sqlite"):
		sqlFile = "resource/sql/sqlite/init.sql"
		checkSQL = "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
	default:
		return
	}

	// 检查表是否已存在
	record, err := g.DB().GetOne(ctx, checkSQL)
	if err != nil {
		g.Log().Warningf(ctx, "Auto migrate check failed: %v", err)
		return
	}
	count := 0
	if record != nil {
		for _, v := range record {
			count = v.Int()
			break
		}
	}
	if count > 0 {
		g.Log().Info(ctx, "Database tables already exist, skip auto migrate")
		return
	}

	// 表不存在，读取 init.sql（优先 gres，降级 gfile）
	var content string
	if file := gres.Get(sqlFile); file != nil {
		content = string(file.Content())
	} else if gfile.Exists(sqlFile) {
		content = gfile.GetContents(sqlFile)
	} else {
		g.Log().Errorf(ctx, "SQL file not found: %s", sqlFile)
		return
	}
	g.Log().Info(ctx, "Database tables not found, running auto migrate...")

	for _, stmt := range splitSQL(content) {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}
		if _, err := g.DB().Exec(ctx, stmt); err != nil {
			g.Log().Errorf(ctx, "Auto migrate failed: %v, SQL: %s", err, stmt)
			return
		}
	}

	g.Log().Info(ctx, "Auto migrate completed successfully")
}

// splitSQL 按分号分割 SQL 语句，跳过注释，正确处理 BEGIN...END 块
func splitSQL(sql string) []string {
	var statements []string
	var current strings.Builder
	inBlock := false

	for _, line := range strings.Split(sql, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		current.WriteString(line)
		current.WriteString("\n")

		upper := strings.ToUpper(trimmed)
		if strings.Contains(upper, "BEGIN") {
			inBlock = true
		}
		if inBlock && strings.Contains(upper, "END") && strings.HasSuffix(upper, ";") {
			inBlock = false
			statements = append(statements, current.String())
			current.Reset()
			continue
		}
		if !inBlock && strings.HasSuffix(trimmed, ";") {
			statements = append(statements, current.String())
			current.Reset()
		}
	}

	if current.Len() > 0 {
		if remaining := strings.TrimSpace(current.String()); remaining != "" {
			statements = append(statements, remaining)
		}
	}

	return statements
}

// migrateConstraints 为已有数据库补加唯一约束（幂等，重复执行不报错）
func migrateConstraints(ctx context.Context) {
	dbType := g.Cfg().MustGet(ctx, "database.default.link").String()
	db := g.DB()

	switch {
	case strings.HasPrefix(dbType, "sqlite"):
		// SQLite: 先检查是否已有唯一索引
		record, _ := db.GetOne(ctx,
			"SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='index' AND tbl_name='reading_progress' AND name='idx_reading_progress_vid_book'")
		if record != nil && record["cnt"].Int() > 0 {
			// 已有索引但不是唯一索引，需要重建
			db.Exec(ctx, "DROP INDEX IF EXISTS idx_reading_progress_vid_book")
		}
		// 尝试添加唯一约束（忽略已存在的错误）
		_, err := db.Exec(ctx, "CREATE UNIQUE INDEX IF NOT EXISTS uk_reading_progress_vid_book ON reading_progress(vid, book_id)")
		if err != nil {
			g.Log().Debugf(ctx, "migrateConstraints reading_progress: %v (may already exist)", err)
		}

	case strings.HasPrefix(dbType, "mysql"):
		// MySQL: 检查是否已有唯一索引
		record, _ := db.GetOne(ctx,
			"SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='reading_progress' AND index_name='uk_vid_book'")
		if record == nil || record["cnt"].Int() == 0 {
			// 先删除重复数据（保留最新一条）
			db.Exec(ctx, `DELETE rp1 FROM reading_progress rp1 INNER JOIN reading_progress rp2 ON rp1.vid=rp2.vid AND rp1.book_id=rp2.book_id AND rp1.id < rp2.id`)
			_, err := db.Exec(ctx, "ALTER TABLE reading_progress ADD UNIQUE KEY uk_vid_book (vid, book_id)")
			if err != nil {
				g.Log().Debugf(ctx, "migrateConstraints reading_progress: %v", err)
			}
		}
	}
}

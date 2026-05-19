package cron

import (
	"fmt"
	"time"

	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gctx"
	"github.com/robfig/cron/v3"
)

// StartScheduler 启动定时同步调度器
func StartScheduler() {
	c := cron.New()
	// 每分钟检查一次是否有需要执行的同步任务
	c.AddFunc("* * * * *", checkAndRun)
	c.Start()
	g.Log().Info(nil, "Cron scheduler started")
}

func checkAndRun() {
	ctx := gctx.New()
	defer ctx.Done()

	// 获取所有启用同步的用户
	records, err := g.DB().Model("sync_config").Ctx(ctx).
		Where("enabled", 1).
		All()
	if err != nil {
		g.Log().Warningf(ctx, "Cron: query sync config failed: %v", err)
		return
	}

	now := time.Now()
	nowStr := now.Format("15:04")

	for _, record := range records {
		vid := record["vid"].String()
		frequency := record["frequency"].String()
		syncTime := record["sync_time"].String()
		syncScope := record["sync_scope"].String()

		shouldRun := false

		switch frequency {
		case "hourly":
			// 每小时第0分钟执行
			shouldRun = now.Minute() == 0
		case "every6h":
			// 每6小时: 0,6,12,18
			shouldRun = now.Minute() == 0 && (now.Hour()%6 == 0)
		case "every12h":
			// 每12小时: 0,12
			shouldRun = now.Minute() == 0 && (now.Hour()%12 == 0)
		case "daily":
			// 每天指定时间
			shouldRun = nowStr == syncTime
		case "weekly":
			// 每周一指定时间
			shouldRun = now.Weekday() == time.Monday && nowStr == syncTime
		}

		if shouldRun {
			go runSync(vid, syncScope)
		}
	}
}

func runSync(vid, scope string) {
	ctx := gctx.New()
	defer ctx.Done()

	g.Log().Infof(ctx, "Cron: starting sync for vid=%s scope=%s", vid, scope)

	_, err := service.Sync().Trigger(ctx, vid, scope)
	if err != nil {
		g.Log().Errorf(ctx, "Cron: sync failed for vid=%s: %v", vid, err)
	} else {
		g.Log().Infof(ctx, "Cron: sync completed for vid=%s", vid)
	}

	_ = fmt.Sprintf("") // avoid unused import
}

package main

import (
	"os"
	"path/filepath"

	_ "github.com/cicbyte/weread-web/internal/packed"
	//重要 需要导入数据库驱动
	_ "github.com/gogf/gf/contrib/drivers/mysql/v2"
	// SQLite数据库驱动,如果需要支持需要go get -u github.com/gogf/gf/contrib/drivers/sqlite/v2
	_ "github.com/gogf/gf/contrib/drivers/sqlite/v2"

	"github.com/gogf/gf/v2/os/gbuild"
	"github.com/gogf/gf/v2/os/gctx"

	"github.com/cicbyte/weread-web/internal/cmd"
)

// 默认配置（首次运行时自动创建，用户可修改）
const defaultConfig = `# weread-web 配置文件（可修改）
server:
  address: ":8000"
  logPath: "log/server"
  logStdout: true
  errorStack: true
  errorLogEnabled: true
  errorLogPattern: "error-{Ymd}.log"
  accessLogEnabled: true
  accessLogPattern: "access-{Ymd}.log"

logger:
  path: "log/run"
  file: "{Y-m-d}.log"
  level: "all"
  stdout: true

database:
  default:
    link: "sqlite::@file(data/db/weread_web.db)"

storage:
  type: "local"
  local:
    basePath: "data/uploads"
    baseURL: "/uploads"
  image:
    maxFileSize: 10485760
    pathPrefix: "articles/images"
  migration:
    enabled: false

search:
  enabled: false
`

func init() {
	// 生产构建时切换工作目录到可执行文件所在目录
	if gbuild.Get(gbuild.BuiltVersion) != nil {
		if exe, err := os.Executable(); err == nil {
			if dir := filepath.Dir(exe); dir != "" {
				os.Chdir(dir)
			}
		}
	}
	ensureDefaultConfig()
}

func ensureDefaultConfig() {
	configPath := "manifest/config/config.yaml"
	if _, err := os.Stat(configPath); err == nil {
		return
	}
	os.MkdirAll(filepath.Dir(configPath), 0755)
	os.WriteFile(configPath, []byte(defaultConfig), 0644)
}

func main() {
	cmd.Main.Run(gctx.GetInitCtx())
}

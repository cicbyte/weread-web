package image

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/frame/g"
)

func init() {
	service.RegisterImage(New())
}

func New() *sImage {
	return &sImage{}
}

type sImage struct{}

func (s *sImage) Proxy(ctx context.Context, imageURL string) (filePath string, err error) {
	cacheDir := s.getCacheDir()

	hash := sha256.Sum256([]byte(imageURL))
	hexStr := hex.EncodeToString(hash[:16])
	subDir := hexStr[:2]
	ext := s.guessExt(imageURL)
	cachePath := filepath.Join(cacheDir, subDir, hexStr+ext)

	// 缓存命中
	if _, err := os.Stat(cachePath); err == nil {
		return cachePath, nil
	}

	// 下载
	resp, err := g.Client().Get(ctx, imageURL)
	if err != nil {
		return "", fmt.Errorf("下载图片失败: %w", err)
	}
	defer resp.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("下载图片失败 (HTTP %d)", resp.StatusCode)
	}

	body := resp.ReadAll()
	if len(body) == 0 {
		return "", fmt.Errorf("下载图片为空")
	}

	// 保存到磁盘
	dir := filepath.Dir(cachePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("创建缓存目录失败: %w", err)
	}
	if err := os.WriteFile(cachePath, body, 0644); err != nil {
		return "", fmt.Errorf("保存缓存文件失败: %w", err)
	}

	g.Log().Debugf(ctx, "image proxy: cached %s -> %s", imageURL, cachePath)
	return cachePath, nil
}

func (s *sImage) getCacheDir() string {
	base := g.Cfg().MustGet(nil, "storage.local.basePath").String()
	if base == "" {
		base = "uploads"
	}
	return filepath.Join(base, "covers")
}

func (s *sImage) guessExt(url string) string {
	lower := strings.ToLower(url)
	for _, ext := range []string{".jpg", ".jpeg", ".png", ".webp", ".gif"} {
		if strings.Contains(lower, ext) {
			return ext
		}
	}
	return ".jpg"
}

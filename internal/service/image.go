package service

import "context"

type IImage interface {
	// Proxy 代理图片请求：检查缓存 → 下载 → 保存 → 返回本地文件路径
	Proxy(ctx context.Context, imageURL string) (filePath string, err error)
}

var localImage IImage

func Image() IImage {
	if localImage == nil {
		panic("implement not found for interface IImage, forgot register?")
	}
	return localImage
}

func RegisterImage(i IImage) {
	localImage = i
}

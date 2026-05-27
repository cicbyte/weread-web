package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	api "github.com/cicbyte/weread-web/api/v1/auth"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/encoding/gjson"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/os/gtime"
	"github.com/golang-jwt/jwt/v5"
)

func init() {
	service.RegisterAuth(New())
}

func New() *sAuth {
	return &sAuth{}
}

type sAuth struct{}

// Login 使用 API Key 登录
// 流程：验证 Key → 取 registTime → 查找/创建用户 → 返回 JWT
func (s *sAuth) Login(ctx context.Context, req *api.LoginReq) (res *api.LoginRes, err error) {
	// 1. 验证 API Key 并获取账户标识
	registTime, err := s.verifyApiKey(ctx, req.ApiKey)
	if err != nil {
		return nil, fmt.Errorf("API Key 验证失败: %w", err)
	}

	// 2. 通过 registTime 查找已有用户
	vid, err := s.findOrCreateUser(ctx, registTime)
	if err != nil {
		return nil, err
	}

	// 3. 存储 API Key（加密）
	if err := s.storeApiKey(ctx, vid, req.ApiKey); err != nil {
		return nil, fmt.Errorf("存储 API Key 失败: %w", err)
	}

	// 4. 生成 JWT Token
	token, expire, err := s.generateJWT(vid)
	if err != nil {
		return nil, fmt.Errorf("生成 Token 失败: %w", err)
	}

	return &api.LoginRes{
		Token:  token,
		Vid:    vid,
		Expire: expire,
	}, nil
}

// Refresh 刷新 Token
func (s *sAuth) Refresh(ctx context.Context, vid string) (res *api.RefreshRes, err error) {
	token, expire, err := s.generateJWT(vid)
	if err != nil {
		return nil, err
	}
	return &api.RefreshRes{
		Token:  token,
		Expire: expire,
	}, nil
}

// Profile 获取用户信息
func (s *sAuth) Profile(ctx context.Context, vid string) (res *api.ProfileRes, err error) {
	record, err := g.DB().Model("users").Ctx(ctx).Where("vid", vid).One()
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, fmt.Errorf("用户不存在")
	}

	return &api.ProfileRes{
		Vid:       record["vid"].String(),
		Nickname:  record["nickname"].String(),
		AvatarUrl: record["avatar_url"].String(),
		CreatedAt: record["created_at"].String(),
	}, nil
}

// ListKeys 列出 API Key
func (s *sAuth) ListKeys(ctx context.Context, vid string) (res *api.ListKeysRes, err error) {
	records, err := g.DB().Model("api_keys").Ctx(ctx).
		Where("vid", vid).
		Fields("id, is_active, created_at, last_used").
		Order("id DESC").
		All()
	if err != nil {
		return nil, err
	}

	keys := make([]api.ApiKeyItem, 0, len(records))
	for _, r := range records {
		keys = append(keys, api.ApiKeyItem{
			Id:        r["id"].Int64(),
			IsActive:  r["is_active"].Int(),
			CreatedAt: r["created_at"].String(),
			LastUsed:  r["last_used"].String(),
		})
	}

	return &api.ListKeysRes{Keys: keys}, nil
}

// BindKey 绑定新 API Key
// 验证新 Key → 获取 registTime → 匹配同一用户则绑定，否则提示
func (s *sAuth) BindKey(ctx context.Context, vid string, apiKey string) (res *api.BindKeyRes, err error) {
	registTime, err := s.verifyApiKey(ctx, apiKey)
	if err != nil {
		return nil, fmt.Errorf("API Key 验证失败: %w", err)
	}

	// 检查 registTime 是否匹配当前用户
	record, err := g.DB().Model("users").Ctx(ctx).Where("vid", vid).One()
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, fmt.Errorf("用户不存在")
	}

	existingRegistTime := record["regist_time"].Int64()
	if existingRegistTime != 0 && existingRegistTime != registTime {
		return nil, fmt.Errorf("该 API Key 属于不同的微信读书账户")
	}

	if err := s.storeApiKey(ctx, vid, apiKey); err != nil {
		return nil, err
	}

	return &api.BindKeyRes{Msg: "绑定成功"}, nil
}

// DeleteKey 删除 API Key
func (s *sAuth) DeleteKey(ctx context.Context, vid string, id int64) (res *api.DeleteKeyRes, err error) {
	_, err = g.DB().Model("api_keys").Ctx(ctx).
		Where("id", id).Where("vid", vid).
		Delete()
	if err != nil {
		return nil, err
	}
	return &api.DeleteKeyRes{Msg: "删除成功"}, nil
}

// ParseJWT 解析 JWT Token
func (s *sAuth) ParseJWT(tokenString string) (vid string, err error) {
	secret := s.getJwtSecret()
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token claims")
	}

	vid, ok = claims["vid"].(string)
	if !ok {
		return "", fmt.Errorf("invalid token: missing vid")
	}

	return vid, nil
}

// GetActiveApiKey 获取用户有效的 API Key
func (s *sAuth) GetActiveApiKey(ctx context.Context, vid string) (apiKey string, err error) {
	record, err := g.DB().Model("api_keys").Ctx(ctx).
		Where("vid", vid).Where("is_active", 1).
		Order("id DESC").
		One()
	if err != nil {
		return "", err
	}
	if record == nil {
		return "", fmt.Errorf("没有有效的 API Key")
	}

	// 更新最后使用时间
	g.DB().Model("api_keys").Ctx(ctx).
		Where("id", record["id"]).
		Data(g.Map{"last_used": gtime.Now()}).
		Update()

	decrypted, err := s.decryptApiKey(record["api_key"].String())
	if err != nil {
		return "", fmt.Errorf("解密 API Key 失败: %w", err)
	}

	return decrypted, nil
}

// --- 内部方法 ---

// verifyApiKey 验证 API Key 有效性，返回微信读书账户的 registTime
func (s *sAuth) verifyApiKey(ctx context.Context, apiKey string) (registTime int64, err error) {
	gateway := g.Cfg().MustGet(ctx, "weread.gateway").String()
	if gateway == "" {
		gateway = "https://i.weread.qq.com/api/agent/gateway"
	}
	skillVersion := g.Cfg().MustGet(ctx, "weread.skillVersion").String()
	if skillVersion == "" {
		skillVersion = "1.0.3"
	}

	client := g.Client()
	client.SetHeaderMap(map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Content-Type":  "application/json",
	})

	// 1. 调用 /shelf/sync 验证 Key 有效性
	g.Log().Debugf(ctx, "verifyApiKey: 调用 /shelf/sync 验证 Key")
	resp, err := client.Post(ctx, gateway, g.Map{
		"api_name":      "/shelf/sync",
		"skill_version": skillVersion,
	})
	if err != nil {
		return 0, fmt.Errorf("请求微信读书失败: %w", err)
	}
	defer resp.Close()

	if resp.StatusCode != 200 {
		return 0, fmt.Errorf("API Key 无效或已过期 (HTTP %d)", resp.StatusCode)
	}

	body := resp.ReadAll()
	result, err := gjson.DecodeToJson(body)
	if err != nil {
		return 0, fmt.Errorf("响应格式错误: %w", err)
	}

	if errcode := result.Get("errcode"); errcode != nil && errcode.Int() != 0 {
		return 0, fmt.Errorf("微信读书返回错误: %s", result.Get("errmsg"))
	}

	books := result.Get("books")
	if books == nil || len(books.Array()) == 0 {
		return 0, fmt.Errorf("书架为空，请确认 API Key 有效")
	}

	// 2. 调用 /readdata/detail 获取 registTime（账户级稳定标识）
	g.Log().Debug(ctx, "verifyApiKey: 调用 /readdata/detail 获取账户标识")
	resp2, err := client.Post(ctx, gateway, g.Map{
		"api_name":      "/readdata/detail",
		"mode":          "overall",
		"skill_version": skillVersion,
	})
	if err != nil {
		return 0, fmt.Errorf("获取账户信息失败: %w", err)
	}
	defer resp2.Close()

	body2 := resp2.ReadAll()
	g.Log().Debugf(ctx, "verifyApiKey: /readdata/detail 响应 status=%d", resp2.StatusCode)

	result2, err := gjson.DecodeToJson(body2)
	if err != nil {
		return 0, fmt.Errorf("统计响应格式错误: %w", err)
	}

	registTime = result2.Get("registTime").Int64()
	if registTime == 0 {
		return 0, fmt.Errorf("无法获取账户注册时间")
	}

	g.Log().Debugf(ctx, "verifyApiKey: registTime=%d", registTime)
	return registTime, nil
}

// findOrCreateUser 通过 registTime 查找已有用户，不存在则创建
func (s *sAuth) findOrCreateUser(ctx context.Context, registTime int64) (vid string, err error) {
	record, err := g.DB().Model("users").Ctx(ctx).Where("regist_time", registTime).One()
	if err != nil {
		return "", fmt.Errorf("查询用户失败: %w", err)
	}

	if record != nil {
		// 已有用户，返回其 vid
		vid = record["vid"].String()
		g.Log().Debugf(ctx, "findOrCreateUser: 已有用户 vid=%s", vid)
		return vid, nil
	}

	// 新用户，生成 vid
	hash := sha256.Sum256([]byte(fmt.Sprintf("weread_%d", registTime)))
	vid = hex.EncodeToString(hash[:16])

	_, err = g.DB().Model("users").Ctx(ctx).Insert(g.Map{
		"vid":         vid,
		"regist_time": registTime,
		"nickname":    "",
		"avatar_url":  "",
	})
	if err != nil {
		return "", fmt.Errorf("创建用户失败: %w", err)
	}

	g.Log().Debugf(ctx, "findOrCreateUser: 新用户 vid=%s, registTime=%d", vid, registTime)
	return vid, nil
}

// generateJWT 生成 JWT Token
func (s *sAuth) generateJWT(vid string) (token string, expire int64, err error) {
	secret := s.getJwtSecret()
	hours := g.Cfg().MustGet(nil, "auth.jwtExpire").Int()
	if hours == 0 {
		hours = 168
	}

	exp := time.Now().Add(time.Duration(hours) * time.Hour)
	claims := jwt.MapClaims{
		"vid": vid,
		"exp": exp.Unix(),
		"iat": time.Now().Unix(),
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err = t.SignedString([]byte(secret))
	if err != nil {
		return "", 0, err
	}

	return token, exp.Unix(), nil
}

// storeApiKey 加密并存储 API Key
func (s *sAuth) storeApiKey(ctx context.Context, vid string, apiKey string) error {
	// 遍历已有 Key，解密比对原文（AES-GCM 每次加密结果不同，不能直接比密文）
	records, err := g.DB().Model("api_keys").Ctx(ctx).
		Where("vid", vid).
		Fields("id, api_key").
		All()
	if err != nil {
		return err
	}

	for _, r := range records {
		decrypted, decErr := s.decryptApiKey(r["api_key"].String())
		if decErr != nil {
			continue
		}
		if decrypted == apiKey {
			// 已存在，标记为有效
			g.DB().Model("api_keys").Ctx(ctx).
				Where("id", r["id"]).
				Data(g.Map{"is_active": 1}).
				Update()
			return nil
		}
	}

	// 不存在，加密后插入
	encrypted, err := s.encryptApiKey(apiKey)
	if err != nil {
		return err
	}

	_, err = g.DB().Model("api_keys").Ctx(ctx).Insert(g.Map{
		"vid":     vid,
		"api_key": encrypted,
	})
	return err
}

// encryptApiKey AES-GCM 加密
func (s *sAuth) encryptApiKey(plainText string) (string, error) {
	key := s.getEncryptionKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	cipherText := aesGCM.Seal(nonce, nonce, []byte(plainText), nil)
	return base64.StdEncoding.EncodeToString(cipherText), nil
}

// decryptApiKey AES-GCM 解密
func (s *sAuth) decryptApiKey(cipherText string) (string, error) {
	key := s.getEncryptionKey()
	data, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("cipherText too short")
	}

	nonce, cipherData := data[:nonceSize], data[nonceSize:]
	plainText, err := aesGCM.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", err
	}

	return string(plainText), nil
}

func (s *sAuth) getJwtSecret() string {
	secret := g.Cfg().MustGet(nil, "auth.jwtSecret").String()
	if secret == "" {
		secret = "weread-web-default-secret"
	}
	if len(secret) < 32 {
		secret = secret + "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
	}
	return secret[:32]
}

func (s *sAuth) getEncryptionKey() []byte {
	secret := s.getJwtSecret()
	return []byte(secret[:32])
}

// UpdateProfile 更新用户资料（昵称 + 头像）
func (s *sAuth) UpdateProfile(ctx context.Context, vid string, nickname string, avatarFile *ghttp.UploadFile) (res *api.UpdateProfileRes, err error) {
	avatarUrl := ""

	// 处理头像上传
	if avatarFile != nil {
		// 读取上传文件
		file, err := avatarFile.Open()
		if err != nil {
			return nil, fmt.Errorf("读取上传文件失败: %w", err)
		}
		defer file.Close()

		data := make([]byte, 2*1024*1024) // 最大 2MB
		n, err := file.Read(data)
		if err != nil && err != io.EOF {
			return nil, fmt.Errorf("读取文件内容失败: %w", err)
		}
		data = data[:n]

		if n == 0 {
			return nil, fmt.Errorf("上传文件为空")
		}

		// 保存路径: uploads/avatars/{vid[:2]}/{vid}.ext
		basePath := g.Cfg().MustGet(nil, "storage.local.basePath").String()
		if basePath == "" {
			basePath = "uploads"
		}
		ext := filepath.Ext(avatarFile.Filename)
		if ext == "" {
			ext = ".jpg"
		}
		subDir := vid[:2]
		saveDir := filepath.Join(basePath, "avatars", subDir)
		if err := os.MkdirAll(saveDir, 0755); err != nil {
			return nil, fmt.Errorf("创建目录失败: %w", err)
		}
		savePath := filepath.Join(saveDir, vid+ext)
		if err := os.WriteFile(savePath, data, 0644); err != nil {
			return nil, fmt.Errorf("保存头像失败: %w", err)
		}

		avatarUrl = fmt.Sprintf("/uploads/avatars/%s/%s%s", subDir, vid, ext)
	}

	// 更新数据库
	updateData := g.Map{
		"nickname": nickname,
	}
	if avatarUrl != "" {
		updateData["avatar_url"] = avatarUrl
	}
	_, err = g.DB().Model("users").Ctx(ctx).
		Where("vid", vid).
		Data(updateData).
		Update()
	if err != nil {
		return nil, fmt.Errorf("更新用户资料失败: %w", err)
	}

	// 返回最新数据
	if avatarUrl == "" {
		record, _ := g.DB().Model("users").Ctx(ctx).Where("vid", vid).One()
		if record != nil {
			avatarUrl = record["avatar_url"].String()
		}
	}

	return &api.UpdateProfileRes{
		Nickname:  nickname,
		AvatarUrl: avatarUrl,
	}, nil
}

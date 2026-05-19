package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"time"

	api "github.com/cicbyte/weread-web/api/v1/auth"
	"github.com/cicbyte/weread-web/internal/service"
	"github.com/gogf/gf/v2/encoding/gjson"
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
	"github.com/gogf/gf/v2/util/gconv"
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
func (s *sAuth) Login(ctx context.Context, req *api.LoginReq) (res *api.LoginRes, err error) {
	// 1. 调用 WeRead shelf/sync 验证 API Key 并获取用户信息
	vid, nickname, avatarUrl, err := s.verifyApiKey(ctx, req.ApiKey)
	if err != nil {
		return nil, fmt.Errorf("API Key 验证失败: %w", err)
	}

	// 2. 创建或更新用户
	_, err = g.DB().Model("users").Ctx(ctx).Save(g.Map{
		"vid":        vid,
		"nickname":   nickname,
		"avatar_url": avatarUrl,
	})
	if err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	// 3. 存储 API Key（加密）
	err = s.storeApiKey(ctx, vid, req.ApiKey)
	if err != nil {
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
func (s *sAuth) BindKey(ctx context.Context, vid string, apiKey string) (res *api.BindKeyRes, err error) {
	// 先验证新 Key 是否有效
	newVid, _, _, err := s.verifyApiKey(ctx, apiKey)
	if err != nil {
		return nil, fmt.Errorf("API Key 验证失败: %w", err)
	}

	// 检查 vid 是否一致
	if newVid != vid {
		return nil, fmt.Errorf("该 API Key 绑定到其他用户")
	}

	err = s.storeApiKey(ctx, vid, apiKey)
	if err != nil {
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

	// 解密 API Key
	decrypted, err := s.decryptApiKey(record["api_key"].String())
	if err != nil {
		return "", fmt.Errorf("解密 API Key 失败: %w", err)
	}

	return decrypted, nil
}

// verifyApiKey 调用 WeRead API 验证 API Key 并获取用户信息
func (s *sAuth) verifyApiKey(ctx context.Context, apiKey string) (vid, nickname, avatarUrl string, err error) {
	gateway := g.Cfg().MustGet(ctx, "weread.gateway").String()
	if gateway == "" {
		gateway = "https://i.weread.qq.com/api/agent/gateway"
	}
	skillVersion := g.Cfg().MustGet(ctx, "weread.skillVersion").String()
	if skillVersion == "" {
		skillVersion = "1.0.3"
	}

	// 调用 shelf/sync 验证 Key
	client := g.Client()
	client.SetHeaderMap(map[string]string{
		"Authorization": "Bearer " + apiKey,
		"Content-Type":  "application/json",
	})

	resp, err := client.Post(ctx, gateway, g.Map{
		"api_name":      "/shelf/sync",
		"skill_version": skillVersion,
	})
	if err != nil {
		return "", "", "", fmt.Errorf("请求微信读书失败: %w", err)
	}
	defer resp.Close()

	if resp.StatusCode != 200 {
		return "", "", "", fmt.Errorf("API Key 无效或已过期 (HTTP %d)", resp.StatusCode)
	}

	// 从响应中提取用户信息
	// shelf/sync 的 books 数组里每条都有 userVid（同一个人的 vid）
	body := resp.ReadAll()
	result, err := gjson.DecodeToJson(body)
	if err != nil {
		return "", "", "", fmt.Errorf("响应格式错误: %w", err)
	}

	// 检查 errcode
	errcode := result.Get("errcode")
	if errcode != nil && errcode.Int() != 0 {
		return "", "", "", fmt.Errorf("微信读书返回错误: %s", result.Get("errmsg"))
	}

	// 从 books 中提取 vid
	books := result.Get("books")
	if books != nil {
		for _, book := range books.Array() {
			bookMap := gconv.Map(book)
			if v, ok := bookMap["userVid"]; ok && v != nil {
				vid = gconv.String(v)
				break
			}
		}
	}

	// 如果 shelf/sync 没返回 vid，尝试从 user/notebooks 获取
	if vid == "" {
		resp2, err := client.Post(ctx, gateway, g.Map{
			"api_name":      "/user/notebooks",
			"count":         1,
			"skill_version": skillVersion,
		})
		if err == nil {
			defer resp2.Close()
			body2 := resp2.ReadAll()
			result2, _ := gjson.DecodeToJson(body2)
			if result2 != nil {
				books2 := result2.Get("books")
				if books2 != nil {
					for _, book := range books2.Array() {
						bookMap := gconv.Map(book)
						if v, ok := bookMap["userVid"]; ok && v != nil {
							vid = gconv.String(v)
							break
						}
					}
				}
			}
		}
	}

	if vid == "" {
		// 最后尝试：使用 API Key 的 hash 作为临时 vid
		return "", "", "", fmt.Errorf("无法获取用户 vid，请确认 API Key 有效")
	}

	return vid, "", "", nil
}

// generateJWT 生成 JWT Token
func (s *sAuth) generateJWT(vid string) (token string, expire int64, err error) {
	secret := s.getJwtSecret()
	hours := g.Cfg().MustGet(nil, "auth.jwtExpire").Int()
	if hours == 0 {
		hours = 168 // 7天
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
	encrypted, err := s.encryptApiKey(apiKey)
	if err != nil {
		return err
	}

	// 检查是否已存在相同的 Key
	count, _ := g.DB().Model("api_keys").Ctx(ctx).
		Where("vid", vid).Where("api_key", encrypted).
		Count()
	if count > 0 {
		// 已存在，激活它
		g.DB().Model("api_keys").Ctx(ctx).
			Where("vid", vid).Where("api_key", encrypted).
			Data(g.Map{"is_active": 1}).
			Update()
		return nil
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

// getJwtSecret 获取 JWT 密钥
func (s *sAuth) getJwtSecret() string {
	secret := g.Cfg().MustGet(nil, "auth.jwtSecret").String()
	if secret == "" {
		secret = "weread-plus-default-secret"
	}
	// 确保密钥长度为 32 字节（AES-256）
	if len(secret) < 32 {
		secret = secret + "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
	}
	return secret[:32]
}

// getEncryptionKey 获取加密密钥（复用 JWT Secret）
func (s *sAuth) getEncryptionKey() []byte {
	secret := s.getJwtSecret()
	return []byte(secret[:32])
}

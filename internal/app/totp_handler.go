package app

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/crypto"
	"omniterminal/internal/models"

	"github.com/google/uuid"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

var totpMu sync.RWMutex

// getTotpVaultPath 获取 TOTP 凭据库存储路径
func (a *App) getTotpVaultPath() string {
	return config.GetFilePath("totp_vault.json")
}

// getTotpEncryptionKey 获取加解密密钥 (主密码优先，回退到设备派生密钥)
func (a *App) getTotpEncryptionKey() []byte {
	if len(a.masterKey) == 32 {
		return a.masterKey
	}
	home, _ := os.UserHomeDir()
	h := sha256.Sum256([]byte("omni_totp_device_salt_" + home))
	return h[:]
}

// loadTotpEntriesFromFile 读取并解密 TOTP 列表
func (a *App) loadTotpEntriesFromFile() ([]models.TOTPEntry, error) {
	path := a.getTotpVaultPath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []models.TOTPEntry{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读取 TOTP 凭证库失败: %w", err)
	}

	if len(data) == 0 {
		return []models.TOTPEntry{}, nil
	}

	var entries []models.TOTPEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, fmt.Errorf("解析 TOTP 凭据失败: %w", err)
	}

	return entries, nil
}

// saveTotpEntriesToFile 将 TOTP 列表序列化保存
func (a *App) saveTotpEntriesToFile(entries []models.TOTPEntry) error {
	path := a.getTotpVaultPath()
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化 TOTP 失败: %w", err)
	}
	return os.WriteFile(path, data, 0600)
}

// ListTOTPEntries 列出所有已保存的 TOTP 条目（已隐匿真实 Secret）
func (a *App) ListTOTPEntries() ([]models.TOTPEntry, error) {
	totpMu.RLock()
	defer totpMu.RUnlock()

	entries, err := a.loadTotpEntriesFromFile()
	if err != nil {
		return nil, err
	}

	// 浅拷贝并抹除 SecretEnc，防外泄
	results := make([]models.TOTPEntry, len(entries))
	for i, e := range entries {
		item := e
		item.SecretEnc = "******"
		results[i] = item
	}
	return results, nil
}

// AddTOTPEntry 添加新的 TOTP 密钥
func (a *App) AddTOTPEntry(label, secret, issuer, accountName, algorithm string, digits, period int) (*models.TOTPEntry, error) {
	label = strings.TrimSpace(label)
	secret = strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(secret), " ", ""))
	if label == "" {
		return nil, errors.New("TOTP 标签不能为空")
	}
	if secret == "" {
		return nil, errors.New("TOTP 密钥 (Secret) 不能为空")
	}

	if algorithm == "" {
		algorithm = "SHA1"
	}
	if digits != 6 && digits != 8 {
		digits = 6
	}
	if period <= 0 {
		period = 30
	}

	// 校验 Secret 是否为有效的 Base32 编码
	opts := totp.ValidateOpts{
		Period:    uint(period),
		Digits:    otp.Digits(digits),
		Algorithm: parseOtpAlgorithm(algorithm),
	}
	_, testErr := totp.GenerateCodeCustom(secret, time.Now(), opts)
	if testErr != nil {
		return nil, fmt.Errorf("无效的 TOTP 密钥: %w", testErr)
	}

	encKey := a.getTotpEncryptionKey()
	encSecret, err := crypto.Encrypt(secret, encKey)
	if err != nil {
		return nil, fmt.Errorf("加密密钥失败: %w", err)
	}

	totpMu.Lock()
	defer totpMu.Unlock()

	entries, _ := a.loadTotpEntriesFromFile()
	now := time.Now().Unix()
	entry := models.TOTPEntry{
		ID:          uuid.New().String(),
		Label:       label,
		Issuer:      issuer,
		AccountName: accountName,
		SecretEnc:   encSecret,
		Algorithm:   algorithm,
		Digits:      digits,
		Period:      period,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	entries = append(entries, entry)
	if err := a.saveTotpEntriesToFile(entries); err != nil {
		return nil, err
	}

	publicEntry := entry
	publicEntry.SecretEnc = "******"
	return &publicEntry, nil
}

// UpdateTOTPEntry 更新 TOTP 标签或参数
func (a *App) UpdateTOTPEntry(entry models.TOTPEntry) error {
	totpMu.Lock()
	defer totpMu.Unlock()

	entries, err := a.loadTotpEntriesFromFile()
	if err != nil {
		return err
	}

	found := false
	for i, e := range entries {
		if e.ID == entry.ID {
			entries[i].Label = strings.TrimSpace(entry.Label)
			entries[i].Issuer = strings.TrimSpace(entry.Issuer)
			entries[i].AccountName = strings.TrimSpace(entry.AccountName)
			if entry.Digits == 6 || entry.Digits == 8 {
				entries[i].Digits = entry.Digits
			}
			if entry.Period > 0 {
				entries[i].Period = entry.Period
			}
			if entry.Algorithm != "" {
				entries[i].Algorithm = entry.Algorithm
			}
			entries[i].UpdatedAt = time.Now().Unix()
			found = true
			break
		}
	}

	if !found {
		return errors.New("未找到指定的 TOTP 条目")
	}

	return a.saveTotpEntriesToFile(entries)
}

// DeleteTOTPEntry 删除 TOTP 条目
func (a *App) DeleteTOTPEntry(id string) error {
	totpMu.Lock()
	defer totpMu.Unlock()

	entries, err := a.loadTotpEntriesFromFile()
	if err != nil {
		return err
	}

	var next []models.TOTPEntry
	for _, e := range entries {
		if e.ID != id {
			next = append(next, e)
		}
	}

	return a.saveTotpEntriesToFile(next)
}

// GenerateTOTPCode 计算指定条目的动态验证码及剩余秒数
func (a *App) GenerateTOTPCode(id string) (*models.TOTPCodeResult, error) {
	totpMu.RLock()
	entries, err := a.loadTotpEntriesFromFile()
	totpMu.RUnlock()
	if err != nil {
		return nil, err
	}

	var target *models.TOTPEntry
	for _, e := range entries {
		if e.ID == id {
			target = &e
			break
		}
	}

	if target == nil {
		return nil, errors.New("TOTP 令牌条目不存在")
	}

	encKey := a.getTotpEncryptionKey()
	plainSecret, err := crypto.Decrypt(target.SecretEnc, encKey)
	if err != nil {
		return nil, fmt.Errorf("解密 TOTP 密钥失败: %w", err)
	}

	now := time.Now()
	period := target.Period
	if period <= 0 {
		period = 30
	}
	digits := target.Digits
	if digits != 6 && digits != 8 {
		digits = 6
	}

	opts := totp.ValidateOpts{
		Period:    uint(period),
		Digits:    otp.Digits(digits),
		Algorithm: parseOtpAlgorithm(target.Algorithm),
	}

	code, err := totp.GenerateCodeCustom(plainSecret, now, opts)
	if err != nil {
		return nil, fmt.Errorf("生成动态码失败: %w", err)
	}

	remSecs := int(int64(period) - (now.Unix() % int64(period)))

	return &models.TOTPCodeResult{
		EntryID:       target.ID,
		Label:         target.Label,
		Code:          code,
		RemainingSecs: remSecs,
		Period:        period,
	}, nil
}

// ImportTOTPFromURI 解析 otpauth://totp/... URI 并导入
func (a *App) ImportTOTPFromURI(uriStr string) (*models.TOTPEntry, error) {
	uriStr = strings.TrimSpace(uriStr)
	if !strings.HasPrefix(uriStr, "otpauth://") {
		return nil, errors.New("无效的 OTP URI (必须以 otpauth:// 开头)")
	}

	key, err := otp.NewKeyFromURL(uriStr)
	if err != nil {
		return nil, fmt.Errorf("解析 otpauth 链接失败: %w", err)
	}

	label := key.AccountName()
	issuer := key.Issuer()
	if issuer != "" && label != "" && !strings.Contains(label, issuer) {
		label = fmt.Sprintf("%s (%s)", label, issuer)
	} else if label == "" {
		label = issuer
	}
	if label == "" {
		u, _ := url.Parse(uriStr)
		label = strings.TrimPrefix(u.Path, "/")
	}

	algo := "SHA1"
	switch key.Algorithm() {
	case otp.AlgorithmSHA256:
		algo = "SHA256"
	case otp.AlgorithmSHA512:
		algo = "SHA512"
	}

	digits := int(key.Digits())
	if digits != 6 && digits != 8 {
		digits = 6
	}
	period := int(key.Period())
	if period <= 0 {
		period = 30
	}

	return a.AddTOTPEntry(label, key.Secret(), issuer, key.AccountName(), algo, digits, period)
}

// GetTOTPCodeForSession 获取某会话绑定的 TOTP 验证码
func (a *App) GetTOTPCodeForSession(sessionId string) (*models.TOTPCodeResult, error) {
	sessions, err := a.GetSessions()
	if err != nil {
		return nil, err
	}

	var targetSession *SessionConfig
	for _, s := range sessions {
		if s.ID == sessionId {
			targetSession = &s
			break
		}
	}

	if targetSession == nil || targetSession.TotpEntryID == "" {
		return nil, errors.New("此会话未关联 TOTP 令牌")
	}

	return a.GenerateTOTPCode(targetSession.TotpEntryID)
}

func parseOtpAlgorithm(algo string) otp.Algorithm {
	switch strings.ToUpper(algo) {
	case "SHA256":
		return otp.AlgorithmSHA256
	case "SHA512":
		return otp.AlgorithmSHA512
	default:
		return otp.AlgorithmSHA1
	}
}

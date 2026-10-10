package app

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"omniterminal/internal/models"
	"golang.org/x/crypto/pbkdf2"
)

// OmniSyncPayload 端到端加密同步传输包
type OmniSyncPayload struct {
	Version          int                        `json:"version"`
	Timestamp        int64                      `json:"timestamp"`
	DeviceIdentifier string                     `json:"deviceIdentifier"`
	Sessions         []SessionConfig            `json:"sessions"`
	AuthProfiles     []models.AuthProfile       `json:"authProfiles"`
	QuickCommandSets []models.QuickCommandSet   `json:"quickCommandSets"`
	Macros           []models.AppMacro          `json:"macros"`
	CustomThemes     []models.CustomThemeConfig `json:"customThemes"`
}

// SyncSummary 同步操作结果摘要
type SyncSummary struct {
	SessionsCount     int    `json:"sessionsCount"`
	SessionsAdded     int    `json:"sessionsAdded"`
	SessionsUpdated   int    `json:"sessionsUpdated"`
	SessionsPreserved int    `json:"sessionsPreserved"`
	AuthProfilesCount int    `json:"authProfilesCount"`
	QuickCmdSetsCount int    `json:"quickCmdSetsCount"`
	GistID            string `json:"gistId,omitempty"`
	SyncedAt          string `json:"syncedAt"`
}

// 加密封包：Salt(32B) + Nonce(12B) + Ciphertext + Tag(16B)
func encryptSyncPayload(payload []byte, passphrase string) ([]byte, error) {
	if len(passphrase) == 0 {
		return nil, errors.New("master password cannot be empty for cloud sync encryption")
	}

	salt := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, fmt.Errorf("failed to generate random salt: %w", err)
	}

	key := pbkdf2.Key([]byte(passphrase), salt, 100000, 32, sha256.New)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create aes cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, payload, nil)

	// Header: "OMNISYNC1" + Salt + Nonce + Ciphertext
	var buf bytes.Buffer
	buf.WriteString("OMNISYNC1")
	buf.Write(salt)
	buf.Write(nonce)
	buf.Write(ciphertext)

	return buf.Bytes(), nil
}

// 解密封包
func decryptSyncPayload(encryptedData []byte, passphrase string) ([]byte, error) {
	if len(passphrase) == 0 {
		return nil, errors.New("master password cannot be empty")
	}

	magic := "OMNISYNC1"
	if len(encryptedData) < len(magic)+32+12+16 {
		return nil, errors.New("invalid or corrupted sync payload data")
	}

	if string(encryptedData[:len(magic)]) != magic {
		return nil, errors.New("unrecognized sync file format header")
	}

	offset := len(magic)
	salt := encryptedData[offset : offset+32]
	offset += 32
	nonce := encryptedData[offset : offset+12]
	offset += 12
	ciphertext := encryptedData[offset:]

	key := pbkdf2.Key([]byte(passphrase), salt, 100000, 32, sha256.New)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create aes cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, errors.New("decryption failed: incorrect master password or data corrupted")
	}

	return plaintext, nil
}

// Gist API 同步驱动辅助函数
func pushToGist(cfg *models.CloudSyncConfig, encryptedData []byte) error {
	token := strings.TrimSpace(cfg.GistToken)
	if token == "" {
		return errors.New("Gist Token (Personal Access Token) 不能为空")
	}

	b64Payload := base64.StdEncoding.EncodeToString(encryptedData)
	isGitHub := cfg.Provider == "github_gist" || cfg.Provider == "gist"
	client := &http.Client{Timeout: 30 * time.Second}

	if isGitHub {
		apiURL := "https://api.github.com/gists"
		method := http.MethodPost
		if strings.TrimSpace(cfg.GistID) != "" {
			apiURL = "https://api.github.com/gists/" + strings.TrimSpace(cfg.GistID)
			method = http.MethodPatch
		}

		reqBody := map[string]interface{}{
			"description": "OmniTerminal E2EE Configuration Backup (Zero-Knowledge AES-256-GCM)",
			"public":      false,
			"files": map[string]interface{}{
				"omniterminal_sync.enc": map[string]string{
					"content": b64Payload,
				},
			},
		}
		bodyBytes, err := json.Marshal(reqBody)
		if err != nil {
			return err
		}

		req, err := http.NewRequest(method, apiURL, bytes.NewReader(bodyBytes))
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("GitHub Gist 请求失败: %w", err)
		}
		defer resp.Body.Close()

		respData, _ := io.ReadAll(resp.Body)
		if resp.StatusCode >= 300 {
			return fmt.Errorf("GitHub Gist 错误 (HTTP %d): %s", resp.StatusCode, string(respData))
		}

		if method == http.MethodPost {
			var respObj struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal(respData, &respObj); err == nil && respObj.ID != "" {
				cfg.GistID = respObj.ID
			}
		}
		return nil
	} else {
		// Gitee Gist
		apiURL := "https://gitee.com/api/v5/gists"
		method := http.MethodPost
		if strings.TrimSpace(cfg.GistID) != "" {
			apiURL = "https://gitee.com/api/v5/gists/" + strings.TrimSpace(cfg.GistID)
			method = http.MethodPatch
		}

		reqBody := map[string]interface{}{
			"access_token": token,
			"description":  "OmniTerminal E2EE Configuration Backup",
			"public":       false,
			"files": map[string]interface{}{
				"omniterminal_sync.enc": map[string]string{
					"content": b64Payload,
				},
			},
		}
		bodyBytes, err := json.Marshal(reqBody)
		if err != nil {
			return err
		}

		req, err := http.NewRequest(method, apiURL, bytes.NewReader(bodyBytes))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("Gitee Gist 请求失败: %w", err)
		}
		defer resp.Body.Close()

		respData, _ := io.ReadAll(resp.Body)
		if resp.StatusCode >= 300 {
			return fmt.Errorf("Gitee Gist 错误 (HTTP %d): %s", resp.StatusCode, string(respData))
		}

		if method == http.MethodPost {
			var respObj struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal(respData, &respObj); err == nil && respObj.ID != "" {
				cfg.GistID = respObj.ID
			}
		}
		return nil
	}
}

func pullFromGist(cfg models.CloudSyncConfig) ([]byte, error) {
	token := strings.TrimSpace(cfg.GistToken)
	gistID := strings.TrimSpace(cfg.GistID)
	if gistID == "" {
		return nil, errors.New("从 Gist 拉取备份时 Gist ID 不能为空")
	}

	isGitHub := cfg.Provider == "github_gist" || cfg.Provider == "gist"
	client := &http.Client{Timeout: 30 * time.Second}

	var req *http.Request
	var err error

	if isGitHub {
		apiURL := "https://api.github.com/gists/" + gistID
		req, err = http.NewRequest(http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, err
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		req.Header.Set("Accept", "application/vnd.github+json")
	} else {
		// Gitee
		apiURL := fmt.Sprintf("https://gitee.com/api/v5/gists/%s?access_token=%s", gistID, token)
		req, err = http.NewRequest(http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, err
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("下载 Gist 失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respData, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("获取 Gist 返回 HTTP %d: %s", resp.StatusCode, string(respData))
	}

	var gistResp struct {
		Files map[string]struct {
			Content string `json:"content"`
		} `json:"files"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&gistResp); err != nil {
		return nil, fmt.Errorf("解析 Gist 响应失败: %w", err)
	}

	fileItem, exists := gistResp.Files["omniterminal_sync.enc"]
	if !exists || strings.TrimSpace(fileItem.Content) == "" {
		return nil, errors.New("云端 Gist 未包含有效备份文件 'omniterminal_sync.enc'")
	}

	encryptedData, err := base64.StdEncoding.DecodeString(strings.TrimSpace(fileItem.Content))
	if err != nil {
		return nil, fmt.Errorf("base64 解码 Gist 密文失败: %w", err)
	}

	return encryptedData, nil
}

func testGist(cfg models.CloudSyncConfig) (bool, error) {
	token := strings.TrimSpace(cfg.GistToken)
	if token == "" {
		return false, errors.New("Gist Token 不能为空")
	}
	isGitHub := cfg.Provider == "github_gist" || cfg.Provider == "gist"
	client := &http.Client{Timeout: 10 * time.Second}

	var req *http.Request
	var err error
	if isGitHub {
		if strings.TrimSpace(cfg.GistID) != "" {
			req, err = http.NewRequest(http.MethodGet, "https://api.github.com/gists/"+strings.TrimSpace(cfg.GistID), nil)
		} else {
			req, err = http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
		}
		if err != nil {
			return false, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/vnd.github+json")
	} else {
		if strings.TrimSpace(cfg.GistID) != "" {
			req, err = http.NewRequest(http.MethodGet, fmt.Sprintf("https://gitee.com/api/v5/gists/%s?access_token=%s", strings.TrimSpace(cfg.GistID), token), nil)
		} else {
			req, err = http.NewRequest(http.MethodGet, fmt.Sprintf("https://gitee.com/api/v5/user?access_token=%s", token), nil)
		}
		if err != nil {
			return false, err
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("Gist 连通性测试失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return false, errors.New("Gist 认证失败: Token 无效或未授予 Gist 读写权限")
	}

	return resp.StatusCode < 400, nil
}

// CloudSyncTest 测试 WebDAV / Gist / 云存储连通性
func (a *App) CloudSyncTest(cfg models.CloudSyncConfig) (bool, error) {
	if cfg.Provider == "github_gist" || cfg.Provider == "gitee_gist" || cfg.Provider == "gist" {
		return testGist(cfg)
	}

	serverURL := strings.TrimSpace(cfg.ServerURL)
	if serverURL == "" {
		return false, errors.New("server URL cannot be empty")
	}

	req, err := http.NewRequest(http.MethodHead, serverURL, nil)
	if err != nil {
		return false, err
	}

	if cfg.Username != "" || cfg.Password != "" {
		req.SetBasicAuth(cfg.Username, cfg.Password)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		// 某些 WebDAV 服务器不支持 HEAD，尝试 GET / PROPFIND
		req2, err2 := http.NewRequest("PROPFIND", serverURL, nil)
		if err2 == nil {
			if cfg.Username != "" || cfg.Password != "" {
				req2.SetBasicAuth(cfg.Username, cfg.Password)
			}
			resp2, err2 := client.Do(req2)
			if err2 == nil {
				defer resp2.Body.Close()
				return resp2.StatusCode < 400 || resp2.StatusCode == 401 || resp2.StatusCode == 207, nil
			}
		}
		return false, fmt.Errorf("connection test failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return false, errors.New("authentication failed: invalid username or password")
	}

	return resp.StatusCode < 400 || resp.StatusCode == 207, nil
}

// CloudSyncPush 将全量会话与配置使用主密码加密后推送至云端
func (a *App) CloudSyncPush(cfg models.CloudSyncConfig, masterPassword string) error {
	sessions, err := a.GetSessions()
	if err != nil {
		return fmt.Errorf("failed to retrieve sessions: %w", err)
	}

	settings, err := a.GetSettings()
	if err != nil {
		return fmt.Errorf("failed to retrieve settings: %w", err)
	}

	authProfiles, _ := a.GetAuthProfiles()

	hostname, _ := os.Hostname()
	payload := OmniSyncPayload{
		Version:          1,
		Timestamp:        time.Now().Unix(),
		DeviceIdentifier: hostname,
		Sessions:         sessions,
		AuthProfiles:     authProfiles,
		QuickCommandSets: settings.QuickCommandSets,
		Macros:           settings.Macros,
		CustomThemes:     settings.CustomThemes,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to serialize sync payload: %w", err)
	}

	encryptedData, err := encryptSyncPayload(payloadBytes, masterPassword)
	if err != nil {
		return fmt.Errorf("failed to encrypt sync payload: %w", err)
	}

	if cfg.Provider == "github_gist" || cfg.Provider == "gitee_gist" || cfg.Provider == "gist" {
		if err := pushToGist(&cfg, encryptedData); err != nil {
			return err
		}
	} else {
		// WebDAV / S3 端点上传
		targetURL := strings.TrimRight(cfg.ServerURL, "/")
		remotePath := strings.TrimLeft(cfg.RemotePath, "/")
		if remotePath == "" {
			remotePath = "OmniTerminal_Backup.omnisync"
		}
		fullURL := targetURL + "/" + remotePath

		req, err := http.NewRequest(http.MethodPut, fullURL, bytes.NewReader(encryptedData))
		if err != nil {
			return fmt.Errorf("failed to create upload request: %w", err)
		}

		req.Header.Set("Content-Type", "application/octet-stream")
		if cfg.Username != "" || cfg.Password != "" {
			req.SetBasicAuth(cfg.Username, cfg.Password)
		}

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("cloud sync upload failed: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 300 && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("cloud sync upload returned HTTP %d: %s", resp.StatusCode, string(body))
		}
	}

	// 更新最后同步时间与 GistID 配置
	settings.CloudSyncConfig = cfg
	settings.CloudSyncConfig.LastSyncTime = time.Now().Format("2006-01-02 15:04:05")
	_ = a.SaveSettings(settings)

	return nil
}

// CloudSyncPull 从云端下载并解密合并到本地配置 (支持增量智能合并)
func (a *App) CloudSyncPull(cfg models.CloudSyncConfig, masterPassword string) (*SyncSummary, error) {
	var encryptedData []byte
	var err error

	if cfg.Provider == "github_gist" || cfg.Provider == "gitee_gist" || cfg.Provider == "gist" {
		encryptedData, err = pullFromGist(cfg)
		if err != nil {
			return nil, err
		}
	} else {
		targetURL := strings.TrimRight(cfg.ServerURL, "/")
		remotePath := strings.TrimLeft(cfg.RemotePath, "/")
		if remotePath == "" {
			remotePath = "OmniTerminal_Backup.omnisync"
		}
		fullURL := targetURL + "/" + remotePath

		req, err := http.NewRequest(http.MethodGet, fullURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create download request: %w", err)
		}

		if cfg.Username != "" || cfg.Password != "" {
			req.SetBasicAuth(cfg.Username, cfg.Password)
		}

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("cloud sync download failed: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("cloud sync download returned HTTP %d", resp.StatusCode)
		}

		encryptedData, err = io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read remote payload: %w", err)
		}
	}

	decryptedBytes, err := decryptSyncPayload(encryptedData, masterPassword)
	if err != nil {
		return nil, err
	}

	var payload OmniSyncPayload
	if err := json.Unmarshal(decryptedBytes, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse decrypted sync payload: %w", err)
	}

	// 增量智能合并本地会话：保留本地独有会话，更新已有或新增远程会话
	localSessions, _ := a.GetSessions()
	localMap := make(map[string]SessionConfig)
	for _, ls := range localSessions {
		localMap[ls.ID] = ls
	}

	addedCount := 0
	updatedCount := 0
	for _, remoteSess := range payload.Sessions {
		if _, exists := localMap[remoteSess.ID]; exists {
			updatedCount++
		} else {
			addedCount++
		}
		_ = a.SaveSession(remoteSess)
	}
	preservedCount := len(localSessions) - updatedCount
	if preservedCount < 0 {
		preservedCount = 0
	}

	// 合并 AuthProfiles
	if len(payload.AuthProfiles) > 0 {
		for _, rp := range payload.AuthProfiles {
			_ = a.SaveAuthProfile(rp)
		}
	}

	settings, err := a.GetSettings()
	if err == nil {
		// 增量合并快捷命令集
		if len(payload.QuickCommandSets) > 0 {
			existingSets := make(map[string]bool)
			for _, s := range settings.QuickCommandSets {
				key := s.ID
				if key == "" {
					key = s.SetName
				}
				existingSets[key] = true
			}
			for _, rs := range payload.QuickCommandSets {
				key := rs.ID
				if key == "" {
					key = rs.SetName
				}
				if !existingSets[key] {
					settings.QuickCommandSets = append(settings.QuickCommandSets, rs)
				}
			}
		}
		// 增量合并宏
		if len(payload.Macros) > 0 {
			existingMacros := make(map[string]bool)
			for _, m := range settings.Macros {
				existingMacros[m.ID] = true
			}
			for _, rm := range payload.Macros {
				if !existingMacros[rm.ID] {
					settings.Macros = append(settings.Macros, rm)
				}
			}
		}
		// 增量合并自定义主题
		if len(payload.CustomThemes) > 0 {
			existingThemes := make(map[string]bool)
			for _, t := range settings.CustomThemes {
				existingThemes[t.Name] = true
			}
			for _, rt := range payload.CustomThemes {
				if !existingThemes[rt.Name] {
					settings.CustomThemes = append(settings.CustomThemes, rt)
				}
			}
		}

		settings.CloudSyncConfig = cfg
		settings.CloudSyncConfig.LastSyncTime = time.Now().Format("2006-01-02 15:04:05")
		_ = a.SaveSettings(settings)
	}

	return &SyncSummary{
		SessionsCount:     len(payload.Sessions),
		SessionsAdded:     addedCount,
		SessionsUpdated:   updatedCount,
		SessionsPreserved: preservedCount,
		AuthProfilesCount: len(payload.AuthProfiles),
		QuickCmdSetsCount: len(payload.QuickCommandSets),
		GistID:            cfg.GistID,
		SyncedAt:          time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// ExportSanitizedTeamPackage 导出脱敏团队配置包 (剥离密码、私钥与敏感 Token)
func (a *App) ExportSanitizedTeamPackage(targetFilePath string) (string, error) {
	sessions, err := a.GetSessions()
	if err != nil {
		return "", fmt.Errorf("failed to read sessions: %w", err)
	}

	settings, _ := a.GetSettings()

	sanitizedSessions := make([]SessionConfig, 0, len(sessions))
	for _, s := range sessions {
		clean := s
		// 严密脱敏敏感凭据
		clean.Password = ""
		clean.PrivateKey = ""
		clean.Certificate = ""
		clean.ProxyPassword = ""
		sanitizedSessions = append(sanitizedSessions, clean)
	}

	teamPackage := map[string]interface{}{
		"omniTeamPackageVersion": 1,
		"exportedAt":             time.Now().Format(time.RFC3339),
		"sessions":               sanitizedSessions,
		"quickCommandSets":       settings.QuickCommandSets,
		"macros":                 settings.Macros,
	}

	data, err := json.MarshalIndent(teamPackage, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to format team package JSON: %w", err)
	}

	if targetFilePath != "" {
		if err := os.WriteFile(targetFilePath, data, 0644); err != nil {
			return "", fmt.Errorf("failed to write team package to file: %w", err)
		}
	}

	return string(data), nil
}

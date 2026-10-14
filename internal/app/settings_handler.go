package app

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/crypto"
	"omniterminal/internal/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
)

func (a *App) getSettingsPath() string {
	return config.GetFilePath("settings.json")
}

func (a *App) GetSettings() (models.AppSettings, error) {
	path := a.getSettingsPath()
	defaultSettings := models.AppSettings{
		ThemeName:                "VS Code Dark Modern",
		Language:                 "",
		FontFamily:               "Menlo, Monaco, Consolas, monospace",
		FontSize:                 13,
		HasMasterPassword:        false,
		MasterPasswordSalt:       "",
		ValidationBlock:          "",
		QuickCommandSets:         []models.QuickCommandSet{},
		ActiveCommandSetID:       "",
		ScrollbackLines:          10000,
		CopyOnSelect:             false,
		CursorStyle:              "block",
		CursorBlink:              true,
		EnableBell:               false,
		TerminalOpacity:          1.0,
		WindowOpacity:            1.0,
		EnableBlur:               false,
		LineHeight:               1.2,
		TerminalPadding:          8,
		BackgroundBlur:           0,
		BackgroundFit:            "cover",
		EnableLigatures:          true,
		CustomThemes:             []models.CustomThemeConfig{},
		NonAsciiFontFamily:       `"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif`,
		EnableSafePaste:          true,
		EnableDangerousGuard:     true,
		UseAltAsMeta:             true,
		WordSeparators:           ` ~!@#$%^&*()=+[{]}\|;:'",<>?`,
		OpenLinksOnClick:         false,
		AutoRestoreWorkspace:     true,
		FileConflictStrategy:     "ask",
		MinimizeToTrayOnClose:    false,
		EnableQuakeMode:          false,
		QuakeHotkey:              "Ctrl+`",
		QuakeHeightPercent:       50,
		RememberWindowPosition:   true,
		WindowWidth:              1280,
		WindowHeight:             800,
		CloseAction:              "tray",
		CloseDoNotAskAgain:       false,
		ConfirmCloseConnectedTab: true,
		ConfirmCloseAnyTab:       false,
		PreventSleep:             false,
		UseSystemProxy:           false,
		AutoStartAtBoot:          false,
		DisableSystemTray:        false,
		DangerousRules: []models.DangerousCommandRule{
			{Pattern: `\brm\s+-[rRfF]*\s+/(?:\s|$|\*)`, Desc: "删除根目录或关键系统路径 (rm -rf /)", Enabled: true},
			{Pattern: `\bmkfs(\.\w+)?\b`, Desc: "格式化磁盘分区 (mkfs)", Enabled: true},
			{Pattern: `\bdd\s+if=`, Desc: "底层磁盘写入复制 (dd if=)", Enabled: true},
			{Pattern: `>\s*/dev/sd[a-z]`, Desc: "覆盖写入块设备 (> /dev/sdX)", Enabled: true},
			{Pattern: `\b(reboot|shutdown|poweroff|init\s+0|halt)\b`, Desc: "重启或关闭系统 (reboot/shutdown)", Enabled: true},
			{Pattern: `\biptables\s+-F\b`, Desc: "清空防火墙所有规则 (iptables -F)", Enabled: true},
			{Pattern: `\bchmod\s+-[rRfF]*\s+777\s+/`, Desc: "递归赋予根目录 777 权限", Enabled: true},
			{Pattern: `:\(\)\{\s*:\|:&\s*\};:`, Desc: "Bash Fork 炸弹攻击", Enabled: true},
		},
		Osc52Mode:               "write",
		Osc52MaxBytes:           102400,
		Osc52ShowToast:          true,
		EnableSshConnectionPool: true,
		SshPoolIdleTimeoutSec:   300,
		SshPoolMaxSize:          50,
		CustomKeybindings:       map[string]string{},
		EnableStructuredOutput:  false,
		RendererType:            "auto",
		FontSmoothing:           "antialiased",
		EnableTerminalImages:    true,
		ImageStorageLimitMB:     128,
		EnableMiniTelemetry:      true,
		MiniTelemetryIntervalSec: 3,
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return defaultSettings, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return defaultSettings, err
	}

	settings := defaultSettings
	err = json.Unmarshal(data, &settings)
	if err != nil {
		return defaultSettings, nil
	}

	// 历史兼容：若老的 settings.json 没有 enableMiniTelemetry 字段，确保默认开启
	var rawSettings map[string]interface{}
	if err := json.Unmarshal(data, &rawSettings); err == nil {
		if _, exists := rawSettings["enableMiniTelemetry"]; !exists {
			settings.EnableMiniTelemetry = true
		}
		if _, exists := rawSettings["miniTelemetryIntervalSec"]; !exists {
			settings.MiniTelemetryIntervalSec = 3
		}
	}

	// 历史兼容：当读出零值时，自动注入合理兜底
	if settings.ScrollbackLines <= 0 {
		settings.ScrollbackLines = 10000
	}
	if settings.CursorStyle == "" {
		settings.CursorStyle = "block"
	}
	if settings.TerminalOpacity <= 0 {
		settings.TerminalOpacity = 1.0
	}
	if settings.WindowOpacity <= 0 {
		settings.WindowOpacity = 1.0
	}
	if settings.LineHeight <= 0 {
		settings.LineHeight = 1.2
	}
	if settings.TerminalPadding <= 0 {
		settings.TerminalPadding = 8
	}
	if settings.BackgroundFit == "" {
		settings.BackgroundFit = "cover"
	}
	if settings.QuakeHeightPercent <= 0 {
		settings.QuakeHeightPercent = 50
	}
	if settings.QuakeHotkey == "" {
		settings.QuakeHotkey = "Ctrl+`"
	}
	if settings.WordSeparators == "" {
		settings.WordSeparators = ` ~!@#$%^&*()=+[{]}\|;:'",<>?`
	}
	if len(settings.DangerousRules) == 0 {
		settings.DangerousRules = defaultSettings.DangerousRules
	}
	if settings.Osc52Mode == "" {
		settings.Osc52Mode = "write"
	}
	if settings.Osc52MaxBytes <= 0 {
		settings.Osc52MaxBytes = 102400
	}
	if settings.SshPoolIdleTimeoutSec <= 0 {
		settings.SshPoolIdleTimeoutSec = 300
	}
	if settings.SshPoolMaxSize <= 0 {
		settings.SshPoolMaxSize = 50
	}
	if settings.CustomKeybindings == nil {
		settings.CustomKeybindings = make(map[string]string)
	}
	if settings.CommandBlockMode == "" {
		settings.CommandBlockMode = "off"
	}
	if settings.QuakeAnimationDurationMs <= 0 {
		settings.QuakeAnimationDurationMs = 250
	}
	if settings.MonacoFontSize <= 0 {
		settings.MonacoFontSize = 13
	}
	if settings.MonacoTabSize <= 0 {
		settings.MonacoTabSize = 2
	}
	if settings.RendererType == "" {
		settings.RendererType = "auto"
	}
	if settings.FontSmoothing == "" {
		settings.FontSmoothing = "antialiased"
	}
	if settings.ThemeName == "" {
		settings.ThemeName = "VS Code Dark Modern"
	}
	if settings.ImageStorageLimitMB <= 0 {
		settings.ImageStorageLimitMB = 128
	}
	if settings.MiniTelemetryIntervalSec <= 0 {
		settings.MiniTelemetryIntervalSec = 3
	}

	return settings, nil
}

func (a *App) SaveSettings(settings models.AppSettings) error {
	// 动态同步阻止系统休眠 (Stage 2)
	if a.sleepInhibitor != nil {
		if settings.PreventSleep {
			_ = a.sleepInhibitor.Enable()
		} else {
			_ = a.sleepInhibitor.Disable()
		}
	}

	// 动态同步开机自启 (Stage 2)
	if a.autoStartManager != nil {
		_ = a.autoStartManager.SetEnabled(settings.AutoStartAtBoot)
	}

	// 动态同步托盘图标显示/隐藏 (Stage 2)
	if a.trayManager != nil {
		if settings.DisableSystemTray {
			a.trayManager.HideTray()
		} else {
			a.trayManager.ShowTray("")
		}
	}

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.getSettingsPath(), data, 0644)
}

func (a *App) IsAppLocked() bool {
	settings, err := a.GetSettings()
	if err != nil {
		return false
	}
	return settings.HasMasterPassword && !a.isUnlocked
}

func (a *App) UnlockSessions(password string) (bool, error) {
	settings, err := a.GetSettings()
	if err != nil {
		return false, err
	}
	if !settings.HasMasterPassword {
		a.isUnlocked = true
		return true, nil
	}

	salt, err := hex.DecodeString(settings.MasterPasswordSalt)
	if err != nil {
		return false, fmt.Errorf("Salt 解析失败")
	}

	key := crypto.DeriveKey(password, salt)
	plain, err := crypto.Decrypt(settings.ValidationBlock, key)
	if err != nil || plain != "omniterminal-valid" {
		return false, fmt.Errorf("密码校验错误，请重新输入")
	}

	a.masterKey = key
	a.isUnlocked = true
	return true, nil
}

func (a *App) EnableMasterPassword(password string) error {
	settings, err := a.GetSettings()
	if err != nil {
		return err
	}
	if settings.HasMasterPassword {
		return fmt.Errorf("已经启用了主密码保护")
	}

	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return err
	}

	key := crypto.DeriveKey(password, salt)
	validBlock, err := crypto.Encrypt("omniterminal-valid", key)
	if err != nil {
		return err
	}

	sessions, err := a.GetSessions()
	if err != nil {
		return err
	}

	settings.HasMasterPassword = true
	settings.MasterPasswordSalt = hex.EncodeToString(salt)
	settings.ValidationBlock = validBlock

	err = a.SaveSettings(settings)
	if err != nil {
		return err
	}

	a.masterKey = key
	a.isUnlocked = true

	for _, s := range sessions {
		err = a.SaveSession(s)
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *App) DisableMasterPassword(password string) error {
	settings, err := a.GetSettings()
	if err != nil {
		return err
	}
	if !settings.HasMasterPassword {
		return nil
	}

	salt, err := hex.DecodeString(settings.MasterPasswordSalt)
	if err != nil {
		return err
	}
	key := crypto.DeriveKey(password, salt)
	plain, err := crypto.Decrypt(settings.ValidationBlock, key)
	if err != nil || plain != "omniterminal-valid" {
		return fmt.Errorf("密码校验错误，无法解密")
	}

	a.masterKey = key
	a.isUnlocked = true
	sessions, err := a.GetSessions()
	if err != nil {
		return err
	}

	settings.HasMasterPassword = false
	settings.MasterPasswordSalt = ""
	settings.ValidationBlock = ""

	err = a.SaveSettings(settings)
	if err != nil {
		return err
	}

	a.masterKey = nil
	a.isUnlocked = true

	for _, s := range sessions {
		err = a.SaveSession(s)
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *App) ChangeMasterPassword(oldPassword string, newPassword string) error {
	settings, err := a.GetSettings()
	if err != nil {
		return err
	}
	if !settings.HasMasterPassword {
		return fmt.Errorf("当前未启用主密码保护，请直接启用")
	}

	// 1. 验证旧密码是否能正确解密 validation block
	oldSalt, err := hex.DecodeString(settings.MasterPasswordSalt)
	if err != nil {
		return fmt.Errorf("Salt 解析失败: %v", err)
	}

	oldKey := crypto.DeriveKey(oldPassword, oldSalt)
	plain, err := crypto.Decrypt(settings.ValidationBlock, oldKey)
	if err != nil || plain != "omniterminal-valid" {
		return fmt.Errorf("原密码校验失败，请检查输入")
	}

	// 2. 临时让 masterKey 保持为 oldKey，以保证 GetSessions 能够成功解密历史会话
	a.masterKey = oldKey
	a.isUnlocked = true

	sessions, err := a.GetSessions()
	if err != nil {
		return fmt.Errorf("读取旧会话数据失败: %v", err)
	}

	// 3. 生成新密码的随机 Salt 并派生新 Key
	newSalt := make([]byte, 16)
	if _, err := rand.Read(newSalt); err != nil {
		return err
	}

	newKey := crypto.DeriveKey(newPassword, newSalt)
	newValidBlock, err := crypto.Encrypt("omniterminal-valid", newKey)
	if err != nil {
		return err
	}

	// 4. 更新全局配置结构
	settings.MasterPasswordSalt = hex.EncodeToString(newSalt)
	settings.ValidationBlock = newValidBlock

	err = a.SaveSettings(settings)
	if err != nil {
		return fmt.Errorf("保存新全局配置失败: %v", err)
	}

	// 5. 替换当前的 masterKey 密钥为新 Key
	a.masterKey = newKey

	// 6. 用最新的新密钥将所有 Sessions 重新加密存盘
	for _, s := range sessions {
		err = a.SaveSession(s)
		if err != nil {
			return fmt.Errorf("重加密保存会话配置失败: %v", err)
		}
	}

	return nil
}

func (a *App) ExportBackup(backupPassword string) (string, error) {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return "", fmt.Errorf("app_locked")
	}

	sessions, err := a.GetSessions()
	if err != nil {
		return "", err
	}

	// 1. 弹出保存文件框
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "选择导出备份文件路径",
		DefaultFilename: "omniterminal_backup.omnisb",
		Filters: []runtime.FileFilter{
			{DisplayName: "OmniTerminal 备份文件 (*.omnisb; *.xxsb)", Pattern: "*.omnisb;*.xxsb"},
		},
	})
	if err != nil {
		return "", err
	}
	if filePath == "" {
		return "", nil // 用户取消了
	}

	// 2. 将数据合并并用明文形式打包
	backup := BackupData{
		Sessions: sessions,
		Settings: settings,
	}

	rawJSON, err := json.Marshal(backup)
	if err != nil {
		return "", fmt.Errorf("合并数据失败: %v", err)
	}

	// 3. 用 backupPassword 加密数据
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	// 派生 AES 密钥
	key := crypto.DeriveKey(backupPassword, salt)
	encryptedHex, err := crypto.Encrypt(string(rawJSON), key)
	if err != nil {
		return "", fmt.Errorf("加密失败: %v", err)
	}

	// 将 salt 前缀与加密 Hex 合并打包
	finalPayload := hex.EncodeToString(salt) + ":" + encryptedHex

	// 4. 写盘
	err = os.WriteFile(filePath, []byte(finalPayload), 0600)
	if err != nil {
		return "", err
	}

	return filePath, nil
}

func (a *App) ImportBackup(backupPassword string) error {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return fmt.Errorf("app_locked")
	}

	// 1. 弹出选择文件框
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择导入备份文件",
		Filters: []runtime.FileFilter{
			{DisplayName: "OmniTerminal 备份文件 (*.omnisb; *.xxsb)", Pattern: "*.omnisb;*.xxsb"},
		},
	})
	if err != nil {
		return err
	}
	if filePath == "" {
		return nil // 用户取消了
	}

	// 2. 读文件内容
	payload, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("读取文件失败: %v", err)
	}

	// 兼容处理可能产生的空行
	payloadStr := strings.TrimSpace(string(payload))
	parts := strings.Split(payloadStr, ":")
	if len(parts) != 2 {
		return fmt.Errorf("备份文件损坏或格式不正确")
	}

	salt, err := hex.DecodeString(parts[0])
	if err != nil {
		return fmt.Errorf("Salt 解析失败: %v", err)
	}

	// 3. 用 backupPassword 派生 Key 进行解密
	key := crypto.DeriveKey(backupPassword, salt)
	plainText, err := crypto.Decrypt(parts[1], key)
	if err != nil {
		return fmt.Errorf("解密失败，请检查备份密码是否正确。")
	}

	// 4. 解析还原数据
	var backup BackupData
	err = json.Unmarshal([]byte(plainText), &backup)
	if err != nil {
		return fmt.Errorf("解析 JSON 失败: %v", err)
	}

	// 5. 合并 Sessions 与 Settings
	localSessions, err := a.GetSessions()
	if err != nil {
		localSessions = []SessionConfig{}
	}

	sessionMap := make(map[string]SessionConfig)
	for _, s := range localSessions {
		sessionMap[s.ID] = s
	}

	for _, s := range backup.Sessions {
		sessionMap[s.ID] = s
	}

	var finalSessions []SessionConfig
	for _, s := range sessionMap {
		finalSessions = append(finalSessions, s)
	}

	for _, s := range finalSessions {
		err = a.SaveSession(s)
		if err != nil {
			return fmt.Errorf("还原会话 %s 失败: %v", s.Name, err)
		}
	}

	currentSettings, err := a.GetSettings()
	if err != nil {
		currentSettings = settings
	}

	cmdSetMap := make(map[string]models.QuickCommandSet)
	for _, cs := range currentSettings.QuickCommandSets {
		cmdSetMap[cs.ID] = cs
	}
	for _, cs := range backup.Settings.QuickCommandSets {
		cmdSetMap[cs.ID] = cs
	}
	var finalCmdSets []models.QuickCommandSet
	for _, cs := range cmdSetMap {
		finalCmdSets = append(finalCmdSets, cs)
	}
	currentSettings.QuickCommandSets = finalCmdSets

	macroMap := make(map[string]models.AppMacro)
	for _, m := range currentSettings.Macros {
		macroMap[m.ID] = m
	}
	for _, m := range backup.Settings.Macros {
		macroMap[m.ID] = m
	}
	var finalMacros []models.AppMacro
	for _, m := range macroMap {
		finalMacros = append(finalMacros, m)
	}
	currentSettings.Macros = finalMacros

	err = a.SaveSettings(currentSettings)
	if err != nil {
		return fmt.Errorf("还原设置失败: %v", err)
	}

	return nil
}

func (a *App) GenerateKeyPair(keyType string) (map[string]string, error) {
	var privPEM, pubKeyStr string

	switch strings.ToLower(strings.TrimSpace(keyType)) {
	case "ed25519":
		pubKey, privKey, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return nil, err
		}

		privBytes, err := x509.MarshalPKCS8PrivateKey(privKey)
		if err != nil {
			return nil, err
		}

		privPEMBlock := &pem.Block{
			Type:  "PRIVATE KEY",
			Bytes: privBytes,
		}
		privPEM = string(pem.EncodeToMemory(privPEMBlock))

		sshPubKey, err := ssh.NewPublicKey(pubKey)
		if err != nil {
			return nil, err
		}
		pubKeyStr = string(ssh.MarshalAuthorizedKey(sshPubKey))

	case "rsa", "rsa-4096":
		privKey, err := rsa.GenerateKey(rand.Reader, 4096)
		if err != nil {
			return nil, err
		}

		err = privKey.Validate()
		if err != nil {
			return nil, err
		}

		privBytes := x509.MarshalPKCS1PrivateKey(privKey)
		privPEMBlock := &pem.Block{
			Type:  "RSA PRIVATE KEY",
			Bytes: privBytes,
		}
		privPEM = string(pem.EncodeToMemory(privPEMBlock))

		sshPubKey, err := ssh.NewPublicKey(&privKey.PublicKey)
		if err != nil {
			return nil, err
		}
		pubKeyStr = string(ssh.MarshalAuthorizedKey(sshPubKey))

	case "ecdsa", "ecdsa-p256", "p256":
		curve := elliptic.P256()
		privKey, err := ecdsa.GenerateKey(curve, rand.Reader)
		if err != nil {
			return nil, err
		}
		privBytes, err := x509.MarshalECPrivateKey(privKey)
		if err != nil {
			return nil, err
		}
		privPEMBlock := &pem.Block{
			Type:  "EC PRIVATE KEY",
			Bytes: privBytes,
		}
		privPEM = string(pem.EncodeToMemory(privPEMBlock))
		sshPubKey, err := ssh.NewPublicKey(&privKey.PublicKey)
		if err != nil {
			return nil, err
		}
		pubKeyStr = string(ssh.MarshalAuthorizedKey(sshPubKey))

	case "ecdsa-p384", "p384":
		curve := elliptic.P384()
		privKey, err := ecdsa.GenerateKey(curve, rand.Reader)
		if err != nil {
			return nil, err
		}
		privBytes, err := x509.MarshalECPrivateKey(privKey)
		if err != nil {
			return nil, err
		}
		privPEMBlock := &pem.Block{
			Type:  "EC PRIVATE KEY",
			Bytes: privBytes,
		}
		privPEM = string(pem.EncodeToMemory(privPEMBlock))
		sshPubKey, err := ssh.NewPublicKey(&privKey.PublicKey)
		if err != nil {
			return nil, err
		}
		pubKeyStr = string(ssh.MarshalAuthorizedKey(sshPubKey))

	case "ecdsa-p521", "p521":
		curve := elliptic.P521()
		privKey, err := ecdsa.GenerateKey(curve, rand.Reader)
		if err != nil {
			return nil, err
		}
		privBytes, err := x509.MarshalECPrivateKey(privKey)
		if err != nil {
			return nil, err
		}
		privPEMBlock := &pem.Block{
			Type:  "EC PRIVATE KEY",
			Bytes: privBytes,
		}
		privPEM = string(pem.EncodeToMemory(privPEMBlock))
		sshPubKey, err := ssh.NewPublicKey(&privKey.PublicKey)
		if err != nil {
			return nil, err
		}
		pubKeyStr = string(ssh.MarshalAuthorizedKey(sshPubKey))

	default:
		return nil, fmt.Errorf("不支持的密钥类型: %s", keyType)
	}

	return map[string]string{
		"privateKey": privPEM,
		"publicKey":  pubKeyStr,
	}, nil
}

func (a *App) getAuthProfilesPath() string {
	return config.GetFilePath("auth_profiles.json")
}

func (a *App) GetAuthProfiles() ([]models.AuthProfile, error) {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return nil, fmt.Errorf("app_locked")
	}

	path := a.getAuthProfilesPath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []models.AuthProfile{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var profiles []models.AuthProfile
	err = json.Unmarshal(data, &profiles)
	if err != nil {
		return []models.AuthProfile{}, nil
	}

	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		for i, p := range profiles {
			if p.Password != "" {
				decrypted, err := crypto.Decrypt(p.Password, a.masterKey)
				if err == nil {
					profiles[i].Password = decrypted
				}
			}
			if p.PrivateKey != "" {
				decrypted, err := crypto.Decrypt(p.PrivateKey, a.masterKey)
				if err == nil {
					profiles[i].PrivateKey = decrypted
				}
			}
		}
	}

	return profiles, nil
}

func (a *App) SaveAuthProfile(profile models.AuthProfile) error {
	profiles, err := a.GetAuthProfiles()
	if err != nil && err.Error() == "app_locked" {
		return err
	}

	settings, _ := a.GetSettings()
	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		if profile.Password != "" {
			enc, err := crypto.Encrypt(profile.Password, a.masterKey)
			if err == nil {
				profile.Password = enc
			}
		}
		if profile.PrivateKey != "" {
			enc, err := crypto.Encrypt(profile.PrivateKey, a.masterKey)
			if err == nil {
				profile.PrivateKey = enc
			}
		}
	}

	found := false
	for i, p := range profiles {
		if p.ID == profile.ID {
			// 如果没改密码且发过来是空的，不应该覆盖？这里假定前端发过来的已经是明文或者空
			profiles[i] = profile
			found = true
			break
		}
	}
	if !found {
		if profile.ID == "" {
			profile.ID = fmt.Sprintf("auth_%d", time.Now().UnixNano())
		}
		profiles = append(profiles, profile)
	}

	// 将其他 profiles 的明文再次加密存盘
	for i, p := range profiles {
		if p.ID != profile.ID && settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
			if p.Password != "" {
				enc, _ := crypto.Encrypt(p.Password, a.masterKey)
				profiles[i].Password = enc
			}
			if p.PrivateKey != "" {
				enc, _ := crypto.Encrypt(p.PrivateKey, a.masterKey)
				profiles[i].PrivateKey = enc
			}
		}
	}

	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.getAuthProfilesPath(), data, 0644)
}

func (a *App) DeleteAuthProfile(id string) error {
	profiles, err := a.GetAuthProfiles()
	if err != nil && err.Error() == "app_locked" {
		return err
	}

	var newProfiles []models.AuthProfile
	for _, p := range profiles {
		if p.ID != id {
			newProfiles = append(newProfiles, p)
		}
	}

	settings, _ := a.GetSettings()
	for i, p := range newProfiles {
		if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
			if p.Password != "" {
				enc, _ := crypto.Encrypt(p.Password, a.masterKey)
				newProfiles[i].Password = enc
			}
			if p.PrivateKey != "" {
				enc, _ := crypto.Encrypt(p.PrivateKey, a.masterKey)
				newProfiles[i].PrivateKey = enc
			}
		}
	}

	data, err := json.MarshalIndent(newProfiles, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.getAuthProfilesPath(), data, 0644)
}

func (a *App) LockApp() error {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword {
		a.masterKey = nil
		a.isUnlocked = false
		return nil
	}
	return fmt.Errorf("master password not enabled")
}

func (a *App) getKnownHostsPath() string {
	return config.GetFilePath("known_hosts")
}

func (a *App) GetKnownHosts() ([]KnownHostEntry, error) {
	path := a.getKnownHostsPath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []KnownHostEntry{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(data), "\n")
	var entries []KnownHostEntry
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, " ", 3)
		if len(parts) >= 3 {
			entries = append(entries, KnownHostEntry{
				Index:    i,
				Hostname: parts[0],
				KeyType:  parts[1],
				KeyData:  parts[2],
			})
		}
	}
	return entries, nil
}

func (a *App) DeleteKnownHost(index int) error {
	path := a.getKnownHostsPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	lines := strings.Split(string(data), "\n")
	if index >= 0 && index < len(lines) {
		lines = append(lines[:index], lines[index+1:]...)
		return os.WriteFile(path, []byte(strings.Join(lines, "\n")), 0644)
	}
	return fmt.Errorf("index out of range")
}

func (a *App) ToggleFullscreen() {
	if isFullscreen {
		runtime.WindowUnfullscreen(a.ctx)
		isFullscreen = false
	} else {
		runtime.WindowFullscreen(a.ctx)
		isFullscreen = true
	}
}

// Color conversion helpers
func floatToHexByte(val float64) string {
	iv := int(math.Round(val * 255.0))
	if iv < 0 {
		iv = 0
	}
	if iv > 255 {
		iv = 255
	}
	return fmt.Sprintf("%02X", iv)
}

func rgbFloatsToHex(r, g, b float64) string {
	return fmt.Sprintf("#%s%s%s", floatToHexByte(r), floatToHexByte(g), floatToHexByte(b))
}

func rgbIntsToHex(r, g, b int) string {
	if r < 0 {
		r = 0
	}
	if r > 255 {
		r = 255
	}
	if g < 0 {
		g = 0
	}
	if g > 255 {
		g = 255
	}
	if b < 0 {
		b = 0
	}
	if b > 255 {
		b = 255
	}
	return fmt.Sprintf("#%02X%02X%02X", r, g, b)
}

func hexToRGBFloats(hexStr string) (float64, float64, float64) {
	hexStr = strings.TrimPrefix(strings.TrimSpace(hexStr), "#")
	if len(hexStr) == 3 {
		hexStr = string([]byte{hexStr[0], hexStr[0], hexStr[1], hexStr[1], hexStr[2], hexStr[2]})
	}
	if len(hexStr) != 6 {
		return 0, 0, 0
	}
	r, _ := strconv.ParseInt(hexStr[0:2], 16, 64)
	g, _ := strconv.ParseInt(hexStr[2:4], 16, 64)
	b, _ := strconv.ParseInt(hexStr[4:6], 16, 64)
	return float64(r) / 255.0, float64(g) / 255.0, float64(b) / 255.0
}

func hexToRGBInts(hexStr string) (int, int, int) {
	hexStr = strings.TrimPrefix(strings.TrimSpace(hexStr), "#")
	if len(hexStr) == 3 {
		hexStr = string([]byte{hexStr[0], hexStr[0], hexStr[1], hexStr[1], hexStr[2], hexStr[2]})
	}
	if len(hexStr) != 6 {
		return 0, 0, 0
	}
	r, _ := strconv.ParseInt(hexStr[0:2], 16, 64)
	g, _ := strconv.ParseInt(hexStr[2:4], 16, 64)
	b, _ := strconv.ParseInt(hexStr[4:6], 16, 64)
	return int(r), int(g), int(b)
}

// Windows Terminal Scheme definition
type windowsTerminalScheme struct {
	Name                string `json:"name"`
	Foreground          string `json:"foreground"`
	Background          string `json:"background"`
	CursorColor         string `json:"cursorColor"`
	SelectionBackground string `json:"selectionBackground"`
	Black               string `json:"black"`
	Red                 string `json:"red"`
	Green               string `json:"green"`
	Yellow              string `json:"yellow"`
	Blue                string `json:"blue"`
	Purple              string `json:"purple"`
	Magenta             string `json:"magenta"`
	Cyan                string `json:"cyan"`
	White               string `json:"white"`
	BrightBlack         string `json:"brightBlack"`
	BrightRed           string `json:"brightRed"`
	BrightGreen         string `json:"brightGreen"`
	BrightYellow        string `json:"brightYellow"`
	BrightBlue          string `json:"brightBlue"`
	BrightPurple        string `json:"brightPurple"`
	BrightMagenta       string `json:"brightMagenta"`
	BrightCyan          string `json:"brightCyan"`
	BrightWhite         string `json:"brightWhite"`
}

func (a *App) ImportColorScheme(content string) (ThemeConfig, error) {
	trimmed := strings.TrimSpace(content)
	if len(trimmed) == 0 {
		return ThemeConfig{}, fmt.Errorf("导入内容为空")
	}

	// 1. Check if it's an Apple Plist XML (.itermcolors)
	if strings.Contains(trimmed, "<plist") || (strings.Contains(trimmed, "<dict>") && strings.Contains(trimmed, "Color")) {
		return parseItermColorsPlist(trimmed)
	}

	// 2. Check if it's JSON (Windows Terminal or OmniTerminal / ThemeConfig)
	if strings.HasPrefix(trimmed, "{") {
		var wt windowsTerminalScheme
		if err := json.Unmarshal([]byte(trimmed), &wt); err == nil && (wt.Background != "" || wt.Foreground != "") {
			magenta := wt.Magenta
			if magenta == "" {
				magenta = wt.Purple
			}
			brightMagenta := wt.BrightMagenta
			if brightMagenta == "" {
				brightMagenta = wt.BrightPurple
			}
			cursor := wt.CursorColor
			if cursor == "" {
				cursor = wt.Foreground
			}
			selection := wt.SelectionBackground
			name := wt.Name
			if name == "" {
				name = "Imported Theme"
			}
			return ThemeConfig{
				Name:                name,
				Background:          wt.Background,
				Foreground:          wt.Foreground,
				Cursor:              cursor,
				CursorAccent:        wt.Background,
				Selection:           selection,
				SelectionForeground: wt.Foreground,
				Black:               wt.Black,
				Red:                 wt.Red,
				Green:               wt.Green,
				Yellow:              wt.Yellow,
				Blue:                wt.Blue,
				Magenta:             magenta,
				Cyan:                wt.Cyan,
				White:               wt.White,
				BrightBlack:         wt.BrightBlack,
				BrightRed:           wt.BrightRed,
				BrightGreen:         wt.BrightGreen,
				BrightYellow:        wt.BrightYellow,
				BrightBlue:          wt.BrightBlue,
				BrightMagenta:       brightMagenta,
				BrightCyan:          wt.BrightCyan,
				BrightWhite:         wt.BrightWhite,
			}, nil
		}

		var tc ThemeConfig
		if err := json.Unmarshal([]byte(trimmed), &tc); err == nil && tc.Background != "" && tc.Foreground != "" {
			if tc.Name == "" {
				tc.Name = "Imported Theme"
			}
			return tc, nil
		}
	}

	// 3. Check if it's Xshell .xcs INI format
	lower := strings.ToLower(trimmed)
	if strings.Contains(lower, "[") && (strings.Contains(lower, "text=") || strings.Contains(lower, "background=") || strings.Contains(lower, "color0=") || strings.Contains(lower, "[names]")) {
		return parseXshellXcs(trimmed)
	}

	return ThemeConfig{}, fmt.Errorf("无法识别的主题文件格式，支持 iTerm2 (.itermcolors), Windows Terminal JSON, Xshell (.xcs) 或标准 JSON")
}

func parseItermColorsPlist(xmlStr string) (ThemeConfig, error) {
	tc := ThemeConfig{
		Name: "iTerm2 Imported",
	}

	colorMap := make(map[string]string)

	// Robust regex matching: <key>Color Name</key>\s*<dict>(.*?)</dict>
	re := regexp.MustCompile(`(?s)<key>([^<]+)</key>\s*<dict>(.*?)</dict>`)
	matches := re.FindAllStringSubmatch(xmlStr, -1)

	for _, match := range matches {
		if len(match) < 3 {
			continue
		}
		colorKey := strings.TrimSpace(match[1])
		dictContent := match[2]

		r := extractRealValue(dictContent, "Red Component")
		g := extractRealValue(dictContent, "Green Component")
		b := extractRealValue(dictContent, "Blue Component")

		colorMap[colorKey] = rgbFloatsToHex(r, g, b)
	}

	if len(colorMap) == 0 {
		return ThemeConfig{}, fmt.Errorf("未能从 iTerm2 文件中提取到有效颜色配置")
	}

	tc.Background = colorMap["Background Color"]
	tc.Foreground = colorMap["Foreground Color"]
	tc.Cursor = colorMap["Cursor Color"]
	tc.CursorAccent = colorMap["Cursor Text Color"]
	tc.Selection = colorMap["Selection Color"]
	tc.SelectionForeground = colorMap["Selected Text Color"]

	tc.Black = colorMap["Ansi 0 Color"]
	tc.Red = colorMap["Ansi 1 Color"]
	tc.Green = colorMap["Ansi 2 Color"]
	tc.Yellow = colorMap["Ansi 3 Color"]
	tc.Blue = colorMap["Ansi 4 Color"]
	tc.Magenta = colorMap["Ansi 5 Color"]
	tc.Cyan = colorMap["Ansi 6 Color"]
	tc.White = colorMap["Ansi 7 Color"]

	tc.BrightBlack = colorMap["Ansi 8 Color"]
	tc.BrightRed = colorMap["Ansi 9 Color"]
	tc.BrightGreen = colorMap["Ansi 10 Color"]
	tc.BrightYellow = colorMap["Ansi 11 Color"]
	tc.BrightBlue = colorMap["Ansi 12 Color"]
	tc.BrightMagenta = colorMap["Ansi 13 Color"]
	tc.BrightCyan = colorMap["Ansi 14 Color"]
	tc.BrightWhite = colorMap["Ansi 15 Color"]

	return tc, nil
}

func extractRealValue(dictStr, keyName string) float64 {
	idx := strings.Index(dictStr, keyName)
	if idx == -1 {
		return 0.0
	}
	sub := dictStr[idx:]
	realStart := strings.Index(sub, "<real>")
	realEnd := strings.Index(sub, "</real>")
	if realStart == -1 || realEnd == -1 || realEnd <= realStart {
		return 0.0
	}
	valStr := strings.TrimSpace(sub[realStart+6 : realEnd])
	val, err := strconv.ParseFloat(valStr, 64)
	if err != nil {
		return 0.0
	}
	return val
}

func parseXshellXcs(iniStr string) (ThemeConfig, error) {
	tc := ThemeConfig{
		Name: "Xshell Imported",
	}

	lines := strings.Split(iniStr, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, ";") || strings.HasPrefix(line, "#") || len(line) == 0 {
			continue
		}
		if strings.HasPrefix(line, "[") {
			sec := strings.Trim(line, "[]")
			if sec != "Names" && sec != "Custom" && sec != "" {
				tc.Name = sec
			}
			continue
		}
		eqIdx := strings.Index(line, "=")
		if eqIdx == -1 {
			continue
		}
		k := strings.ToLower(strings.TrimSpace(line[:eqIdx]))
		v := strings.TrimSpace(line[eqIdx+1:])

		// RGB format like "192,192,192" or Hex "#C0C0C0"
		hexColor := parseRGBString(v)
		if hexColor == "" {
			continue
		}

		switch k {
		case "text", "foreground":
			tc.Foreground = hexColor
		case "background":
			tc.Background = hexColor
		case "cursor":
			tc.Cursor = hexColor
		case "selection":
			tc.Selection = hexColor
		case "black", "color0":
			tc.Black = hexColor
		case "red", "color1":
			tc.Red = hexColor
		case "green", "color2":
			tc.Green = hexColor
		case "yellow", "color3":
			tc.Yellow = hexColor
		case "blue", "color4":
			tc.Blue = hexColor
		case "magenta", "color5":
			tc.Magenta = hexColor
		case "cyan", "color6":
			tc.Cyan = hexColor
		case "white", "color7":
			tc.White = hexColor
		case "black_bold", "brightblack", "color8":
			tc.BrightBlack = hexColor
		case "red_bold", "brightred", "color9":
			tc.BrightRed = hexColor
		case "green_bold", "brightgreen", "color10":
			tc.BrightGreen = hexColor
		case "yellow_bold", "brightyellow", "color11":
			tc.BrightYellow = hexColor
		case "blue_bold", "brightblue", "color12":
			tc.BrightBlue = hexColor
		case "magenta_bold", "brightmagenta", "color13":
			tc.BrightMagenta = hexColor
		case "cyan_bold", "brightcyan", "color14":
			tc.BrightCyan = hexColor
		case "white_bold", "brightwhite", "color15":
			tc.BrightWhite = hexColor
		}
	}

	return tc, nil
}

func parseRGBString(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "#") {
		return s
	}
	parts := strings.Split(s, ",")
	if len(parts) == 3 {
		r, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
		g, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
		b, _ := strconv.Atoi(strings.TrimSpace(parts[2]))
		return rgbIntsToHex(r, g, b)
	}
	return ""
}

func (a *App) ExportColorScheme(theme ThemeConfig, filePath string) error {
	ext := strings.ToLower(filepath.Ext(filePath))
	var data []byte
	var err error

	switch ext {
	case ".itermcolors":
		data = exportItermColors(theme)
	case ".xcs":
		data = exportXshellXcs(theme)
	default:
		data, err = json.MarshalIndent(theme, "", "  ")
		if err != nil {
			return err
		}
	}

	return os.WriteFile(filePath, data, 0644)
}

func exportItermColors(t ThemeConfig) []byte {
	var sb strings.Builder
	sb.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	sb.WriteString("<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n")
	sb.WriteString("<plist version=\"1.0\">\n<dict>\n")

	writeItermColor := func(keyName, hexColor string) {
		r, g, b := hexToRGBFloats(hexColor)
		sb.WriteString(fmt.Sprintf("\t<key>%s</key>\n", keyName))
		sb.WriteString("\t<dict>\n")
		sb.WriteString(fmt.Sprintf("\t\t<key>Red Component</key>\n\t\t<real>%f</real>\n", r))
		sb.WriteString(fmt.Sprintf("\t\t<key>Green Component</key>\n\t\t<real>%f</real>\n", g))
		sb.WriteString(fmt.Sprintf("\t\t<key>Blue Component</key>\n\t\t<real>%f</real>\n", b))
		sb.WriteString("\t</dict>\n")
	}

	writeItermColor("Background Color", t.Background)
	writeItermColor("Foreground Color", t.Foreground)
	writeItermColor("Cursor Color", t.Cursor)
	writeItermColor("Cursor Text Color", t.CursorAccent)
	writeItermColor("Selection Color", t.Selection)
	writeItermColor("Selected Text Color", t.SelectionForeground)

	writeItermColor("Ansi 0 Color", t.Black)
	writeItermColor("Ansi 1 Color", t.Red)
	writeItermColor("Ansi 2 Color", t.Green)
	writeItermColor("Ansi 3 Color", t.Yellow)
	writeItermColor("Ansi 4 Color", t.Blue)
	writeItermColor("Ansi 5 Color", t.Magenta)
	writeItermColor("Ansi 6 Color", t.Cyan)
	writeItermColor("Ansi 7 Color", t.White)

	writeItermColor("Ansi 8 Color", t.BrightBlack)
	writeItermColor("Ansi 9 Color", t.BrightRed)
	writeItermColor("Ansi 10 Color", t.BrightGreen)
	writeItermColor("Ansi 11 Color", t.BrightYellow)
	writeItermColor("Ansi 12 Color", t.BrightBlue)
	writeItermColor("Ansi 13 Color", t.BrightMagenta)
	writeItermColor("Ansi 14 Color", t.BrightCyan)
	writeItermColor("Ansi 15 Color", t.BrightWhite)

	sb.WriteString("</dict>\n</plist>\n")
	return []byte(sb.String())
}

func exportXshellXcs(t ThemeConfig) []byte {
	var sb strings.Builder
	name := t.Name
	if name == "" {
		name = "Custom"
	}
	sb.WriteString("[Names]\ncount=1\nname0=" + name + "\n\n")
	sb.WriteString("[" + name + "]\n")

	writeXcsColor := func(key, hexStr string) {
		r, g, b := hexToRGBInts(hexStr)
		sb.WriteString(fmt.Sprintf("%s=%d,%d,%d\n", key, r, g, b))
	}

	writeXcsColor("text", t.Foreground)
	writeXcsColor("background", t.Background)
	writeXcsColor("black", t.Black)
	writeXcsColor("black_bold", t.BrightBlack)
	writeXcsColor("red", t.Red)
	writeXcsColor("red_bold", t.BrightRed)
	writeXcsColor("green", t.Green)
	writeXcsColor("green_bold", t.BrightGreen)
	writeXcsColor("yellow", t.Yellow)
	writeXcsColor("yellow_bold", t.BrightYellow)
	writeXcsColor("blue", t.Blue)
	writeXcsColor("blue_bold", t.BrightBlue)
	writeXcsColor("magenta", t.Magenta)
	writeXcsColor("magenta_bold", t.BrightMagenta)
	writeXcsColor("cyan", t.Cyan)
	writeXcsColor("cyan_bold", t.BrightCyan)
	writeXcsColor("white", t.White)
	writeXcsColor("white_bold", t.BrightWhite)

	return []byte(sb.String())
}

func (a *App) getIdentityKeysPath() string {
	return config.GetFilePath("identity_keys.json")
}

func (a *App) GetIdentityKeys() ([]models.IdentityKey, error) {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return nil, fmt.Errorf("app_locked")
	}

	path := a.getIdentityKeysPath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []models.IdentityKey{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var keys []models.IdentityKey
	err = json.Unmarshal(data, &keys)
	if err != nil {
		return []models.IdentityKey{}, nil
	}

	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		for i, k := range keys {
			if k.PrivateKey != "" {
				decrypted, err := crypto.Decrypt(k.PrivateKey, a.masterKey)
				if err == nil {
					keys[i].PrivateKey = decrypted
				}
			}
		}
	}

	return keys, nil
}

func (a *App) SaveIdentityKey(key models.IdentityKey) error {
	keys, err := a.GetIdentityKeys()
	if err != nil && err.Error() == "app_locked" {
		return err
	}

	settings, _ := a.GetSettings()
	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		if key.PrivateKey != "" {
			enc, err := crypto.Encrypt(key.PrivateKey, a.masterKey)
			if err == nil {
				key.PrivateKey = enc
			}
		}
	}

	found := false
	for i, k := range keys {
		if k.ID == key.ID {
			keys[i] = key
			found = true
			break
		}
	}
	if !found {
		if key.ID == "" {
			key.ID = fmt.Sprintf("idkey_%d", time.Now().UnixNano())
		}
		keys = append(keys, key)
	}

	for i, k := range keys {
		if k.ID != key.ID && settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
			if k.PrivateKey != "" {
				enc, _ := crypto.Encrypt(k.PrivateKey, a.masterKey)
				keys[i].PrivateKey = enc
			}
		}
	}

	data, err := json.MarshalIndent(keys, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.getIdentityKeysPath(), data, 0644)
}

func (a *App) DeleteIdentityKey(id string) error {
	keys, err := a.GetIdentityKeys()
	if err != nil && err.Error() == "app_locked" {
		return err
	}

	var newKeys []models.IdentityKey
	for _, k := range keys {
		if k.ID != id {
			newKeys = append(newKeys, k)
		}
	}

	settings, _ := a.GetSettings()
	for i, k := range newKeys {
		if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
			if k.PrivateKey != "" {
				enc, _ := crypto.Encrypt(k.PrivateKey, a.masterKey)
				newKeys[i].PrivateKey = enc
			}
		}
	}

	data, err := json.MarshalIndent(newKeys, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.getIdentityKeysPath(), data, 0644)
}

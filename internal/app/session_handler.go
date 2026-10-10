package app

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"

	"omniterminal/internal/core"
	"omniterminal/internal/crypto"
	"omniterminal/internal/models"
)

func (a *App) GetSessions() ([]SessionConfig, error) {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return nil, fmt.Errorf("app_locked")
	}

	path := a.getConfigPath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []SessionConfig{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var sessions []SessionConfig
	err = json.Unmarshal(data, &sessions)
	if err != nil {
		return []SessionConfig{}, nil
	}

	// 如果启用了主密码且已解锁，解密凭证
	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		for i, s := range sessions {
			if !s.IsFolder {
				if s.Password != "" {
					decrypted, err := crypto.Decrypt(s.Password, a.masterKey)
					if err == nil {
						sessions[i].Password = decrypted
					}
				}
				if s.PrivateKey != "" {
					decrypted, err := crypto.Decrypt(s.PrivateKey, a.masterKey)
					if err == nil {
						sessions[i].PrivateKey = decrypted
					}
				}
			}
		}
	}

	return sessions, nil
}

func (a *App) SaveSession(config SessionConfig) error {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return fmt.Errorf("app_locked")
	}

	sessions, err := a.GetSessions()
	if err != nil {
		sessions = []SessionConfig{}
	}

	found := false
	for i, s := range sessions {
		if s.ID == config.ID {
			sessions[i] = config
			found = true
			break
		}
	}

	if !found {
		sessions = append(sessions, config)
	}

	// 加密写入磁盘
	var sessionsToWrite = make([]SessionConfig, len(sessions))
	copy(sessionsToWrite, sessions)

	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		for i, s := range sessionsToWrite {
			if !s.IsFolder {
				if s.Password != "" {
					encrypted, err := crypto.Encrypt(s.Password, a.masterKey)
					if err == nil {
						sessionsToWrite[i].Password = encrypted
					}
				}
				if s.PrivateKey != "" {
					encrypted, err := crypto.Encrypt(s.PrivateKey, a.masterKey)
					if err == nil {
						sessionsToWrite[i].PrivateKey = encrypted
					}
				}
			}
		}
	}

	data, err := json.MarshalIndent(sessionsToWrite, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(a.getConfigPath(), data, 0644)
}

func (a *App) SaveSessionsBatch(configs []SessionConfig) error {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return fmt.Errorf("app_locked")
	}

	sessions, err := a.GetSessions()
	if err != nil {
		sessions = []SessionConfig{}
	}

	for _, config := range configs {
		found := false
		for i, s := range sessions {
			if s.ID == config.ID {
				sessions[i] = config
				found = true
				break
			}
		}
		if !found {
			sessions = append(sessions, config)
		}
	}

	// 加密写入磁盘
	var sessionsToWrite = make([]SessionConfig, len(sessions))
	copy(sessionsToWrite, sessions)

	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		for i, s := range sessionsToWrite {
			if !s.IsFolder {
				if s.Password != "" {
					encrypted, err := crypto.Encrypt(s.Password, a.masterKey)
					if err == nil {
						sessionsToWrite[i].Password = encrypted
					}
				}
				if s.PrivateKey != "" {
					encrypted, err := crypto.Encrypt(s.PrivateKey, a.masterKey)
					if err == nil {
						sessionsToWrite[i].PrivateKey = encrypted
					}
				}
			}
		}
	}

	data, err := json.MarshalIndent(sessionsToWrite, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(a.getConfigPath(), data, 0644)
}

func (a *App) DeleteSession(id string) error {
	settings, err := a.GetSettings()
	if err == nil && settings.HasMasterPassword && !a.isUnlocked {
		return fmt.Errorf("app_locked")
	}

	sessions, err := a.GetSessions()
	if err != nil {
		return err
	}

	var newSessions []SessionConfig
	for _, s := range sessions {
		if s.ID != id {
			newSessions = append(newSessions, s)
		}
	}

	// 加密写入磁盘
	if settings.HasMasterPassword && a.isUnlocked && len(a.masterKey) > 0 {
		for i, s := range newSessions {
			if !s.IsFolder {
				if s.Password != "" {
					encrypted, err := crypto.Encrypt(s.Password, a.masterKey)
					if err == nil {
						newSessions[i].Password = encrypted
					}
				}
				if s.PrivateKey != "" {
					encrypted, err := crypto.Encrypt(s.PrivateKey, a.masterKey)
					if err == nil {
						newSessions[i].PrivateKey = encrypted
					}
				}
			}
		}
	}

	data, err := json.MarshalIndent(newSessions, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(a.getConfigPath(), data, 0644)
}

func (a *App) ConnectSSH(
	id string,
	name string,
	host string,
	port int,
	user string,
	password string,
	privateKey string,
	cols int,
	rows int,
	loginScripts []models.ExpectInteractive,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	tunnels []models.SSHTunnel,
	encoding string,
	jumpHostSessionId string,
	termType string,
	isLocal bool,
	proxyType string,
	proxyHost string,
	proxyPort int,
	proxyUser string,
	proxyPassword string,
	ciphers []string,
	macs []string,
	sessionMode string,
	enableAgentForwarding bool,
	enableX11Forwarding bool,
	x11Display string,
	triggers []models.TriggerRule,
	identityKeyId string,
) error {
	var jumpHost, jumpUser, jumpPassword, jumpPrivateKey string
	var jumpPort int

	if jumpHostSessionId != "" {
		sessions, err := a.GetSessions()
		if err == nil {
			for _, s := range sessions {
				if s.ID == jumpHostSessionId && !s.IsFolder {
					jumpHost = s.Host
					jumpPort = s.Port
					jumpUser = s.User
					jumpPassword = s.Password
					jumpPrivateKey = s.PrivateKey
					break
				}
			}
		}
	}

	if identityKeyId != "" {
		keys, err := a.GetIdentityKeys()
		if err == nil {
			for _, k := range keys {
				if k.ID == identityKeyId {
					privateKey = k.PrivateKey
					break
				}
			}
		}
	}

	// 如果会话未显式指定自定义代理，且全局开启了“使用系统代理”，自动继承系统代理 (Stage 2)
	if (proxyType == "" || proxyType == "none") && !isLocal {
		if settings, err := a.GetSettings(); err == nil && settings.UseSystemProxy {
			sysProxy := core.DetectSystemProxy()
			if sysProxy.Enabled && sysProxy.Host != "" && sysProxy.Port > 0 {
				proxyType = sysProxy.ProxyType
				proxyHost = sysProxy.Host
				proxyPort = sysProxy.Port
			}
		}
	}

	return a.sshManager.Connect(
		id, name, host, port, user, password, privateKey,
		cols, rows, loginScripts, overrideTheme, overrideFontSize,
		logConfig, tunnels, encoding,
		jumpHost, jumpPort, jumpUser, jumpPassword, jumpPrivateKey,
		termType, isLocal,
		proxyType, proxyHost, proxyPort, proxyUser, proxyPassword,
		ciphers, macs,
		sessionMode, enableAgentForwarding, enableX11Forwarding, x11Display,
		triggers,
	)
}

func (a *App) WriteSSH(id string, base64Data string) error {
	return a.sshManager.Write(id, base64Data)
}

func (a *App) ResizeSSH(id string, cols int, rows int) error {
	return a.sshManager.Resize(id, cols, rows)
}

func (a *App) DisconnectSSH(id string) error {
	return a.sshManager.Disconnect(id)
}

func (a *App) GetSessionUptime(id string) int64 {
	return a.sshManager.GetSessionUptime(id)
}

// Phase 2: 串口与多协议通信方法

func (a *App) ConnectSerial(
	id string,
	name string,
	cfg models.SerialConfig,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectSerial(id, name, cfg, overrideTheme, overrideFontSize, logConfig, encoding)
}

func (a *App) ConnectTelnet(
	id string,
	name string,
	host string,
	port int,
	termType string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectTelnet(id, name, host, port, termType, cols, rows, overrideTheme, overrideFontSize, logConfig, encoding)
}

func (a *App) ConnectRlogin(
	id string,
	name string,
	host string,
	port int,
	clientUser string,
	serverUser string,
	termType string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectRlogin(id, name, host, port, clientUser, serverUser, termType, cols, rows, overrideTheme, overrideFontSize, logConfig, encoding)
}

func (a *App) ConnectMosh(
	id string,
	name string,
	host string,
	port int,
	user string,
	password string,
	privateKey string,
	moshServerPath string,
	moshPortRange string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectMosh(id, name, host, port, user, password, privateKey, moshServerPath, moshPortRange, cols, rows, overrideTheme, overrideFontSize, logConfig, encoding)
}

func (a *App) ConnectRawTCP(
	id string,
	name string,
	host string,
	port int,
	lineEnding string,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectRawTCP(id, name, host, port, lineEnding, overrideTheme, overrideFontSize, logConfig, encoding)
}

func (a *App) ConnectLocalShell(
	id string,
	name string,
	shellPath string,
	wslDistro string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectLocalShell(id, name, shellPath, wslDistro, cols, rows, overrideTheme, overrideFontSize, logConfig, encoding)
}

func (a *App) LogFrontendDebug(msg string) {
}

func (a *App) ListSerialPorts() ([]string, error) {
	return core.ListSerialPorts()
}

func (a *App) SetSerialDTR(sessionId string, state bool) error {
	return a.sshManager.SetSerialDTR(sessionId, state)
}

func (a *App) SetSerialRTS(sessionId string, state bool) error {
	return a.sshManager.SetSerialRTS(sessionId, state)
}

func (a *App) SendSerialBreak(sessionId string) error {
	return a.sshManager.SendSerialBreak(sessionId)
}

func (a *App) ListAvailableShells() ([]models.SystemShellInfo, error) {
	return core.ListAvailableShells()
}

func (a *App) ListWSLDistros() ([]models.WSLDistroInfo, error) {
	return core.ListWSLDistros()
}

// CheckHostReachability 探测单个会话主机的连通性与网络往返时延
func (a *App) CheckHostReachability(sessionId string) (*models.HostStatusResult, error) {
	sessions, err := a.GetSessions()
	if err != nil {
		return nil, err
	}

	var target *SessionConfig
	for _, s := range sessions {
		if s.ID == sessionId {
			target = &s
			break
		}
	}

	if target == nil {
		return nil, fmt.Errorf("未找到会话 %s", sessionId)
	}

	if target.IsFolder || target.IsLocal || target.Host == "" {
		return &models.HostStatusResult{
			SessionID: sessionId,
			Online:    true,
			LatencyMs: 0,
			CheckedAt: time.Now().Format("15:04:05"),
		}, nil
	}

	port := target.Port
	if port <= 0 {
		port = 22
	}

	online, latency, err := core.ProbeHost(target.Host, port, 1500*time.Millisecond)
	errStr := ""
	if err != nil {
		errStr = err.Error()
	}

	return &models.HostStatusResult{
		SessionID: sessionId,
		Online:    online,
		LatencyMs: latency,
		CheckedAt: time.Now().Format("15:04:05"),
		Error:     errStr,
	}, nil
}

// BatchCheckHostReachability 并发探测多个会话主机的连通性
func (a *App) BatchCheckHostReachability(sessionIds []string) (map[string]models.HostStatusResult, error) {
	sessions, err := a.GetSessions()
	if err != nil {
		return nil, err
	}

	sessionMap := make(map[string]SessionConfig)
	for _, s := range sessions {
		sessionMap[s.ID] = s
	}

	targets := make(map[string]struct {
		Host string
		Port int
	})

	idList := sessionIds
	if len(idList) == 0 {
		for _, s := range sessions {
			if !s.IsFolder && !s.IsLocal && s.Host != "" {
				idList = append(idList, s.ID)
			}
		}
	}

	for _, id := range idList {
		if s, ok := sessionMap[id]; ok && !s.IsFolder && !s.IsLocal && s.Host != "" {
			port := s.Port
			if port <= 0 {
				port = 22
			}
			targets[id] = struct {
				Host string
				Port int
			}{
				Host: s.Host,
				Port: port,
			}
		}
	}

	return core.BatchProbeHosts(targets, 1500*time.Millisecond), nil
}

// ExportToSSHConfig 将 OmniTerminal 中的 SSH 会话配置反向导出为标准 OpenSSH ~/.ssh/config 格式
func (a *App) ExportToSSHConfig() (string, error) {
	sessions, err := a.GetSessions()
	if err != nil {
		return "", fmt.Errorf("读取会话配置失败: %v", err)
	}

	var sb strings.Builder
	sb.WriteString("# ========================================================\n")
	sb.WriteString("# OmniTerminal Exported OpenSSH Configuration\n")
	sb.WriteString(fmt.Sprintf("# Generated at: %s\n", time.Now().Format("2006-01-02 15:04:05")))
	sb.WriteString("# ========================================================\n\n")

	sanitizer := regexp.MustCompile(`[^a-zA-Z0-9_\.\-]`)

	count := 0
	for _, s := range sessions {
		if s.IsFolder || s.IsLocal || s.Host == "" {
			continue
		}
		if s.Protocol != "" && s.Protocol != "ssh" {
			continue
		}

		alias := sanitizer.ReplaceAllString(s.Name, "-")
		if alias == "" {
			alias = fmt.Sprintf("session-%s", s.ID)
		}

		port := s.Port
		if port <= 0 {
			port = 22
		}

		user := s.User
		if user == "" {
			user = "root"
		}

		sb.WriteString(fmt.Sprintf("Host %s\n", alias))
		sb.WriteString(fmt.Sprintf("    HostName %s\n", s.Host))
		sb.WriteString(fmt.Sprintf("    User %s\n", user))
		sb.WriteString(fmt.Sprintf("    Port %d\n", port))

		if s.IdentityKeyId != "" {
			sb.WriteString(fmt.Sprintf("    # IdentityKeyId: %s\n", s.IdentityKeyId))
		}

		if s.JumpHostSessionID != "" {
			sb.WriteString(fmt.Sprintf("    # JumpHostSessionID: %s\n", s.JumpHostSessionID))
		} else if s.ProxyType == "socks5" && s.ProxyHost != "" {
			proxyPort := s.ProxyPort
			if proxyPort <= 0 {
				proxyPort = 1080
			}
			sb.WriteString(fmt.Sprintf("    ProxyCommand nc -X 5 -x %s:%d %%h %%p\n", s.ProxyHost, proxyPort))
		} else if s.ProxyType == "http" && s.ProxyHost != "" {
			proxyPort := s.ProxyPort
			if proxyPort <= 0 {
				proxyPort = 8080
			}
			sb.WriteString(fmt.Sprintf("    ProxyCommand nc -X connect -x %s:%d %%h %%p\n", s.ProxyHost, proxyPort))
		}

		sb.WriteString("    ServerAliveInterval 30\n")
		sb.WriteString("    ServerAliveCountMax 3\n")
		sb.WriteString("    TCPKeepAlive yes\n\n")
		count++
	}

	if count == 0 {
		sb.WriteString("# (未找到任何有效的远程 SSH 会话)\n")
	}

	return sb.String(), nil
}

// ImportFromSSHConfig 从指定的 OpenSSH config 配置文件中批量解析导入会话
func (a *App) ImportFromSSHConfig(filePath string) ([]SessionConfig, error) {
	if filePath == "" {
		return a.ScanLocalSSHConfig()
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}
	return parseSSHConfig(string(data))
}

// GetSSHPoolStats 获取 SSH 连接池状态列表
func (a *App) GetSSHPoolStats() []models.SSHPoolStat {
	if a.sshManager == nil || a.sshManager.Pool == nil {
		return []models.SSHPoolStat{}
	}
	return a.sshManager.Pool.GetStats()
}

// ClosePooledConnection 强制断开并从连接池移除指定连接
func (a *App) ClosePooledConnection(key string) error {
	if a.sshManager == nil || a.sshManager.Pool == nil {
		return fmt.Errorf("连接池未初始化")
	}
	return a.sshManager.Pool.ClosePooled(key)
}

// ExecuteCommandOnSessions 并发向多个已连接会话批量下发命令并收集聚合执行结果
func (a *App) ExecuteCommandOnSessions(sessionIds []string, command string) (map[string]models.CommandDiffResult, error) {
	if len(sessionIds) == 0 {
		return make(map[string]models.CommandDiffResult), nil
	}
	if strings.TrimSpace(command) == "" {
		return nil, fmt.Errorf("执行命令不可为空")
	}

	results := make(map[string]models.CommandDiffResult)
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, id := range sessionIds {
		wg.Add(1)
		go func(sessId string) {
			defer wg.Done()
			start := time.Now()

			a.sshManager.Mu.RLock()
			info := a.sshManager.Sessions[sessId]
			a.sshManager.Mu.RUnlock()

			res := models.CommandDiffResult{
				SessionID: sessId,
				HostName:  sessId,
			}

			if info == nil {
				res.Error = "会话不存在或已断开连接"
				res.ExitCode = -1
				res.DurationMs = time.Since(start).Milliseconds()
				mu.Lock()
				results[sessId] = res
				mu.Unlock()
				return
			}
			res.HostName = info.Name

			// 本地 Shell 执行
			if info.IsLocal {
				cmd := exec.Command("sh", "-c", command)
				if runtime.GOOS == "windows" {
					cmd = exec.Command("cmd.exe", "/c", command)
				}
				core.HideConsoleWindow(cmd)
				out, err := cmd.CombinedOutput()
				res.Output = string(out)
				res.DurationMs = time.Since(start).Milliseconds()
				if err != nil {
					res.Error = err.Error()
					if exitErr, ok := err.(*exec.ExitError); ok {
						res.ExitCode = exitErr.ExitCode()
					} else {
						res.ExitCode = 1
					}
				} else {
					res.ExitCode = 0
				}
				mu.Lock()
				results[sessId] = res
				mu.Unlock()
				return
			}

			// 远程 SSH 执行
			if info.Client != nil {
				session, err := info.Client.NewSession()
				if err != nil {
					res.Error = fmt.Sprintf("创建 SSH Channel 失败: %v", err)
					res.ExitCode = -1
					res.DurationMs = time.Since(start).Milliseconds()
					mu.Lock()
					results[sessId] = res
					mu.Unlock()
					return
				}
				defer session.Close()

				out, err := session.CombinedOutput(command)
				res.Output = string(out)
				res.DurationMs = time.Since(start).Milliseconds()
				if err != nil {
					res.Error = err.Error()
					if exitErr, ok := err.(*ssh.ExitError); ok {
						res.ExitCode = exitErr.ExitStatus()
					} else {
						res.ExitCode = 1
					}
				} else {
					res.ExitCode = 0
				}
			} else {
				res.Error = "该协议类型暂不支持非交互式命令执行"
				res.ExitCode = -1
				res.DurationMs = time.Since(start).Milliseconds()
			}

			mu.Lock()
			results[sessId] = res
			mu.Unlock()
		}(id)
	}

	wg.Wait()
	return results, nil
}



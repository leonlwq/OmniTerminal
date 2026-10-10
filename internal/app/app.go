package app

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/core"
	"omniterminal/internal/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	sshManager       *core.SSHManager
	masterKey        []byte // 内存中保存的 32 字节 AES 密钥
	isUnlocked       bool   // 软件是否已解锁
	isForceQuit      bool   // 是否强制退出（跳过窗口关闭拦截）
	sleepInhibitor   *core.SleepInhibitor
	autoStartManager *core.AutoStartManager
	trayManager      *core.TrayManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{
		sshManager:       core.NewSSHManager(),
		isUnlocked:       false,
		sleepInhibitor:   core.NewSleepInhibitor(),
		autoStartManager: core.NewAutoStartManager(),
	}
	a.trayManager = core.NewTrayManager(
		func() {
			a.ShowMainWindow()
		},
		func() {
			a.ForceQuit()
		},
	)
	return a
}

// Startup startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.sshManager.SetContext(ctx)

	// 无条件挂载系统级生命周期与Dock/托盘唤醒机制
	if a.trayManager != nil {
		a.trayManager.Setup()
	}

	// 读取设置检查是否有主密码与窗口几何恢复
	settings, err := a.GetSettings()
	if err == nil {
		if !settings.HasMasterPassword {
			a.isUnlocked = true
		}
		// 恢复窗口尺寸与位置 (Stage 1)
		if settings.RememberWindowPosition && settings.WindowWidth > 300 && settings.WindowHeight > 200 {
			runtime.WindowSetSize(ctx, settings.WindowWidth, settings.WindowHeight)
			if settings.WindowX > 0 || settings.WindowY > 0 {
				runtime.WindowSetPosition(ctx, settings.WindowX, settings.WindowY)
			}
			if settings.WindowIsMaximised {
				runtime.WindowMaximise(ctx)
			}
		}

		// 阻止系统休眠 (Stage 2)
		if settings.PreventSleep {
			_ = a.sleepInhibitor.Enable()
		}

		// 托盘与Dock唤醒管理 (Stage 2)
		if a.trayManager != nil && !settings.DisableSystemTray {
			a.trayManager.ShowTray("")
		}
	}
}

// SessionConfig 会话配置
type SessionConfig struct {
	ID               string                     `json:"id"`
	Name             string                     `json:"name"`
	IsFolder         bool                       `json:"isFolder"`
	ParentID         string                     `json:"parentId"`
	Host             string                     `json:"host"`
	Port             int                        `json:"port"`
	User             string                     `json:"user"`
	Password         string                     `json:"password"`
	AuthProfileID    string                     `json:"authProfileId"`
	IdentityKeyId    string                     `json:"identityKeyId"`
	PrivateKey       string                     `json:"privateKey"`
	Certificate      string                     `json:"certificate,omitempty"` // OpenSSH 证书 (-cert.pub)
	UseSSHAgent      bool                       `json:"useSshAgent,omitempty"` // 是否启用 SSH Agent 密钥代理
	TotpEntryID      string                     `json:"totpEntryId,omitempty"` // 绑定的 TOTP 令牌 ID (MFA 自动注入)
	LoginScripts     []models.ExpectInteractive `json:"loginScripts"`
	Triggers         []models.TriggerRule       `json:"triggers"`
	OverrideTheme    string                     `json:"overrideTheme"`
	OverrideFontSize int                        `json:"overrideFontSize"`
	LogConfig        models.LogConfig           `json:"logConfig"`
	Tunnels          []models.SSHTunnel         `json:"tunnels"`

	Encoding                string  `json:"encoding"`
	JumpHostSessionID       string  `json:"jumpHostSessionId"`
	OverrideScrollback      int     `json:"overrideScrollback"`
	OverrideCursorStyle     string  `json:"overrideCursorStyle"`
	OverrideCursorBlink     int     `json:"overrideCursorBlink"`
	OverrideEnableBell      int     `json:"overrideEnableBell"`
	OverrideCopyOnSelect    int     `json:"overrideCopyOnSelect"`
	OverrideTerminalOpacity float64 `json:"overrideTerminalOpacity"`
	OverrideLineHeight      float64 `json:"overrideLineHeight"`      // 独立行高覆盖
	OverrideTerminalPadding int     `json:"overrideTerminalPadding"` // 独立内边距覆盖
	OverrideEnableLigatures int     `json:"overrideEnableLigatures"` // 0 继承, 1 启用, 2 禁用
	OverrideCharSendDelayMs int     `json:"overrideCharSendDelayMs"` // 字符间延时覆盖 (ms)
	OverrideLineSendDelayMs int     `json:"overrideLineSendDelayMs"` // 行间延时覆盖 (ms)
	BackgroundImage         string  `json:"backgroundImage"`
	BackgroundOpacity       float64 `json:"backgroundOpacity"`
	BackgroundBlur          int     `json:"backgroundBlur"`          // 背景模糊度 (0~20px)
	BackgroundFit           string  `json:"backgroundFit"`           // 背景模式: "cover" | "contain" | "tile"
	ColorLabel              string  `json:"colorLabel"` // 会话颜色标签
	TermType                string  `json:"termType"`   // 仿真终端类型: xterm-256color, vt100 等
	IsLocal                 bool    `json:"isLocal"`    // 是否为本地直连 Shell

	ProxyType     string `json:"proxyType"` // none, http, socks5
	ProxyHost     string `json:"proxyHost"`
	ProxyPort     int    `json:"proxyPort"`
	ProxyUser     string `json:"proxyUser"`
	ProxyPassword string `json:"proxyPassword"`

	Ciphers []string `json:"ciphers"` // 自定义加密算法
	MACs    []string `json:"macs"`    // 自定义 MAC 算法

	SessionMode           string `json:"sessionMode"`           // "ssh" | "sftp-only"
	EnableAgentForwarding bool   `json:"enableAgentForwarding"` // 是否开启 SSH Agent 转发
	EnableX11Forwarding   bool   `json:"enableX11Forwarding"`   // 是否开启 X11 转发
	X11Display            string `json:"x11Display"`            // X11 本地显示地址, 如 localhost:6000

	// Phase 2: 多协议支持
	Protocol     string               `json:"protocol"` // "ssh" | "serial" | "telnet" | "rlogin" | "mosh" | "raw_tcp" | "local"
	SerialConfig *models.SerialConfig `json:"serialConfig,omitempty"`
	LineEnding   string               `json:"lineEnding,omitempty"` // "CRLF" | "CR" | "LF" | "NONE"
	WSLDistro    string               `json:"wslDistro,omitempty"`  // WSL 发行版名称
	ShellPath    string               `json:"shellPath,omitempty"`  // 本地 Shell 路径

	// Phase 6: 竞品协议补全 (Mosh / Web Browser)
	MoshServerPath  string `json:"moshServerPath,omitempty"`  // 远端 mosh-server 路径 (默认 mosh-server)
	MoshPortRange   string `json:"moshPortRange,omitempty"`   // UDP 端口范围 (如 60000:61000)
	MoshPredictMode string `json:"moshPredictMode,omitempty"` // 预测模式 (adaptive, always, never)
	WebURL          string `json:"webUrl,omitempty"`          // 内嵌 Web 浏览器访问 URL

	// Phase 4 / 19.3: 会话标签体系
	Tags []string `json:"tags,omitempty"` // 自定义标签列表, 如 ["生产环境", "K8s", "MySQL集群"]

	// Phase 7 / 24.1: 现代化基础功能缺口
	Osc52Mode             string `json:"osc52Mode,omitempty"`             // "disabled" | "write" | "readwrite"
	ContainerType         string `json:"containerType,omitempty"`         // "docker" | "k8s"
	DockerHostSessionID   string `json:"dockerHostSessionId,omitempty"`   // 宿主 SSH 会话 ID (空表示本地 Docker)
	DockerContainerID     string `json:"dockerContainerId,omitempty"`     // 目标容器 ID / 名称
	DockerShell           string `json:"dockerShell,omitempty"`           // 目标容器 Shell (默认 /bin/bash, 自动降级)
	K8sNamespace          string `json:"k8sNamespace,omitempty"`          // K8s 命名空间
	K8sPod                string `json:"k8sPod,omitempty"`                // K8s Pod 名称
	K8sContainer          string `json:"k8sContainer,omitempty"`          // Pod 内容器名称
	K8sKubeconfig         string `json:"k8sKubeconfig,omitempty"`         // kubeconfig 路径
}

// GetStartupArgs returns command line arguments
func (a *App) GetStartupArgs() []string {
	return os.Args
}

// DetachToNewWindow spawns an independent OmniTerminal window running the specified session
func (a *App) DetachToNewWindow(sessionName string, isLocal bool) error {
	execPath, err := os.Executable()
	if err != nil {
		execPath = os.Args[0]
	}

	var args []string
	if isLocal {
		args = []string{"--local"}
	} else if sessionName != "" {
		args = []string{"--session", sessionName}
	}

	if goruntime.GOOS == "darwin" {
		if strings.Contains(execPath, ".app/Contents/MacOS/") {
			appIndex := strings.Index(execPath, ".app/Contents/MacOS/")
			appBundle := execPath[:appIndex+4]
			cmdArgs := []string{"-n", appBundle, "--args"}
			cmdArgs = append(cmdArgs, args...)
			cmd := exec.Command("open", cmdArgs...)
			return cmd.Start()
		}
	}

	cmd := exec.Command(execPath, args...)
	return cmd.Start()
}

func (a *App) getConfigPath() string {
	return config.GetFilePath("sessions.json")
}

// GetSessions 获取所有会话列表

// SaveSession 保存或新增会话

// DeleteSession 删除会话

// ConnectSSH 连接 SSH

// ChangeMasterPassword 修改主密码保护，并用新 Key 重密所有会话

// GetSessionUptime 获取会话在线时长（秒）

// SftpMkdir 在远程创建目录

// SftpRename 重命名远程文件/目录

// SftpChmod 修改远程文件权限

// SftpFileInfo SFTP 文件信息
type SftpFileInfo struct {
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	ModTime string `json:"modTime"`
	Mode    string `json:"mode"`
}

// SftpListDir 列出远程目录文件

// SftpUploadFile 上传文件 (异步后台)

// SftpDownloadFile 下载文件 (异步后台)

// SftpDelete 删除文件

// GetSettings 获取设置

// SaveSettings 保存设置

// IsAppLocked 锁定检查

// UnlockSessions 解锁

// EnableMasterPassword 启用主密码

// DisableMasterPassword 禁用主密码

// BackupData 备份打包格式
type BackupData struct {
	Sessions []SessionConfig    `json:"sessions"`
	Settings models.AppSettings `json:"settings"`
}

// ExportBackup 导出备份配置文件

// ImportBackup 导入并恢复备份配置文件

// GenerateKeyPair 生成指定的密钥对，返回 { "privateKey": "...", "publicKey": "..." }

// LocalListDir 列出本地目录文件

// GetLocalHomeDir 获取本地 Home 目录

// LocalReadFile 仅用于读取体积较小的文本文件（双击编辑功能）

// LocalWriteFile 写入文件内容（保存编辑功能）

// LocalMkdir 创建本地目录

// LocalRename 重命名本地文件/目录

// LocalDelete 删除本地文件或目录

// SftpUploadPaths 批量及递归上传

// SftpDownloadPaths 批量及递归下载

// LockApp 主动锁定应用（定时防呆锁屏或手动锁定），擦除内存中的派生密钥

type KnownHostEntry struct {
	Index    int    `json:"index"`
	Hostname string `json:"hostname"`
	KeyType  string `json:"keyType"`
	KeyData  string `json:"keyData"`
}

var isFullscreen bool

// ThemeConfig structure for import/export
type ThemeConfig struct {
	Name                string `json:"name"`
	Background          string `json:"background"`
	Foreground          string `json:"foreground"`
	Cursor              string `json:"cursor"`
	CursorAccent        string `json:"cursorAccent"`
	Selection           string `json:"selection"`
	SelectionForeground string `json:"selectionForeground"`
	Black               string `json:"black"`
	Red                 string `json:"red"`
	Green               string `json:"green"`
	Yellow              string `json:"yellow"`
	Blue                string `json:"blue"`
	Magenta             string `json:"magenta"`
	Cyan                string `json:"cyan"`
	White               string `json:"white"`
	BrightBlack         string `json:"brightBlack"`
	BrightRed           string `json:"brightRed"`
	BrightGreen         string `json:"brightGreen"`
	BrightYellow        string `json:"brightYellow"`
	BrightBlue          string `json:"brightBlue"`
	BrightMagenta       string `json:"brightMagenta"`
	BrightCyan          string `json:"brightCyan"`
	BrightWhite         string `json:"brightWhite"`
}

type ProgressStream struct {
	SessionID  string
	TaskID     string
	FileName   string
	TotalSize  int64
	Written    int64
	LastTime   time.Time
	LastWriter int64
	App        *App
}

func (ps *ProgressStream) Write(p []byte) (int, error) {
	n := len(p)
	ps.Written += int64(n)
	now := time.Now()

	// 限制进度事件频次为每 150 毫秒一次，或满 100% 触发
	elapsed := now.Sub(ps.LastTime)
	if elapsed >= 150*time.Millisecond || ps.Written == ps.TotalSize {
		speed := float64(ps.Written-ps.LastWriter) / elapsed.Seconds() // Bytes/sec
		speedStr := formatSpeed(speed)
		percentage := int(float64(ps.Written) / float64(ps.TotalSize) * 100)
		if percentage > 100 {
			percentage = 100
		}

		runtime.EventsEmit(ps.App.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  ps.SessionID,
			"taskId":     ps.TaskID,
			"fileName":   ps.FileName,
			"total":      ps.TotalSize,
			"current":    ps.Written,
			"percentage": percentage,
			"speed":      speedStr,
			"status":     "transferring",
		})

		ps.LastTime = now
		ps.LastWriter = ps.Written
	}
	return n, nil
}

func formatSpeed(bytesPerSec float64) string {
	if bytesPerSec >= 1024*1024 {
		return fmt.Sprintf("%.2f MB/s", bytesPerSec/(1024*1024))
	} else if bytesPerSec >= 1024 {
		return fmt.Sprintf("%.2f KB/s", bytesPerSec/1024)
	}
	return fmt.Sprintf("%.2f B/s", bytesPerSec)
}

// ListLogFiles 递归列出日志目录下的所有文件

// ReadLogContent 读取日志文件内容（支持截断大文件）

// DeleteLogFile 删除日志文件

// SaveTerminalLog opens a save file dialog to let the user save the terminal log
func (a *App) SaveTerminalLog(content string, defaultName string) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Terminal Log",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "Log Files (*.log)", Pattern: "*.log"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil // User cancelled
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// SaveZmodemFile opens a save file dialog and saves the base64 encoded data to disk
func (a *App) SaveZmodemFile(filename string, base64Data string) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save ZMODEM File",
		DefaultFilename: filename,
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil // User cancelled
	}

	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("failed to decode base64: %w", err)
	}

	return os.WriteFile(path, data, 0644)
}

type ZmodemFile struct {
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	Content string `json:"content"` // base64 encoded
}

// OpenZmodemFiles opens a file dialog for selecting files to upload and returns their contents
func (a *App) OpenZmodemFiles() ([]ZmodemFile, error) {
	paths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Files for ZMODEM Upload",
	})
	if err != nil {
		return nil, err
	}

	var files []ZmodemFile
	for _, p := range paths {
		info, err := os.Stat(p)
		if err != nil {
			return nil, err
		}
		data, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		files = append(files, ZmodemFile{
			Name:    filepath.Base(p),
			Size:    info.Size(),
			Content: base64.StdEncoding.EncodeToString(data),
		})
	}

	return files, nil
}

// ShowWindow 显示并激活主窗口
func (a *App) ShowWindow() {
	if a.ctx != nil {
		runtime.WindowShow(a.ctx)
		runtime.WindowUnminimise(a.ctx)
	}
}

// HideWindow 隐藏主窗口到系统后台/托盘 (Windows 下最小化到任务栏，保证随时可唤回)
func (a *App) HideWindow() {
	if a.ctx != nil {
		if goruntime.GOOS == "windows" {
			runtime.WindowMinimise(a.ctx)
		} else {
			runtime.WindowHide(a.ctx)
		}
	}
}

// HandleSecondInstanceLaunch 处理第二个应用实例启动时传递的命令行参数并派发给前端
func (a *App) HandleSecondInstanceLaunch(args []string) {
	if a.ctx != nil && len(args) > 0 {
		runtime.EventsEmit(a.ctx, "cli-arguments", args)
	}
}

// ToggleWindowVisibility 切换主窗口显示与隐藏状态
func (a *App) ToggleWindowVisibility() {
	if a.ctx != nil {
		runtime.WindowToggleMaximise(a.ctx)
	}
}

// ToggleQuakeWindow 切换 Quake 下拉终端窗口置顶展开与隐藏
func (a *App) ToggleQuakeWindow(heightPercent int) {
	if a.ctx != nil {
		if heightPercent <= 0 || heightPercent > 100 {
			heightPercent = 50
		}
		// 显示窗口并置顶
		runtime.WindowShow(a.ctx)
		runtime.WindowSetAlwaysOnTop(a.ctx, true)
	}
}

// DisconnectAllSessions 一键断开全部活动终端连接
func (a *App) DisconnectAllSessions() error {
	return a.sshManager.CloseAll()
}

// BeforeClose is called by Wails before closing the application window.
// Returning true prevents the window from closing.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	if a.isForceQuit {
		return false
	}

	// 记录窗口当前尺寸与位置
	_ = a.SaveCurrentWindowPosition()

	settings, err := a.GetSettings()
	if err != nil {
		return false
	}

	// 如果开启了“关闭时不再询问”
	if settings.CloseDoNotAskAgain {
		// 如果禁用系统托盘或选择直接退出，则真正退出
		if settings.DisableSystemTray || settings.CloseAction == "quit" {
			return false // 直接正常退出
		}
		// "tray" 模式：保持后台运行与心跳/隧道不中断 (Windows 下最小化到任务栏，macOS 隐藏窗口)
		if goruntime.GOOS == "windows" {
			runtime.WindowMinimise(ctx)
		} else {
			runtime.WindowHide(ctx)
		}
		return true // 阻止真正退出
	}

	// 触发前端关闭确认对话框，给用户选择“最小化到后台”还是“直接退出”的机会
	runtime.EventsEmit(ctx, "app-request-close", nil)
	return true // 拦截默认关闭动作
}

// ForceQuit 强制退出应用程序（绕过关闭拦截）
func (a *App) ForceQuit() {
	a.isForceQuit = true
	_ = a.SaveCurrentWindowPosition()
	if a.sleepInhibitor != nil {
		a.sleepInhibitor.Shutdown()
	}
	_ = a.DisconnectAllSessions()
	if a.ctx != nil {
		runtime.Quit(a.ctx)
	}
	// 兜底安全退出，防止主线程未响应
	time.AfterFunc(1500*time.Millisecond, func() {
		os.Exit(0)
	})
}

// SaveCurrentWindowPosition 获取并保存当前窗口位置和尺寸
func (a *App) SaveCurrentWindowPosition() error {
	if a.ctx == nil {
		return nil
	}
	settings, err := a.GetSettings()
	if err != nil || !settings.RememberWindowPosition {
		return nil
	}

	isMax := runtime.WindowIsMaximised(a.ctx)
	x, y := runtime.WindowGetPosition(a.ctx)
	w, h := runtime.WindowGetSize(a.ctx)

	// 只有在合理尺寸范围内且非最小化状态才保存
	if w > 300 && h > 200 {
		settings.WindowWidth = w
		settings.WindowHeight = h
		if !isMax {
			settings.WindowX = x
			settings.WindowY = y
		}
		settings.WindowIsMaximised = isMax
		return a.SaveSettings(settings)
	}
	return nil
}

// SaveWindowPosition 前端防抖调用更新窗口坐标与尺寸
func (a *App) SaveWindowPosition(x, y, w, h int, isMaximised bool) error {
	settings, err := a.GetSettings()
	if err != nil || !settings.RememberWindowPosition {
		return nil
	}
	if w > 300 && h > 200 {
		settings.WindowWidth = w
		settings.WindowHeight = h
		if !isMaximised {
			settings.WindowX = x
			settings.WindowY = y
		}
		settings.WindowIsMaximised = isMaximised
		return a.SaveSettings(settings)
	}
	return nil
}

// GetSystemProxyInfo 获取系统代理探测信息 (Stage 2)
func (a *App) GetSystemProxyInfo() core.SystemProxyInfo {
	return core.DetectSystemProxy()
}

// SetAutoStart 设置是否开机自启 (Stage 2)
func (a *App) SetAutoStart(enable bool) error {
	if a.autoStartManager == nil {
		return nil
	}
	err := a.autoStartManager.SetEnabled(enable)
	if err == nil {
		settings, sErr := a.GetSettings()
		if sErr == nil {
			settings.AutoStartAtBoot = enable
			_ = a.SaveSettings(settings)
		}
	}
	return err
}

// GetAutoStartStatus 获取开机自启状态 (Stage 2)
func (a *App) GetAutoStartStatus() bool {
	if a.autoStartManager == nil {
		return false
	}
	return a.autoStartManager.IsEnabled()
}

// SetPreventSleep 设置是否阻止系统休眠 (Stage 2)
func (a *App) SetPreventSleep(enable bool) error {
	if a.sleepInhibitor == nil {
		return nil
	}
	var err error
	if enable {
		err = a.sleepInhibitor.Enable()
	} else {
		err = a.sleepInhibitor.Disable()
	}
	if err == nil {
		settings, sErr := a.GetSettings()
		if sErr == nil {
			settings.PreventSleep = enable
			_ = a.SaveSettings(settings)
		}
	}
	return err
}

// GetPreventSleepStatus 获取阻止休眠状态 (Stage 2)
func (a *App) GetPreventSleepStatus() bool {
	if a.sleepInhibitor == nil {
		return false
	}
	return a.sleepInhibitor.IsActive()
}

// ShowMainWindow 激活并显示主窗口 (处理从托盘、Dock 图标或第二次启动唤醒)
func (a *App) ShowMainWindow() {
	if a.ctx != nil {
		runtime.WindowShow(a.ctx)
		runtime.WindowUnminimise(a.ctx)
		runtime.Show(a.ctx)
	}
}

// HideMainWindow 隐藏主窗口到系统托盘后台
func (a *App) HideMainWindow() {
	if a.ctx != nil {
		runtime.WindowHide(a.ctx)
	}
}



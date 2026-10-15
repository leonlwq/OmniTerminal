package models

import ()

// StatusBarConfig 状态栏显示配置
type StatusBarConfig struct {
	ShowConnectionState bool `json:"showConnectionState"`
	ShowUptime          bool `json:"showUptime"`
	ShowTerminalSize    bool `json:"showTerminalSize"`
	ShowProtocol        bool `json:"showProtocol"`
	ShowEncoding        bool `json:"showEncoding"`
	ShowSessionType     bool `json:"showSessionType"`
	ShowTraffic         bool `json:"showTraffic"`
}

type ExpectInteractive struct {
	Expect string `json:"expect"`
	Send   string `json:"send"`
}

type HighlightRule struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name,omitempty"`
	Pattern     string `json:"pattern"`
	Color       string `json:"color"`              // 前景色 hex (如 "#f14c4c")
	BgColor     string `json:"bgColor,omitempty"`  // 背景色 hex (如 "#b91c1c")
	Category    string `json:"category,omitempty"` // "severity" | "network" | "timestamp" | "path" | "http" | "custom"
	Enabled     bool   `json:"enabled"`
	IgnoreCase  bool   `json:"ignoreCase"`
	ShowInRuler bool   `json:"showInRuler"`        // 是否在右侧 Overview Ruler 显示标尺指示点
}

type KeyMapping struct {
	KeyCombo   string `json:"keyCombo"` // e.g. "ctrl+shift+v", "F5"
	Action     string `json:"action"`   // "paste", "send_string", "none"
	ActionData string `json:"actionData"` // The string to send if action is "send_string"
}

// CustomThemeConfig 自定义 ANSI 16 色与专色调色方案
type CustomThemeConfig struct {
	Name                string `json:"name"`
	Background          string `json:"background"`
	Foreground          string `json:"foreground"`
	Cursor              string `json:"cursor"`
	CursorAccent        string `json:"cursorAccent,omitempty"`
	SelectionBackground string `json:"selectionBackground,omitempty"`
	SelectionForeground string `json:"selectionForeground,omitempty"`
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

// AppSettings 应用设置
type AppSettings struct {
	ThemeName          string              `json:"themeName"`
	Language           string              `json:"language"` // 界面显示语言: "zh-CN" | "en-US" | "ja-JP" | "ko-KR"
	CustomThemes       []CustomThemeConfig `json:"customThemes"` // 用户自定义主题库
	FontFamily         string              `json:"fontFamily"`
	NonAsciiFontFamily string              `json:"nonAsciiFontFamily"`
	FontSize           int                 `json:"fontSize"`
	EnableLigatures    bool                `json:"enableLigatures"` // 启用代码连字特性 (Fira Code, JetBrains Mono 等)
	HasMasterPassword  bool                `json:"hasMasterPassword"`
	MasterPasswordSalt string              `json:"masterPasswordSalt"`
	ValidationBlock    string              `json:"validationBlock"`
	QuickCommandSets   []QuickCommandSet   `json:"quickCommandSets"`
	ActiveCommandSetID string              `json:"activeCommandSetID"`
	Macros             []AppMacro          `json:"macros"`
	StatusBarConfig    StatusBarConfig     `json:"statusBarConfig"`
	FavoriteSessionIds []string            `json:"favoriteSessionIds"`

	ScrollbackLines    int               `json:"scrollbackLines"`
	CopyOnSelect       bool              `json:"copyOnSelect"`
	CursorStyle        string            `json:"cursorStyle"` // "block" | "underline" | "bar"
	CursorBlink        bool              `json:"cursorBlink"`
	EnableBell         bool              `json:"enableBell"`
	TerminalOpacity    float64           `json:"terminalOpacity"`
	WindowOpacity      float64           `json:"windowOpacity"`
	EnableBlur         bool              `json:"enableBlur"`
	LineHeight         float64           `json:"lineHeight"`      // 终端行高比例 (如 1.2)
	TerminalPadding    int               `json:"terminalPadding"` // 终端视口内边距 (如 8px)
	BackgroundBlur     int               `json:"backgroundBlur"`  // 背景模糊度 (如 0px)
	BackgroundFit      string            `json:"backgroundFit"`   // 背景适配模式: "cover" | "contain" | "tile"
	AutoLockTimeoutMinutes int           `json:"autoLockTimeoutMinutes"`

	// 字体排版精细控制 (Phase 7 P0: 终端外观增强)
	FontWeight           string  `json:"fontWeight"`           // 字重: "normal" | "bold" | "100"~"900" (默认 "normal")
	FontWeightBold       string  `json:"fontWeightBold"`       // 粗体字重: (默认 "bold")
	LetterSpacing        float64 `json:"letterSpacing"`        // 字间距 px (默认 0, 范围 -5~+10)
	MinimumContrastRatio float64 `json:"minimumContrastRatio"` // 最小对比度 (1~21, 默认 1 不干预)

	// 全局默认背景壁纸
	GlobalBackgroundImage   string  `json:"globalBackgroundImage"`   // 全局背景图 URL 或 data:image
	GlobalBackgroundOpacity float64 `json:"globalBackgroundOpacity"` // 全局背景图不透明度 (默认 0.3)
	GlobalBackgroundBlur    int     `json:"globalBackgroundBlur"`    // 全局背景图模糊度 px (默认 0)
	GlobalBackgroundFit     string  `json:"globalBackgroundFit"`     // "cover" | "contain" | "tile"

	// Phase 2 (P1): 终端进阶外观与符号控制
	CustomGlyphs               bool   `json:"customGlyphs"`               // 矢量绘制 Box/Powerline 符号 (默认 true)
	UnicodeVersion             string `json:"unicodeVersion"`             // Unicode 宽字符规范: "11" (现代/CJK) | "6" (兼容模式)
	DrawBoldTextInBrightColors bool   `json:"drawBoldTextInBrightColors"` // 粗体文本以 ANSI 亮色渲染 (默认 true)
	CursorColor                string `json:"cursorColor"`                // 独立光标颜色 (十六进制，留空跟随主题)
	CursorAccentColor          string `json:"cursorAccentColor"`          // 光标内文字反色 (十六进制，留空跟随主题)
	SelectionBackground        string `json:"selectionBackground"`        // 选区背景色 (留空跟随主题)
	SelectionForeground        string `json:"selectionForeground"`        // 选区文字前景色 (留空跟随主题)

	// Phase 3 (P2): 渲染引擎与高级显示策略
	RendererType   string `json:"rendererType"`   // "auto" | "webgl" | "canvas" | "dom" (默认 "auto")
	FontSmoothing  string `json:"fontSmoothing"`  // "antialiased" | "subpixel-antialiased" | "none" (默认 "antialiased")

	// Phase 8 (25.4.1): 终端内联图像渲染协议 (Sixel & iTerm2)
	EnableTerminalImages bool `json:"enableTerminalImages"` // 启用内联图像渲染 (默认 true)
	ImageStorageLimitMB  int  `json:"imageStorageLimitMB"`  // 图像存储上限 (MB, 默认 128)

	// Terminal Interaction Customizations
	EnableHighlightRules bool            `json:"enableHighlightRules"` // 是否启用智能终端高亮 (默认 true)
	HighlightRules       []HighlightRule `json:"highlightRules"`
	KeyMappings        []KeyMapping      `json:"keyMappings"`
	RightClickAction   string            `json:"rightClickAction"` // "contextMenu" | "paste" | "none"
	DoubleClickAction  string            `json:"doubleClickAction"` // "copy" | "selectWord" | "none"

	// Phase 1: 安全防护与高级交互
	EnableSafePaste        bool                   `json:"enableSafePaste"`
	EnableDangerousGuard   bool                   `json:"enableDangerousGuard"`
	DangerousRules         []DangerousCommandRule `json:"dangerousRules"`
	UseAltAsMeta           bool                   `json:"useAltAsMeta"`
	WordSeparators         string                 `json:"wordSeparators"`
	OpenLinksOnClick       bool                   `json:"openLinksOnClick"`
	DefaultSessionTemplate map[string]interface{} `json:"defaultSessionTemplate"`
	CharSendDelayMs        int                    `json:"charSendDelayMs"` // 字符间延时 (ms, 0~100)
	LineSendDelayMs        int                    `json:"lineSendDelayMs"` // 行间延时 (ms, 0~2000)

	// Phase 3: 文件传输进阶与工作区记忆
	ExternalEditorPath   string `json:"externalEditorPath"`   // 外部编辑器程序路径 (如 code, subl 或完整路径)
	AutoRestoreWorkspace bool   `json:"autoRestoreWorkspace"` // 启动时是否自动恢复工作区状态
	FileConflictStrategy string `json:"fileConflictStrategy"` // 同名文件冲突策略: "ask" | "overwrite" | "skip" | "resume"

	// Phase 4 / 19.7: 操作系统集成与原生桌面体验
	MinimizeToTrayOnClose bool   `json:"minimizeToTrayOnClose"` // 关闭主窗口时最小化到系统托盘
	EnableQuakeMode       bool   `json:"enableQuakeMode"`       // 启用全局下拉终端 (Quake Mode)
	QuakeHotkey           string `json:"quakeHotkey"`           // Quake 唤醒热键 (如 "Ctrl+`", "F12")
	QuakeHeightPercent    int    `json:"quakeHeightPercent"`    // Quake 下拉窗口高度占比 (如 50)

	// 系统配置扩展 (桌面生命周期与防误触)
	RememberWindowPosition   bool   `json:"rememberWindowPosition"`   // 记录窗口打开位置与大小 (默认 true)
	WindowWidth              int    `json:"windowWidth"`              // 窗口宽度
	WindowHeight             int    `json:"windowHeight"`             // 窗口高度
	WindowX                  int    `json:"windowX"`                  // 窗口屏幕横坐标
	WindowY                  int    `json:"windowY"`                  // 窗口屏幕纵坐标
	WindowIsMaximised        bool   `json:"windowIsMaximised"`        // 是否最大化
	CloseAction              string `json:"closeAction"`              // 关闭主窗口操作: "tray" (最小化/后台) | "quit" (直接退出)
	CloseDoNotAskAgain       bool   `json:"closeDoNotAskAgain"`       // 关闭时不再询问 (直接按 closeAction 执行)
	ConfirmCloseConnectedTab bool   `json:"confirmCloseConnectedTab"` // 关闭处于连接中的终端标签二次确认 (默认 true)
	ConfirmCloseAnyTab       bool   `json:"confirmCloseAnyTab"`       // 关闭任何标签二次确认 (默认 false)

	// 系统与硬件级高级集成 (Stage 2)
	PreventSleep      bool `json:"preventSleep"`      // 阻止系统自动休眠 (防止长连接/传输被掐断)
	UseSystemProxy    bool `json:"useSystemProxy"`    // 自动继承并使用系统代理 (HTTP/SOCKS5)
	AutoStartAtBoot   bool `json:"autoStartAtBoot"`   // 开机时自动启动软件
	DisableSystemTray bool `json:"disableSystemTray"` // 禁用系统托盘 (点击关闭直接退出)

	// Phase 5D: AI Copilot 与端到端加密云同步
	AIConfig        AIConfig        `json:"aiConfig"`
	CloudSyncConfig CloudSyncConfig `json:"cloudSyncConfig"`

	// Phase 5E: 全界面双色彩系统与可拖拽停靠面板架构
	AppThemeMode string            `json:"appThemeMode"` // "dark" | "light" | "auto"
	DockLayout   string            `json:"dockLayout"`   // "standard" | "dockable"
	DockPanels   map[string]string `json:"dockPanels"`   // panelId -> "left" | "right" | "bottom" | "floating"

	// Phase 6: 竞品对标与高阶交互
	ShowCommandDuration bool `json:"showCommandDuration"` // 显示命令执行耗时标注
	HighlightHyperlinks bool `json:"highlightHyperlinks"` // 自动识别并高亮终端超链接

	// Phase 7 / 24.1: 现代化基础功能缺口
	Osc52Mode               string            `json:"osc52Mode"`               // "disabled" | "write" | "readwrite"
	Osc52MaxBytes           int               `json:"osc52MaxBytes"`           // 默认 102400 (100KB)
	Osc52ShowToast          bool              `json:"osc52ShowToast"`          // 默认 true
	EnableSshConnectionPool bool              `json:"enableSshConnectionPool"` // 启用 SSH 连接复用与智能连接池
	SshPoolIdleTimeoutSec   int               `json:"sshPoolIdleTimeoutSec"`   // 连接池空闲超时 (秒, 默认 300)
	SshPoolMaxSize          int               `json:"sshPoolMaxSize"`          // 连接池最大连接数 (默认 50)
	CustomKeybindings       map[string]string `json:"customKeybindings"`       // 用户自定义快捷键映射 (actionId -> keyCombo)
	EnableStructuredOutput  bool              `json:"enableStructuredOutput"`  // 智能输出语义化解析 (默认 false)

	// Phase 7 / 24.2: 界面高级功能
	CommandBlockMode         string `json:"commandBlockMode"`         // "off" | "blocks" | "auto"
	QuakeAnimationDurationMs int    `json:"quakeAnimationDurationMs"` // Quake 下拉动画时长 (ms, 默认 250)
	QuakeAutoCommand         string `json:"quakeAutoCommand"`         // Quake 唤起后自动执行的命令
	MonacoFontSize           int    `json:"monacoFontSize"`           // 内置 Monaco 编辑器字号 (默认 13)
	MonacoTabSize            int    `json:"monacoTabSize"`            // Tab 缩进空格 (默认 2)
	MonacoWordWrap           bool   `json:"monacoWordWrap"`           // 是否自动折行 (默认 true)

	// Phase 8 (25.4.3): 终端视口 Mini 服务器硬件遥测小部件
	EnableMiniTelemetry      bool `json:"enableMiniTelemetry"`      // 终端右上角显示服务器硬件遥测胶囊 (默认 true)
	MiniTelemetryIntervalSec int  `json:"miniTelemetryIntervalSec"` // 硬件遥测自动采样周期秒 (默认 3)
}

// AIConfig AI Copilot 与大模型配置
type AIConfig struct {
	Provider     string  `json:"provider"`     // "openai" | "deepseek" | "gemini" | "ollama" | "custom"
	ApiKey       string  `json:"apiKey"`
	BaseURL      string  `json:"baseUrl"`
	Model        string  `json:"model"`        // e.g. "deepseek-chat", "gpt-4o", "gemini-1.5-pro", "llama3"
	Temperature  float64 `json:"temperature"`  // e.g. 0.2
	MaxTokens    int     `json:"maxTokens"`    // e.g. 2048
	SystemPrompt string  `json:"systemPrompt"`
}

// CloudSyncConfig 端到端加密云同步配置
type CloudSyncConfig struct {
	Provider                string `json:"provider"`                // "webdav" | "github_gist" | "gitee_gist" | "s3"
	ServerURL               string `json:"serverUrl"`               // WebDAV URL or S3 Endpoint
	Username                string `json:"username"`
	Password                string `json:"password"`
	RemotePath              string `json:"remotePath"`              // e.g. "/OmniTerminal/backup.omnisync"
	GistToken               string `json:"gistToken,omitempty"`     // GitHub / Gitee Personal Access Token
	GistID                  string `json:"gistId,omitempty"`        // Gist ID (if empty, auto creates)
	AutoSyncOnStartup       bool   `json:"autoSyncOnStartup"`       // 启动时自动从云端拉取同步
	S3Bucket                string `json:"s3Bucket,omitempty"`
	S3Region                string `json:"s3Region,omitempty"`
	S3AccessKey             string `json:"s3AccessKey,omitempty"`
	S3SecretKey             string `json:"s3SecretKey,omitempty"`
	AutoSyncIntervalMinutes int    `json:"autoSyncIntervalMinutes"` // 0 禁用, 30, 60 等
	LastSyncTime            string `json:"lastSyncTime"`
}

// AIChatMessage 对话消息
type AIChatMessage struct {
	Role    string `json:"role"` // "system" | "user" | "assistant"
	Content string `json:"content"`
}

// AIChatResponse AI 生成与诊断结构化响应
type AIChatResponse struct {
	Command     string   `json:"command"`               // 推荐执行的 Shell 命令 (可单行或多行)
	Explanation string   `json:"explanation"`           // 命令参数与意图分步解释
	RiskLevel   string   `json:"riskLevel"`             // "safe" | "caution" | "danger"
	Suggestions []string `json:"suggestions,omitempty"` // 进阶提示与备选方案
	FullText    string   `json:"fullText"`              // 原始大模型回复文本
}

type DangerousCommandRule struct {
	Pattern string `json:"pattern"`
	Desc    string `json:"desc"`
	Enabled bool   `json:"enabled"`
}

// WorkspaceTabState 单个标签页的状态记录
type WorkspaceTabState struct {
	SessionID  string `json:"sessionId"`
	CustomName string `json:"customName"`
	IsLocked   bool   `json:"isLocked"`
}

// WorkspaceState 整个应用的工作区持久化状态
type WorkspaceState struct {
	Tabs           []WorkspaceTabState `json:"tabs"`
	ActiveTabID    string              `json:"activeTabId"`
	SplitMode      string              `json:"splitMode"` // "none" | "vertical" | "horizontal"
	SecondaryTabID string              `json:"secondaryTabId"`
	LastSavedAt    string              `json:"lastSavedAt"`
}



type QuickCommand struct {
	Label string `json:"label"`
	Cmd   string `json:"cmd"`
}

type QuickCommandSet struct {
	ID       string         `json:"id"`
	ParentID string         `json:"parentId"`
	IsFolder bool           `json:"isFolder"`
	SetName  string         `json:"setName"`
	Commands []QuickCommand `json:"commands"`
}

// ProgressStream 进度包装器
type SSHTunnel struct {
	Type       string `json:"type"`       // "local" | "remote" | "dynamic"
	LocalAddr  string `json:"localAddr"`  // 例如 "127.0.0.1:8080"
	RemoteAddr string `json:"remoteAddr"` // 例如 "127.0.0.1:3306"
}

type MacroAction struct {
	TimeOffset int    `json:"timeOffset"` // 相对宏开始的时间偏置（毫秒）
	Data       string `json:"data"`       // 输入的 Base64 格式字符
}

type AppMacro struct {
	ID      string        `json:"id"`
	Name    string        `json:"name"`
	Actions []MacroAction `json:"actions"`
}

type AuthProfile struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	User       string `json:"user"`
	Password   string `json:"password"`
	PrivateKey string `json:"privateKey"`
}

type IdentityKey struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	PrivateKey string `json:"privateKey"`
	PublicKey  string `json:"publicKey"`
}

type TriggerRule struct {
	Expect  string `json:"expect"`
	Send    string `json:"send"`
	IsRegex bool   `json:"isRegex"`
}


// LogConfig 日志配置
type LogConfig struct {
	Enable       bool   `json:"enable"`
	Format       string `json:"format"`
	PathTemplate string `json:"pathTemplate"`
	MaxBytes     int64  `json:"maxBytes"`
}

// SerialConfig 串口配置
type SerialConfig struct {
	Port        string `json:"port"`        // 串口设备 (例如 "/dev/tty.usbserial-10", "COM3")
	BaudRate    int    `json:"baudRate"`    // 波特率 (例如 9600, 115200)
	DataBits    int    `json:"dataBits"`    // 数据位 (5, 6, 7, 8)
	StopBits    string `json:"stopBits"`    // 停止位 ("1", "1.5", "2")
	Parity      string `json:"parity"`      // 校验位 ("none", "odd", "even", "mark", "space")
	FlowControl string `json:"flowControl"` // 流控 ("none", "rts/cts", "xon/xoff", "dtr/dsr")
	DTR         bool   `json:"dtr"`         // DTR 电平
	RTS         bool   `json:"rts"`         // RTS 电平
}

// WSLDistroInfo WSL 发行版信息
type WSLDistroInfo struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"isDefault"`
	Version   int    `json:"version"`
}

// SystemShellInfo 系统 Shell 信息
type SystemShellInfo struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// TunnelStatusInfo 端口转发隧道状态与监控信息
type TunnelStatusInfo struct {
	ID          string `json:"id"`
	SessionID   string `json:"sessionId"`
	SessionName string `json:"sessionName"`
	Type        string `json:"type"`       // "local" | "remote" | "dynamic"
	LocalAddr   string `json:"localAddr"`  // 如 "127.0.0.1:8080"
	RemoteAddr  string `json:"remoteAddr"` // 如 "127.0.0.1:3306"
	Status      string `json:"status"`      // "active" | "stopped" | "error"
	ActiveConns int    `json:"activeConns"` // 当前活动连接数
	CreatedAt   string `json:"createdAt"`
}

// DirDiffItem 单个文件差异对比项
type DirDiffItem struct {
	RelativePath string `json:"relativePath"`
	Name         string `json:"name"`
	IsDir        bool   `json:"isDir"`
	Status       string `json:"status"` // "only_local" | "only_remote" | "modified" | "same"
	LocalSize    int64  `json:"localSize"`
	RemoteSize   int64  `json:"remoteSize"`
	LocalModTime string `json:"localModTime"`
	RemoteModTime string `json:"remoteModTime"`
}

// DirDiffResult 目录对比整体结果
type DirDiffResult struct {
	TotalFiles  int           `json:"totalFiles"`
	DiffCount   int           `json:"diffCount"`
	Items       []DirDiffItem `json:"items"`
}

// HostStatusResult 主机连通性与延迟探测结果
type HostStatusResult struct {
	SessionID string `json:"sessionId"`
	Online    bool   `json:"online"`
	LatencyMs int64  `json:"latencyMs"`
	CheckedAt string `json:"checkedAt"`
	Error     string `json:"error"`
}

// HostResourceMetrics 远程主机实时性能监控指标
type HostResourceMetrics struct {
	SessionID     string  `json:"sessionId"`
	CPUUsage      float64 `json:"cpuUsage"`      // CPU 总使用率 (0 ~ 100%)
	MemUsage      float64 `json:"memUsage"`      // 内存使用率 (0 ~ 100%)
	MemTotalMB    int64   `json:"memTotalMB"`    // 内存总量 (MB)
	MemUsedMB     int64   `json:"memUsedMB"`     // 已用内存 (MB)
	DiskUsage     float64 `json:"diskUsage"`     // 根分区磁盘使用率 (0 ~ 100%)
	DiskTotalGB   float64 `json:"diskTotalGB"`   // 磁盘总量 (GB)
	DiskUsedGB    float64 `json:"diskUsedGB"`    // 磁盘已用 (GB)
	NetRxRateKBps float64 `json:"netRxRateKBps"` // 实时下行速率 (KB/s)
	NetTxRateKBps float64 `json:"netTxRateKBps"` // 实时上行速率 (KB/s)
	UptimeStr     string  `json:"uptimeStr"`     // 系统运行时间
	SampledAt     string  `json:"sampledAt"`     // 采样时间点
	Error         string  `json:"error,omitempty"`
}

// RemoteProcessItem 远程进程信息项
type RemoteProcessItem struct {
	PID     int     `json:"pid"`
	User    string  `json:"user"`
	CPU     float64 `json:"cpu"`
	Mem     float64 `json:"mem"`
	Status  string  `json:"status"`
	Time    string  `json:"time"`
	Command string  `json:"command"`
}

// RemoteServiceItem 远程 Systemd 服务项
type RemoteServiceItem struct {
	Unit        string `json:"unit"`
	Load        string `json:"load"`
	Active      string `json:"active"`
	Sub         string `json:"sub"`
	Description string `json:"description"`
}

// RemotePortItem 远程监听端口项
type RemotePortItem struct {
	Protocol  string `json:"protocol"`  // tcp, udp, tcp6, udp6
	LocalAddr string `json:"localAddr"` // 0.0.0.0:22, *:80
	Process   string `json:"process"`   // 进程名 (如 sshd, nginx)
	PID       int    `json:"pid"`
	State     string `json:"state"`     // LISTEN
}

// CommandHistoryEntry 跨会话命令历史记录
type CommandHistoryEntry struct {
	ID          string `json:"id"`
	SessionID   string `json:"sessionId"`
	SessionName string `json:"sessionName"`
	Host        string `json:"host"`
	Command     string `json:"command"`
	ExitCode    int    `json:"exitCode"`
	Timestamp   string `json:"timestamp"`
}

// ActiveTunnelInfo 活跃端口转发运行时状态
type ActiveTunnelInfo struct {
	ID          string `json:"id"`
	SessionID   string `json:"sessionId"`
	SessionName string `json:"sessionName"`
	Type        string `json:"type"`        // "local" | "remote" | "dynamic"
	LocalHost   string `json:"localHost"`   // e.g. "127.0.0.1"
	LocalPort   int    `json:"localPort"`   // e.g. 8080
	RemoteHost  string `json:"remoteHost"`  // e.g. "10.0.0.5"
	RemotePort  int    `json:"remotePort"`  // e.g. 80
	Status      string `json:"status"`      // "active" | "stopped" | "error"
	BytesRx     int64  `json:"bytesRx"`     // 接收流量
	BytesTx     int64  `json:"bytesTx"`     // 发送流量
	StartTime   string `json:"startTime"`
	Error       string `json:"error,omitempty"`
}

// SSHPoolStat SSH 连接池运行状态
type SSHPoolStat struct {
	Key                 string         `json:"key"`                 // user@host:port
	Host                string         `json:"host"`
	Port                int            `json:"port"`
	User                string         `json:"user"`
	RefCount            int            `json:"refCount"`            // 当前复用该连接的活动会话数
	ActiveChannelsCount int            `json:"activeChannelsCount"` // 活跃复用通道总数
	ChannelsBreakdown   map[string]int `json:"channelsBreakdown"`   // 通道分布
	IdleSeconds         int            `json:"idleSeconds"`         // 闲置倒计时秒数 (若引用计数为0)
	ActiveSince         string         `json:"activeSince"`         // 建立时间
	MaxSessionsReached  bool           `json:"maxSessionsReached"`  // 是否达远端上限并触发了溢出分流
}

// MultiplexChannelDetail 单个复用通道详情
type MultiplexChannelDetail struct {
	Type        string `json:"type"`        // "pty" (终端PTY), "sftp" (SFTP引擎), "telemetry" (零感知遥测), "tunnel" (端口转发)
	Name        string `json:"name"`        // 会话名称或通道标识
	SessionID   string `json:"sessionId"`   // 所属会话ID
	Active      bool   `json:"active"`      // 是否处于活动状态
	Description string `json:"description"` // 通道说明
}

// SessionMultiplexInfo 会话的底层单通道多路复用全景详情
type SessionMultiplexInfo struct {
	SessionID           string                   `json:"sessionId"`
	PoolKey             string                   `json:"poolKey"`
	IsPooled            bool                     `json:"isPooled"`
	Host                string                   `json:"host"`
	Port                int                      `json:"port"`
	User                string                   `json:"user"`
	PhysicalConnections int                      `json:"physicalConnections"` // 共享物理连接数 (通常为 1)
	ActiveChannelsCount int                      `json:"activeChannelsCount"` // 当前底层物理连接复用的活跃通道总数
	ChannelsBreakdown   map[string]int           `json:"channelsBreakdown"`   // 每类通道数量，例如 pty: 2, sftp: 1, telemetry: 1, tunnel: 0
	ChannelDetails      []MultiplexChannelDetail `json:"channelDetails"`      // 详细通道列表
	StealthAuditNote    string                   `json:"stealthAuditNote"`    // 零感知审计特性说明
	EstimatedRttSavedMs int                      `json:"estimatedRttSavedMs"` // 预估为该主机累计节省的 TCP+SSH 握手开销毫秒数
	CreatedAt           string                   `json:"createdAt"`
}


// FolderSizeProgress SFTP 文件夹大小异步统计进度
type FolderSizeProgress struct {
	Path      string `json:"path"`
	TotalSize int64  `json:"totalSize"`
	FileCount int64  `json:"fileCount"`
	DirCount  int64  `json:"dirCount"`
	Done      bool   `json:"done"`
	Error     string `json:"error,omitempty"`
}

// ContainerInfo Docker 容器信息
type ContainerInfo struct {
	ID        string `json:"id"`
	Names     string `json:"names"`
	Image     string `json:"image"`
	Command   string `json:"command"`
	CreatedAt string `json:"createdAt"`
	Status    string `json:"status"`
	State     string `json:"state"` // running, exited, paused...
	Ports     string `json:"ports"`
}

// PodInfo Kubernetes Pod 信息
type PodInfo struct {
	Name       string   `json:"name"`
	Namespace  string   `json:"namespace"`
	Status     string   `json:"status"` // Running, Pending, CrashLoopBackOff...
	Ready      string   `json:"ready"`  // e.g. "1/1"
	Restarts   int      `json:"restarts"`
	Age        string   `json:"age"`
	IP         string   `json:"ip"`
	Node       string   `json:"node"`
	Containers []string `json:"containers"`
}

// TopologyNode 网络拓扑节点
type TopologyNode struct {
	ID                 string `json:"id"`
	Label              string `json:"label"`
	Host               string `json:"host"`
	Port               int    `json:"port"`
	User               string `json:"user"`
	Type               string `json:"type"`   // "local" | "jumphost" | "target" | "service"
	Status             string `json:"status"` // "connected" | "disconnected" | "error"
	Uptime             string `json:"uptime"`
	ActiveTunnelsCount int    `json:"activeTunnelsCount"`
	RttMs              int64  `json:"rttMs"`
	ErrorMessage       string `json:"errorMessage,omitempty"`
}

// TopologyEdge 网络拓扑边
type TopologyEdge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"`             // "direct" | "jump_host" | "cascade" | "tunnel"
	Label  string `json:"label"`
	Status string `json:"status,omitempty"` // "healthy" | "broken" | "warning"
	RttMs  int64  `json:"rttMs,omitempty"`
}

// TopologyTunnel 拓扑中的活动隧道
type TopologyTunnel struct {
	SessionID  string `json:"sessionId"`
	Type       string `json:"type"` // "LOCAL" | "REMOTE" | "DYNAMIC"
	LocalAddr  string `json:"localAddr"`
	RemoteAddr string `json:"remoteAddr"`
	Status     string `json:"status"`
}

// HopDiagnosisDetail 单跳链路诊断明细
type HopDiagnosisDetail struct {
	HopIndex    int    `json:"hopIndex"`
	Name        string `json:"name"`
	FromAddr    string `json:"fromAddr"`
	ToAddr      string `json:"toAddr"`
	RttMs       int64  `json:"rttMs"`
	Status      string `json:"status"` // "healthy" | "broken" | "timeout"
	ErrorDetail string `json:"errorDetail,omitempty"`
}

// ReachabilityDiagnosisResult 网络链路全景诊断结论
type ReachabilityDiagnosisResult struct {
	Target      string               `json:"target"`
	Healthy     bool                 `json:"healthy"`
	TotalRttMs  int64                `json:"totalRttMs"`
	Hops        []HopDiagnosisDetail `json:"hops"`
	Conclusion  string               `json:"conclusion"`
	Suggestion  string               `json:"suggestion"`
	DiagnosedAt string               `json:"diagnosedAt"`
}

// NetworkTopologyData 完整网络拓扑链路数据集
type NetworkTopologyData struct {
	Nodes   []TopologyNode   `json:"nodes"`
	Edges   []TopologyEdge   `json:"edges"`
	Tunnels []TopologyTunnel `json:"tunnels"`
}

// CommandDiffResult 多主机批量命令执行结果
type CommandDiffResult struct {
	SessionID  string `json:"sessionId"`
	HostName   string `json:"hostName"`
	Output     string `json:"output"`
	ExitCode   int    `json:"exitCode"`
	DurationMs int64  `json:"durationMs"`
	Error      string `json:"error,omitempty"`
}

// SftpFileDetail 远程文件详细内容（带修改时间用于乐观并发锁检测）
type SftpFileDetail struct {
	Content string `json:"content"`
	ModTime int64  `json:"modTime"` // Unix 毫秒时间戳
	Size    int64  `json:"size"`
	IsImage bool   `json:"isImage"`
}

// GitDiffResult Git 文件 Diff 结果
type GitDiffResult struct {
	Original string `json:"original"`
	Modified string `json:"modified"`
	DiffText string `json:"diffText"`
	Path     string `json:"path"`
}

// GitFileStatus 远端 Git 仓库文件变更状态
type GitFileStatus struct {
	Path      string `json:"path"`
	Status    string `json:"status"` // "modified" | "added" | "deleted" | "untracked" | "renamed"
	Staged    bool   `json:"staged"`
	Untracked bool   `json:"untracked"`
}

// TOTPEntry 内置 TOTP 令牌凭据
type TOTPEntry struct {
	ID          string `json:"id"`
	Label       string `json:"label"`       // 标签/备注
	Issuer      string `json:"issuer"`      // 签发机构 (e.g. AWS, JumpServer, GitHub)
	AccountName string `json:"accountName"` // 账号名 (e.g. admin@company.com)
	SecretEnc   string `json:"secretEnc"`   // AES-256-GCM 密文或安全编码
	Algorithm   string `json:"algorithm"`   // SHA1, SHA256, SHA512
	Digits      int    `json:"digits"`      // 6 或 8
	Period      int    `json:"period"`      // 默认 30s
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

// TOTPCodeResult 生成的动态码结果
type TOTPCodeResult struct {
	EntryID       string `json:"entryId"`
	Label         string `json:"label"`
	Code          string `json:"code"`
	RemainingSecs int    `json:"remainingSecs"`
	Period        int    `json:"period"`
}

// InspectionCheck 巡检指标配置
type InspectionCheck struct {
	ID          string `json:"id"`
	Category    string `json:"category"` // system, resources, security, services, disk, kernel
	Name        string `json:"name"`
	Command     string `json:"command"`
	Description string `json:"description"`
	TimeoutSec  int    `json:"timeoutSec"`
	Enabled     bool   `json:"enabled"`
}

// InspectionItemResult 单个检查项执行结果
type InspectionItemResult struct {
	CheckID     string `json:"checkId"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Command     string `json:"command"`
	Output      string `json:"output"`
	ExitCode    int    `json:"exitCode"`
	DurationMs  int64  `json:"durationMs"`
	HasIssue    bool   `json:"hasIssue"`
	IssueDetail string `json:"issueDetail,omitempty"`
}

// InspectionHostResult 单台主机的巡检汇总
type InspectionHostResult struct {
	SessionID   string                          `json:"sessionId"`
	HostName    string                          `json:"hostName"`
	HostIP      string                          `json:"hostIp"`
	Status      string                          `json:"status"` // "success" | "warning" | "error" | "failed"
	ExecutionMs int64                           `json:"executionMs"`
	CheckItems  map[string]InspectionItemResult `json:"checkItems"`
	IssueCount  int                             `json:"issueCount"`
	Error       string                          `json:"error,omitempty"`
}

// InspectionReport 完整巡检报告
type InspectionReport struct {
	ID          string                           `json:"id"`
	Title       string                           `json:"title"`
	CreatedAt   int64                            `json:"createdAt"`
	HostCount   int                              `json:"hostCount"`
	IssueCount  int                              `json:"issueCount"`
	DurationMs  int64                            `json:"durationMs"`
	HostResults map[string]*InspectionHostResult `json:"hostResults"`
	Summary     string                           `json:"summary"`
}

// ShareSessionConfig 终端共享配置
type ShareSessionConfig struct {
	SessionID  string `json:"sessionId"`
	Mode       string `json:"mode"`       // "readonly" | "readwrite"
	Password   string `json:"password"`   // 访问密码 (可选)
	MaxViewers int    `json:"maxViewers"` // 最大同时观看人数 (默认 5)
	TimeoutMin int    `json:"timeoutMin"` // 共享超时时间 (分钟, 默认 30)
}

// ShareSessionStatus 终端共享状态
type ShareSessionStatus struct {
	SessionID     string `json:"sessionId"`
	IsSharing     bool   `json:"isSharing"`
	Token         string `json:"token"`
	Mode          string `json:"mode"`
	ShareURL      string `json:"shareUrl"` // 局域网访问地址
	LocalURL      string `json:"localUrl"` // 本地回环访问地址
	HasPassword   bool   `json:"hasPassword"`
	ViewerCount   int    `json:"viewerCount"`
	MaxViewers    int    `json:"maxViewers"`
	StartTime     int64  `json:"startTime"`
	ExpireTime    int64  `json:"expireTime"`
	RemainingSecs int    `json:"remainingSecs"`
}

// RunbookVariable 运维手册参数变量定义
type RunbookVariable struct {
	Name         string   `json:"name"`         // 变量名，如 HOST_IP, SERVICE_NAME
	Description  string   `json:"description"`  // 说明
	DefaultValue string   `json:"defaultValue"` // 默认值
	Required     bool     `json:"required"`     // 是否必填
	Type         string   `json:"type"`         // "text" | "number" | "select"
	Options      []string `json:"options"`      // 下拉候选列表
}

// RunbookStep 运维手册执行步骤
type RunbookStep struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	Command         string `json:"command"`         // 包含 ${VAR} 占位符的命令
	TimeoutSeconds  int    `json:"timeoutSeconds"`  // 超时秒数 (默认 60)
	ContinueOnError bool   `json:"continueOnError"` // 失败时是否继续后续步骤
	TargetSessionID string `json:"targetSessionId"` // 可选绑定特定会话，留空表示活动会话
}

// RunbookTemplate 运维手册 SOP 编排模板
type RunbookTemplate struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Category    string            `json:"category"` // e.g. "服务发布", "应急排障", "系统巡检", "日常运维"
	Tags        []string          `json:"tags"`
	Variables   []RunbookVariable `json:"variables"`
	Steps       []RunbookStep     `json:"steps"`
	CreatedAt   string            `json:"createdAt"`
	UpdatedAt   string            `json:"updatedAt"`
}

// RunbookStepResult 步骤执行结果
type RunbookStepResult struct {
	StepID     string `json:"stepId"`
	StepName   string `json:"stepName"`
	Command    string `json:"command"`
	Status     string `json:"status"` // "success" | "failed" | "skipped"
	Output     string `json:"output"`
	ExitCode   int    `json:"exitCode"`
	DurationMs int64  `json:"durationMs"`
}

// RunbookExecutionRecord 运维手册执行历史审计记录
type RunbookExecutionRecord struct {
	ID             string              `json:"id"`
	RunbookID      string              `json:"runbookId"`
	RunbookName    string              `json:"runbookName"`
	StartTime      string              `json:"startTime"`
	EndTime        string              `json:"endTime"`
	Status         string              `json:"status"` // "success" | "failed" | "stopped"
	TargetHost     string              `json:"targetHost"`
	VariableValues map[string]string   `json:"variableValues"`
	StepResults    []RunbookStepResult `json:"stepResults"`
}

// ContainerFileInfo 容器内文件元数据
type ContainerFileInfo struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	Size       int64  `json:"size"`
	Mode       string `json:"mode"`
	ModTime    string `json:"modTime"`
	IsDir      bool   `json:"isDir"`
	IsSymlink  bool   `json:"isSymlink"`
	LinkTarget string `json:"linkTarget,omitempty"`
}

// ContainerLogItem 容器实时日志条目
type ContainerLogItem struct {
	ContainerID   string `json:"containerId"`
	ContainerName string `json:"containerName"`
	Timestamp     string `json:"timestamp"`
	Line          string `json:"line"`
	Source        string `json:"source"` // "stdout" | "stderr"
}



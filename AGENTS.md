# 现代跨平台 SSH/SFTP 生产力客户端（OmniTerminal）功能开发与规范文档

> 本文档记录 OmniTerminal 全量生产力功能的架构规范与实现状态。
> `[x]` = 已完成 | `[ ]` = 待实现 | `[-]` = 已实现但存在缺陷需完善

---

## 约定与限制

### 通用约定

- **定位与愿景**：构建兼具极高生产力与现代极客美学的跨平台终端工作台（OmniTerminal），充分发挥 Go 高性能并发与现代 React 前端优势。
- **任务评估先导**：任何开发任务**必须先评估后执行**，不得跳过评估直接动工。
- **文档即代码**：开发完成后**及时更新 AGENTS.md**，确保功能状态、架构约定与代码实态保持完全一致。
- **标准分层架构**：Go 后端遵循标准模块化分层（`internal/app` 接口胶水层、`internal/core` 核心长链路业务、`internal/models` 数据契约、`internal/config` 统一配置、`internal/crypto` 安全加解密）；前端代码遵循 React 19 + TypeScript + Tailwind CSS 现代规范。

### 配置与持久化规范

- **统一主目录**：应用所有配置、凭证、日志、缓存与状态归一化至 `~/.omniterminal`，由 `internal/config` 包统一提供寻址（`GetConfigDir()` / `GetFilePath()` / `GetSubDir()`），严禁任何业务模块自行硬编码主目录路径。
- **零残留与自初始化**：应用启动时自动静默创建 `~/.omniterminal` 及其子目录（`logs/`、`cache/`、`inspections/` 等），严禁保留或检查任何历史遗留路径（如旧 `.xxshell`）。
- **敏感数据高强度加密**：所有会话密码、私钥、TOTP 密钥存盘时，必须采用主密码派生密钥执行 AES-256-GCM 加密，严禁明文存盘；校验标识统一为 `"omniterminal-valid"`。

### 终端与交互排版约定

- **默认终端字号基准**：默认终端字体大小规范为 **13px**（`fontSize: 13`），快捷键与菜单的缩放重置基准亦严格对齐 13px。
- **原生终端操作习惯**：
  - **智能剪切板**：存在选区时 `Cmd+C` / `Ctrl+C` 拦截中断信号执行文本复制；无选区时透传 SIGINT 中断信号给 PTY。
  - **鼠标选区自动复制**：选中文本释放鼠标或特定配置下，自动同步至系统剪贴板。
  - **右键自定义行为**：支持配置为弹出气泡菜单或直接粘贴剪切板，杜绝浏览器默认右键菜单。

### 性能与诊断日志约定（Zero Hot-path Logging）

- **严禁热路径磁盘写盘**：在终端 I/O 热路径（PTY 读取循环 `readLoop`、输入写入 `Write`、窗口缩放 `Resize` 以及每次击键）中，**严禁向磁盘写入任何未轮转的临时调试日志**（彻底废除开发期残留的 `local_shell_debug.log`）；任何调试输出仅允许在显式配置 `OMNI_DEBUG=1` 时输出至标准输出，避免内存逃逸与堆分配。
- **IPC 通信洁净化**：严禁在前端每次击键、每个数据块接收时向后端发射高频调试 IPC，保证主线程高帧率与极速输入响应。
- **正式日志归口**：会话操作与审计日志必须统一接入规范的 `SessionLogger` / 日志审计中心，由用户按需启用并按日期分卷归档。
- **终端渲染与流控**：xterm.js 优先启用 WebGL 硬件加速渲染（透明/特殊模式平滑降级 Canvas/DOM）；后端向前端投递终端输出数据流时，必须采用 10ms 批处理窗口合并碎片化事件，防范高频输出时 IPC 丢包与卡顿。
- **内存泄漏防护**：React 组件卸载生命周期必须显式执行 `EventsOn` 返回的注销函数，严禁调用全局 `EventsOff` 导致多 Tab 事件混乱。

### 界面设计美学约定

- **现代专业工作台范式 (Modern Pro Workspace Paradigm)**：使用精致微圆角（`rounded-md` 4~6px）、现代紧凑排版、清晰视觉层次。
- **VS Code Dark Modern 现代工程美学**：基底 `#1e1e1e`，镀铬与侧栏 `#181818`，面板卡片 `#252526`，微边框 `#2b2b2b`，主字阶 `#cccccc`，经典高亮蓝 `#0078d4`。
- **一体化顶栏与 Command Center**：Unified Header 整合品牌、Omnibar 快速连接检索胶囊与工作区工具组。

### 国际化与本地化约定 (i18n & Localization)

- **语言自动探测与无缝降级**：初始化时自动探测 `navigator.language`，若无用户显式设置偏好则自适应系统语言（中文 `zh-CN`、英文 `en-US`、日文 `ja-JP`、韩文 `ko-KR`），缺失词条安全降级至英文或传入 fallback。
- **配置持久化联动**：语言设置通过 `internal/models/config_models.go` 的 `AppSettings.Language` 与前端 `I18nProvider` 同步持久化，配置重载与重启保持一致。
- **界面与子功能全景覆盖**：
  - 核心工作台：首页（`QuickStartPage`）、菜单顶栏（`Toolbar`）、会话侧栏（`SessionSidebar`）、状态栏（`StatusBar`）、活动栏（`ActivityBar`）。
  - 全局偏好设置中心（全部 9 个选项卡与预览器）：`SettingsModal`、`SettingsAppearanceTab`、`ThemePreviewGallery`、`LiveFontPreview`、`SettingsSecurityTab`、`SettingsOSTab`、`SettingsInteractionTab`、`SettingsStatusBarTab`、`SettingsTemplateTab`、`SettingsAICopilotTab`、`SettingsQuickCmdsTab`、`SettingsAboutTab`。
  - 全量子功能面板与弹窗（100% 词条键值化，4 种语言完整对齐）：
    - 万能命令中心（`CommandPaletteModal`）、OmniAI 智能运维对话抽屉（`OmniAIChatDrawer`）、版本检测更新（`UpdateModal`）、参数化 SOP Runbook 运维手册（`RunbookManagerModal`）、AI Copilot 模态框（`OmniAICopilotModal`）、大模型接入配置（`AIConfigModal`）。
    - 标签页右键菜单（`TabContextMenu`）、终端右键菜单（`TerminalContextMenu`）、会话树右键菜单（`SessionTreeContextMenu`）、危险命令安全粘贴拦截（`SafePasteModal`）、主机健康巡检大盘（`InspectionReportModal`）。
    - SFTP 双栏文件传输管理器（`SftpPanel`）、多行命令撰写抽屉（`ComposePane`）、端到端加密云同步（`CloudSyncModal`）、TOTP / MFA 令牌管理（`TOTPManagerModal`）、SSH 身份密钥管理（`KeyManagerModal`）、端口转发与隧道监控（`TunnelMonitorModal`）、快捷键速查（`ShortcutReferenceModal`）、标签页工作台管理（`TabManagerModal`）、全局搜索（`GlobalSearchModal`）、历史命令检索（`CommandHistoryModal`）。
    - 会话配置全量 6 大选项卡：`SessionConnectionTab`、`SessionAppearanceTab`、`SessionAuthTab`、`SessionTerminalTab`、`SessionTunnelTab`、`SessionAuditTab`。
  - 彻底清除各子功能页面直接硬编码中文，杜绝在非中文语言下回退默认中文。

### 代码质量底线

- **零 Warning 编译**：每次提交与合并前确保 `wails build` 与 `go test ./...` 及 `./build.sh` 零告警、零报错。
- **增量修改原则**：修改已有文件时，优先使用精确替换（replace），严禁全文件覆盖。对于超过 1000 行的大文件（如 `App.tsx`、`TerminalInstance.tsx`、`ssh_manager.go`、`settings_handler.go`），修改前必须先定位目标代码段精准编辑。
- **并发安全**：所有共享状态（SSH 连接池、会话 Map、SFTP 句柄映射表、历史记录队列）必须使用 `sync.RWMutex` 或互斥锁严格保护。
- **函数单一职责与错误处理**：单个函数不超过 120 行；Go 后端所有 `error` 必须显式处理，严禁使用 `_` 吞掉错误；前端异步 Promise 必须具备完整的异常处理逻辑。

---

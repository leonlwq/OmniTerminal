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
  - **连接双击快速追加**：双击已有的终端连接（TabBar 标签页或侧栏活动会话）时，自动追加新建一个完全相同的终端连接（保持名称、主机、认证及环境变量一致）并立即激活。
  - **动态智能高亮引擎（Highlight Rules）**：对标 WindTerm / MobaXterm，内置 8 大预设规则集（Fatal/Critical、Error/Fail、Warn/Warning、Success/OK、IPv4/Port、Timestamp/Date、FilePath、HTTP 状态码），开箱即用自动着色；基于 xterm.js Decoration API + WebGL 着色器硬件加速，纯显示层渲染，绝不污染底层 PTY 流与系统剪切板；智能检测并在全屏模式（Alternate Buffer 如 vim/htop）下自动避让；支持终端右键“添加为高亮关键词”快速交互与设置中心增删改查。

### 性能与诊断日志约定（Zero Hot-path Logging）

- **严禁热路径磁盘写盘**：在终端 I/O 热路径（PTY 读取循环 `readLoop`、输入写入 `Write`、窗口缩放 `Resize` 以及每次击键）中，**严禁向磁盘写入任何未轮转的临时调试日志**（彻底废除开发期残留的 `local_shell_debug.log`）；任何调试输出仅允许在显式配置 `OMNI_DEBUG=1` 时输出至标准输出，避免内存逃逸与堆分配。
- **IPC 通信洁净化**：严禁在前端每次击键、每个数据块接收时向后端发射高频调试 IPC，保证主线程高帧率与极速输入响应。
- **正式日志归口**：会话操作与审计日志必须统一接入规范的 `SessionLogger` / 日志审计中心，由用户按需启用并按日期分卷归档。
- **终端渲染与流控**：xterm.js 优先启用 WebGL 硬件加速，构建 WebGL → @xterm/addon-canvas 硬件位图加速 → DOM 基础兜底的三级无缝降级链路；非活动 Tab 释放 GPU context 避免超限；后端向前端投递终端输出数据流时，采用 16ms 帧对齐（60fps）+ 64KB 单次批处理上限防爆，杜绝超大 base64 阻塞 IPC；前端数据热路径直接投递 term.write，二级功能惰性单例解码与防抖调度。
- **高频状态隔离与实例保活**：多标签切换基于 display: none 保留 DOM 实例；TerminalInstance 与工作台容器采用 React.memo 隔离；彻底废除根级无用 1000ms `GetSessionUptime` 轮询定时器，彻底消除 `App.tsx` 无意义的全树级联重绘；`TerminalWorkspacePanes` 全量使用稳定常量 `EMPTY_ARRAY` 与提取后的记忆化回调（`handleLinkedInput`, `handleToggleCommandBlockMode`, `handleTerminalReadyStable`, `handleToggleAICopilot`, `handleDirectoryChange`, `handleTriggerAIDiagnose`），使 `React.memo(TerminalInstanceComponent)` 彻底生效，多标签切换与按键时非活动 Tab 严格跳过评估（0 次无谓 re-render）。
- **PTY I/O 与编码热路径零堆拷贝**：Go 后端 `decodeToUTF8` 废除 `strings.NewReader(string(data))` 改为 `bytes.NewReader(data)`，UTF-8 路径直接短路；`encodeFromUTF8` 直接接收 `[]byte` 并使用 `bytes.Buffer` 写入，彻底消除每字节/每个按键在 `Write` 中的多次字符串/字节切片反复分配；`readLoop` 的 `flushPending` 改用偏移量分块与 `pending = pending[:0]` 复用底层切片容量，消除 60fps 帧循环中的频繁重构与 GC 抖动。
- **Base64 单例化与长会话防泄漏**：前端 `TerminalInstance.tsx` 提供模块级单例 `fastBase64ToBytes`（支持 Stage 4 / WebKit `Uint8Array.fromBase64` 探测并降级）与分块无堆压力的 `fastBytesToBase64`；`HighlightAddon` 增加 `_pruneDistantCache` 行文本指纹缓存动态淘汰机制（上限 2000 行），彻底解决终端持续跑批输出时非高亮行指纹无限累积导致的内存泄漏。
- **SFTP 渲染与无死循环防护**：SFTP 文件列表 <=300 项时采用原生 CSS 硬件加速滚动，彻底消除 @tanstack/react-virtual 在 React 19 并发渲染与非活动 Tab (尺寸 0x0) 下的 flushSync 调度重绘死循环；大列表 (>300项) 显式配置 useFlushSync: false 与稳定回调；采用单例 `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })` 自然数字排序，杜绝万级文件重排时反复初始化 Collation 引擎；将 `selected: Set<string>` 拆分为布尔基元 `isSelected: boolean` 与稳定引用，点击选择文件时仅触发变更行的局部重绘，从 5000+ 次全量虚拟行级联重绘降至严格 1-2 次 $O(1)$ 重绘；SftpFileItem 实施 React.memo 行级隔离；HighlightAddon 增设行文本指纹对比 (_lineContentCache)、重入锁 (_isScanning) 与 80ms 节流，彻底斩断 onRender -> registerDecoration -> _fullRefresh 自激振荡死循环。
- **逐跳探测连接泄漏防护**：`ProbeHopViaSSH` 增设超时竞态取消信道 `done`，当外部探测超时提前退出时，若异步 `client.Dial` 后续建连成功，立即安全关闭底层连接，杜绝远端 SSH Channel 与 TCP socket 残留泄漏。
- **Hook 依赖指纹化与 IPC 洁净化**：`useSessionSharing` 采用会话 ID 序列指纹（`tabIdsFingerprint`）合并 `useEffect`，彻底杜绝 Tab 内部属性（字号、编码、标题）变动时注销/重注 Wails 事件与重复拉取 `GetShareSessionStatus`；`useWorkspaceSync` 将 `WindowSetTitle` 依赖收敛至 `activeTabName`，工作区自动保存基于结构指纹防抖；`useSessionConnection` 采用函数式状态更新解除 `handleConnect` 与 `openTabs` 的依赖耦合；`useAppThemeEffect` 剔除无用的 `openTabs` 依赖；`useAutoLock` 增设 1000ms 活动节流，杜绝鼠标微小位移时的高频定时器启停。
- **内存泄漏防护**：React 组件卸载生命周期必须显式执行 `EventsOn` 返回的注销函数，严禁调用全局 `EventsOff` 导致多 Tab 事件混乱。

### 界面设计美学约定

- **现代专业工作台范式 (Modern Pro Workspace Paradigm)**：使用精致微圆角（`rounded-md` 4~6px）、现代紧凑排版、清晰视觉层次。
- **VS Code Dark Modern 现代工程美学**：基底 `#1e1e1e`，镀铬与侧栏 `#181818`，面板卡片 `#252526`，微边框 `#2b2b2b`，主字阶 `#cccccc`，经典高亮蓝 `#0078d4`。
- **一体化顶栏与 Command Center**：Unified Header 整合品牌、Omnibar 快速连接检索胶囊（居中对齐、带 `⌘K` / `Ctrl+K` 快捷键胶囊）、工作区工具组，以及右侧高质感幻彩渐变 OmniAI 智能运维胶囊按钮（`bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600` 配星芒与霓虹光晕）。
- **首页工作台 (QuickStartPage)**：无边框极客悬浮排版（彻底去除多余的灰色包裹内框），3D 品牌 Logo 配合多层环境流光悬浮呈现；高饱和蓝光新建连接按钮（`shadow-[0_0_24px_rgba(0,120,212,0.55)]`）与荧光青深色玻璃本地终端按钮（`border-cyan-500/40 text-cyan-300`）；三大核心能力指引卡片采用语义化霓虹边框与独立图标徽章（Indigo 多端会话管理、Amber 极速飞梭直连、Emerald 企业级安全盾配全息星芒）。
- **会话侧栏 (SessionSidebar)**：标题规范为“会话导航”，强制单行不折行（`whitespace-nowrap shrink-0`），显式提供高辨识度的“+ 资源”蓝色微胶囊按钮与新建目录按钮；搜索框支持标签与 IP 快捷过滤。
- **极客赛博活动栏 (ActivityBar)**：全面升级为赛博霓虹色彩体系（会话 Indigo、容器 Cyan、SFTP Emerald、隧道 Green、密钥 Amber、任务 Rose、日志 Pink、OmniAI Purple），每个模块具备独立的语义色彩、微光阴影及精准的激活指示条。
- **经典状态栏 (StatusBar)**：24px 极致紧凑高度与 11px 字阶，集成“命令广播”、“终端录制”、“连通性复用 (N/M)”、实时网络流量吞吐与字符编码弹窗。
- **应用全景图标规范 (App Icon & Packaging Standard)**：基于 3D 霓虹终端与极客立体 O 胶囊设计，1024×1024 画布满铺率达 96%（BBox 约 984×896），四周仅保留原生微呼吸间距；彻底消除 macOS LaunchServices Legacy Platter 自动垫白底问题；全链路同步产出 16~1024px Retina 级 Apple 原生 `.icns`、Windows 多尺寸 `.ico`、系统托盘高清图及前端资源。

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

### SFTP 高性能文件引擎与高级传输规范 (SFTP Engine & Resumable Transfer)

- **断点续传（Resumable Transfer）**：`[x]`
  - 上传与下载前支持自动探测源/目标尺寸（`SftpCheckFileResume`）。
  - 若目标已存在较小尺寸文件，提供智能模态对话框引导用户选择「断点续传 / 覆盖 / 取消」。
  - 底层基于 `OpenFile(..., os.O_WRONLY)`（避免 `O_TRUNC`）配合双方文件指针 `Seek(startOffset, io.SeekStart)`，精确从断点位置恢复 `io.Copy`。
  - 进度监控与速率计算校准：`ProgressStream` 初始基准对齐 `startOffset`，传输速率完全基于增量字节计算，杜绝显示速率瞬间暴增。
- **服务端跨机零磁盘直传（Server-to-Server Direct Transfer）**：`[x]`
  - 支持直接在活动会话列表之间复制文件/文件夹（`SftpTransferBetweenSessions`）。
  - 核心架构基于内存 `io.Pipe()` 256KB 环形通道流式传输，零宿主机磁盘 I/O，零临时落地文件，极大节省本地存储与网络翻倍开销。
- **传输生命周期与可控中断**：`[x]`
  - 后端提供统一的任务取消通道（`CancelSftpTransfer`），基于 `context.WithCancel` 与 `contextReader` 在中断信号触发时即时终止传输并清理资源。
  - 前端任务抽屉（`TaskQueueDrawer`）针对进行中的传输任务提供清晰的取消按钮交互与状态反馈。
- **文件全生命周期管理与安全删除（File Lifecycle & Safety Operations）**：`[x]`
  - **安全递归删除**：后端 `SftpDelete` 针对远端目录采用 `RemoveAll` 支持非空目录深层清理；前端提供双端（本地与远端）删除安全确认弹窗，明确提示不可逆风险并提供待删除项目列表与路径预览，支持多选批量删除（`Delete Selected (N)`）与单项删除。
  - **键盘快捷键与工具栏**：文件列表容器支持原生键盘快捷键（`Delete` 与 `Cmd+Backspace` / `Ctrl+Backspace`）；工具栏显式提供「删除所选」、「新建文件」、「新建文件夹」、「刷新」快捷操作。
  - **右键上下文菜单全家桶**：右键菜单支持「复制绝对路径（Copy Path）」、「重命名（Rename）」、「新建文件（New File）」、「新建文件夹（New Folder）」与「删除（Delete）」。
  - **全量 4 国语言本地化**：所有删除确认提示、批量计数、重命名/新建输入弹窗文案在 `zh-CN`、`en-US`、`ja-JP`、`ko-KR` 100% 对齐。

### 单通道多路复用与零感知监控规范 (SSH Multiplexing & Stealth Telemetry)

- **单通道连接池强约束与通道记账（Channel Accounting）**：`[x]`
  - `PooledSSHClient` 维护底层物理连接与活跃通道（PTY、SFTP、Telemetry、Tunnel）映射字典 `Channels map[string]int`。
  - 多终端 Tab、SFTP 传输、端口转发与后台硬件遥测默认共享底层单个物理 TCP 连接与已认证 SSH Transport，避免远程服务器高频登录与多物理连接浪费。
- **零感知无痕采样（Zero-Touch / Stealth Telemetry Sampling）**：`[x]`
  - 后台主机硬件性能监控（CPU/内存/磁盘/网络速率）通过复用 `*ssh.Client.NewSession()` 轻量执行读取 `/proc` 只读接口，使用完毕立即安全关闭临时 Channel。
  - 整个采样过程零额外 TCP 握手、远程 `/var/log/secure` 或 `auth.log` 0 笔 PAM 登录审计日志，告警 0 误触。
- **MaxSessions 自动探测与物理分流弹性（Multiplexing Overflow Fallback）**：`[x]`
  - 当远端服务器由于 `sshd_config` 的 `MaxSessions` 限制或物理连接失效导致新建 Session 失败时，连接池自动剔除失效连接并重试全新拨号分配二级连接，杜绝通道满载导致的用户连接阻塞。
- **前端极客多路复用感知看板（MultiplexBadge & Popover）**：`[x]`
  - 终端右上角视口集成磨砂微胶囊徽章（`⚡ 1 物理连接 / N 通道`），点击弹出高质感玻璃拟态详情看板。
  - 全面透视共享物理 Socket 地址、无痕安全保证、活跃通道类型与累计节省的握手开销（RTT Saved）。

### 多跳链路网络诊断与流光拓扑看板规范 (Network Topology & Multi-hop Diagnostics)

- **SSH Keepalive 真实物理 RTT 探测与零虚构**：`[x]`
  - 废除假 RTT 硬编码，基于 `client.SendRequest("keepalive@openssh.com", true, nil)` 在已认证 SSH Transport 上执行零开销物理级 RTT 毫秒精准测距。
  - 动态检测活跃隧道映射（`ActiveTunnels`），向下游自动拓扑探测服务节点（如 MySQL 3306、Redis 6379、Web 80/443 等）并附加服务卡片。
- **端到端多跳穿透链路可达性诊断（DiagnoseTopologyHop）**：`[x]`
  - 后端提供统一的链路排障接口 `DiagnoseTopologyHop(sessionId, targetAddr)`，逐跳拆解「本地到堡垒机/跳板机」与「跳板机到下游目标服务」的网络通断。
  - 精准定界故障点（如跳板机畅通但目标端口连接拒绝或超时），输出结构化诊断结论（healthy/broken）与针对性运维排障建议。
- **流光动态拓扑图谱看板（NetworkTopologyModal）**：`[x]`
  - 前端基于分层架构（Local -> JumpHost -> Target -> Service）渲染多跳拓扑网络。
  - 健康链路采用 SVG 呼吸渐变流光虚线动画，异常/熔断链路采用高亮警示红色虚线与错误徽章。
  - 右侧提供深度排障侧栏抽屉，支持一键实时重测、查看分跳延迟耗时瀑布图与智能专家建议。
- **4 国语言全量本地化对齐**：`[x]`
  - `zh-CN`、`en-US`、`ja-JP`、`ko-KR` 四种语言全量覆盖拓扑节点、连线状态、诊断排障文案。

### 代码质量底线

- **零 Warning 编译**：每次提交与合并前确保 `wails build` 与 `go test ./...` 及 `./build.sh` 零告警、零报错。
- **增量修改原则**：修改已有文件时，优先使用精确替换（replace），严禁全文件覆盖。对于超过 1000 行的大文件（如 `App.tsx`、`TerminalInstance.tsx`、`ssh_manager.go`、`settings_handler.go`），修改前必须先定位目标代码段精准编辑。
- **并发安全**：所有共享状态（SSH 连接池、会话 Map、SFTP 句柄映射表、历史记录队列）必须使用 `sync.RWMutex` 或互斥锁严格保护。
- **函数单一职责与错误处理**：单个函数不超过 120 行；Go 后端所有 `error` 必须显式处理，严禁使用 `_` 吞掉错误；前端异步 Promise 必须具备完整的异常处理逻辑。

---

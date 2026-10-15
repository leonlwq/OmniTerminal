# 现代跨平台 SSH/SFTP 客户端（OmniTerminal）开发约定

本项目的核心目标是开发一款兼具极高生产力、强大安全防护与现代极客美学的跨平台终端客户端。所有参与开发的 Agent 必须遵守以下约定：

## 1. 界面与布局规范 (UI/UX)
* **现代专业工作台范式 (Modern Pro Workspace Paradigm)**：使用精致微圆角（`rounded-md` 4~6px）、现代紧凑排版、清晰视觉层次。
* **一体化现代顶栏**：Unified Command Header 整合应用 Logo、折叠菜单、居中 Omnibar 快速直连输入（带 `⌘K` / `Ctrl+K` 快捷键胶囊）、工作区工具组，以及右侧高质感幻彩渐变 OmniAI 智能运维胶囊按钮（`bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600` 配星芒与霓虹光晕）。
* **首页工作台 (QuickStartPage)**：无边框极客悬浮排版（彻底去除多余灰色包裹框），3D 品牌 Logo 配合多层环境流光悬浮呈现；高饱和蓝光新建连接按钮（`shadow-[0_0_24px_rgba(0,120,212,0.55)]`）与荧光青深色玻璃本地终端按钮（`border-cyan-500/40 text-cyan-300`）；三大核心能力指引卡片采用语义化霓虹边框与独立图标徽章（Indigo 多端会话管理、Amber 极速飞梭直连、Emerald 企业级安全盾配全息星芒）。
* **左侧赛博极客 Activity Bar 与会话导航**：提供 48px 赛博霓虹活动栏（会话 Indigo、容器 Cyan、SFTP Emerald、隧道 Green、密钥 Amber、任务 Rose、日志 Pink、OmniAI Purple），独立语义色彩、微光阴影及精准激活指示条；会话导航标题强制单行不折行（`whitespace-nowrap shrink-0`），提供高辨识度的“+ 资源”蓝色微胶囊按钮与新建目录按钮，搜索框支持标签与 IP 快捷过滤。
* **经典状态栏 (StatusBar)**：24px 极致紧凑高度与 11px 字阶，集成“命令广播”、“终端录制”、“连通性复用 (N/M)”、实时网络流量吞吐与字符编码弹窗。
* **中部平滑胶囊页签 (Capsule Tabs)**：支持双击打开新 Tab，Tab 栏在终端上方，支持拖拽、锁定、分屏与状态呼吸指示灯。
* **右侧 SFTP 并排联动**：点击"SFTP 传输"时，在当前终端 Tab 内部的右侧并排划出文件管理器，维持命令行和远程文件浏览的上下文关联。
* **底部折叠命令抽屉**：支持广播开关、多行撰写 Compose Pane 与快捷命令集。
* **现代 Slate/Zinc 高级暗黑调色板**：主背景 `#0f1115`，面板表面 `#16191f`，微边框 `#262b35`，终端黑 `#0b0d10`。

## 2. 终端操作交互习惯 (Terminal Behavior)
* **鼠标选区自动复制**：终端中双击或拖拽选中的文字，在右键释放或特定配置下，自动复制至系统剪切板。
* **键盘快捷键习惯**：
  * 当存在选中文字时，按下 `Cmd+C` / `Ctrl+C` 应拦截默认的 shell 中断信号，改为执行文字复制。
  * 无选区时，`Ctrl+C` 必须正常透传发送中断信号给 PTY。
  * 粘贴快捷键 `Cmd+V` / `Ctrl+V` 应自动将系统剪切板的文字转换后送达后端 shell。
* **鼠标右键气泡菜单**：在终端非文字区域点击右键，不应弹出浏览器默认菜单，而应弹出自定义的"复制"、"粘贴"快捷操作浮标。
* **连接双击快速追加**：双击已有的终端连接（顶部 TabBar 标签页或侧栏活动会话列表）时，自动追加新建一个完全相同的终端连接并立即激活。
* **动态智能高亮引擎（Highlight Rules）**：对标 WindTerm / MobaXterm，内置 8 大预设规则集（Fatal/Critical、Error/Fail、Warn/Warning、Success/OK、IPv4/Port、Timestamp/Date、FilePath、HTTP 状态码），开箱即用自动着色；基于 xterm.js Decoration API + WebGL 着色器硬件加速，纯显示层渲染，绝不污染底层 PTY 流与系统剪切板；智能检测并在全屏模式（Alternate Buffer 如 vim/htop）下自动避让；支持终端右键“添加为高亮关键词”快速交互与设置中心增删改查。

## 3. 安全与配置持久化标准
* **统一主目录与零硬编码**：应用所有配置、凭证、日志、缓存与状态归一化至 `~/.omniterminal`，由 `internal/config` 包统一提供寻址，严禁任何业务模块自行硬编码路径。启动时静默自动创建目录及子目录，严禁检查或遗留历史旧路径。
* **敏感数据高强度加密**：所有密码、密钥私钥等敏感凭证存入磁盘时，必须采用主密码派生出的密钥进行 AES-256-GCM 高强度加密，严禁明文裸奔；密码校验标识统一为 `"omniterminal-valid"`。
* **启动解密校验**：若存在加密凭证，启动时必须全屏展示高质感磨砂玻璃锁屏以等待主密码输入，校验成功后才可解锁并读取连接。

## 4. 性能与诊断日志约定 (Zero Hot-path Logging)
* **严禁热路径磁盘写盘**：在终端 I/O 热路径（读取循环 `readLoop`、写入 `Write`、视口 `Resize` 及击键）中，**严禁向磁盘写入任何未轮转的临时调试日志**（彻底废除 `local_shell_debug.log`）；开发调试仅允许通过环境变量 `OMNI_DEBUG=1` 向 stdout 输出，避免高频 I/O 阻塞与内存逃逸。
* **IPC 通信洁净化**：严禁在前端每次击键、每个数据块接收时向后端发射高频调试 IPC，保证主线程极速响应。
* **正式日志归口**：会话操作与审计日志必须统一接入规范的 `SessionLogger` / 日志审计中心，支持用户按需启用与按日期分卷归档。

## 5. 前后端工程代码与目录结构规范
* **Go 后端开发规范**：
  * **单入口设计**：`main.go` 仅处理 Wails 的应用生命周期挂载与启动；`internal/app/app.go` 作为 IPC 桥接接口层，具体的长链路业务（如 SSH 连接池、并发 Map）在独立文件（如 `internal/core/ssh_manager.go`）中高内聚实现。
  * **标准项目布局**：遵循 `internal/app`（接口层）、`internal/core`（核心业务）、`internal/models`（数据模型）、`internal/config`（统一配置）、`internal/crypto`（加密工具）五层架构。
  * **并发与安全**：涉及共享数据（如活动的 SSH 连接、SFTP 句柄映射表）时，必须使用 `sync.RWMutex` 执行锁保护，防范并发读写恐慌。
  * **函数单一职责**：单个函数不超过 120 行，超出时应拆分为子函数。
  * **错误处理**：所有 `error` 必须处理，禁止使用 `_` 吞掉错误。
* **Frontend TS/React 规范**：
  * **组件化组织**：前端基础和业务 UI 组件应分模块放置在 `frontend/src/components/` 目录下（如 `TerminalInstance.tsx`、`SftpPanel.tsx`）。
  * **默认终端排版**：默认终端字体大小统一规范为 **13px**（`fontSize: 13`），缩放重置亦对齐 13px。
  * **严禁篡改 Wails 生成区**：`frontend/wailsjs/` 目录属于 Wails 自动编译产出区，切勿在该目录进行手动业务逻辑修改。
  * **静态类型检查**：禁止滥用 `any`。所有从后端传递过来的业务实体，必须引入 Wails 导出的 TypeScript models 进行静态校验。
  * **事件注销**：在 React 组件挂载及卸载的生命周期里，使用 Wails Event 事件监听时，必须在 Cleanup 中执行其返回的注销函数（而不是全局调用 `EventsOff`），防范多 Tab 页面中的重复数据监听及内存泄漏。
  * **大文件增量编辑**：对于超过 1000 行的源文件（特别是 `App.tsx`），修改时必须先 `grep_search` 精确定位目标代码段，使用 `replace_file_content` 或 `multi_replace_file_content` 进行增量编辑，严禁全文件覆盖重写。

## 6. 对标 Xshell 新增功能设计约定 (Gap Features)
* **快速连接起飞栏 (Quick Connect)**：
  * 地址输入框置于工具栏右侧，统一支持 `ssh://` 前缀的 URI 解析（可省略，默认使用 ssh），允许临时通过单行回车直接打开连接，不向 `sessions.json` 进行硬存盘。
* **多行撰写窗口 (Compose Pane)**：
  * 支持富文本多行指令，其发送必须受控。必须能够通过快捷键 `Ctrl+Enter` 一键往活动终端投递，或在使用广播输入时投递至所有 Tab。
* **心跳保活与掉线自动重连**：
  * 后端长链路模块应当每隔 30 秒自动向 SSH 信道发送 Keep-Alive 信标包。
  * 网络掉线时，前端与后端应进行联锁事件通信，自动触发 5 秒递减计时并执行重连，最多重试 5 次，带优雅的状态栏红色预警。
* **凭证备份安全搬迁规范**：
  * 导出的备份文件必须全量使用基于主密码二次派生密钥的 AES-256-GCM 保护，防止多机配置同步时私钥或密码以明文压缩包形式外泄。
* **SFTP 大文件断点续传与服务端零磁盘直传 (Resumable & Server-to-Server Transfer)**：
  * **断点续传**：上传与下载时智能探测已存在的目标文件尺寸，弹窗引导用户选择断点续传或覆盖；底层通过 `Seek(startOffset, io.SeekStart)` 续传并校准 `ProgressStream` 速率基准。
  * **服务端对传**：支持从当前会话直接流式复制至其他活动会话，基于内存 256KB 环形通道 `io.Pipe()` 直连双方 SFTP 流，宿主机零磁盘 I/O 写入。
  * **文件全生命周期管理与安全删除**：
    * 后端 `SftpDelete` 采用 `RemoveAll` 彻底解决远端非空目录删除失败；
    * 前端提供双端安全删除模态框（含待删除文件预览与不可逆警示），支持多选批量删除；
    * 列表视口支持原生键盘快捷键 `Delete` 与 `Cmd+Backspace` / `Ctrl+Backspace`；
    * 顶部工具栏提供快捷删除所选、新建文件、新建文件夹、刷新；
    * 右键上下文菜单提供复制绝对路径、重命名、新建文件、新建文件夹、删除，支持 4 国语言 100% 本地化。
* **单通道多路复用与零感知监控 (SSH Multiplexing & Stealth Telemetry)**：
  * **单连接强约束**：通过 `PooledSSHClient` 统一托管底层物理连接与通道计数（PTY、SFTP、Telemetry、Tunnel），自动多通道共享，避免远程高频登录刷屏。
  * **零感知无痕采样**：后台遥测（CPU/内存/磁盘）通过复用已建立的 `*ssh.Client.NewSession()` 执行轻量只读读取，sshd 审计 0 记录，PAM 0 次鉴权，杜绝告警误触。
  * **智能通道溢出分流**：探测到服务器 `MaxSessions` 限制时，连接池自动分流至二级新连接，保证业务操作零阻塞。
* **多跳链路网络诊断与流光拓扑看板 (Network Topology & Multi-hop Diagnostics)**：
  * **物理级 RTT 实时采样**：基于 `client.SendRequest("keepalive@openssh.com", true, nil)` 在已认证通道执行轻量探活，精准获取链路真实 RTT，告别伪造数据。
  * **下游服务自动探测与挂接**：关联活动的端口转发映射（`ActiveTunnels`），自动探测下游服务可用性（如 MySQL/Redis/HTTP）并呈现服务卡片节点。
  * **故障分段定界诊断引擎**：提供 `DiagnoseTopologyHop(sessionId, targetAddr)`，逐跳探测分析「本地->跳板机」和「跳板机->目标服务」的连通状态，精准识别端口防火墙与服务拒绝并给出排障指引。
  * **极客流光拓扑看板**：`NetworkTopologyModal` 具备分层视图（Local -> JumpHost -> Target -> Service）、健康流动光效动画、熔断链路高亮示警及右侧交互式排障抽屉。


## 7. 国际化与本地化规范 (i18n & Localization)
* **默认语言探测**：初始化优先依据 `navigator.language` 探测系统语言（默认支持 `zh-CN`, `en-US`, `ja-JP`, `ko-KR`），并与后端 `AppSettings.Language` 双向同步持久化。
* **界面与子功能全量词条覆盖**：首页工作台、菜单栏、活动栏、会话侧栏、状态栏、全局偏好设置 9 大选项卡、会话配置 6 大选项卡、SFTP 双栏管理器、SOP Runbook、万能命令中心、OmniAI 对话抽屉、AI Copilot、右键上下文菜单及全量子功能弹窗杜绝硬编码文本，全部统一通过 `useI18n()` 词典进行映射，实现 4 种语言 100% 同步对齐。

## 8. 代码质量底线
* **零 Warning 编译**：每次提交前确保 `wails build` 零告警、零报错。
* **增量修改原则**：修改已有文件时，优先使用精确替换（replace），严禁全文件覆盖。
* **事件批处理与渲染降级**：后端向前端发送终端数据时，采用 16ms 帧对齐（60fps）窗口与 64KB 单次批处理上限防爆，防止高速输出时 IPC 丢包与主线程卡死；前端构建 WebGL → @xterm/addon-canvas → DOM 三级平滑降级链，非活动 Tab 释放 GPU context 避免超限；多 Tab 遥测与流量按需休眠，切断根组件重绘风暴。
* **高频状态隔离与 React.memo 强约束**：彻底清除根级无用 1000ms 轮询定时器（如废除每秒唤醒 `App.tsx` 的 `GetSessionUptime`）；工作台容器 `TerminalWorkspacePanes` 全量使用稳定常量 `EMPTY_ARRAY` 与稳定的 useCallback 引用，确保多标签环境下非活动 Tab 100% 阻断无效渲染。
* **PTY I/O 热路径零堆拷贝与 Base64 优化**：Go 端 `decodeToUTF8` 废除 `strings.NewReader(string(data))` 改用 `bytes.NewReader(data)`，`encodeFromUTF8` 直接传递 `[]byte` 并使用 `bytes.Buffer`，`readLoop` 的 `flushPending` 使用 offset 索引并保留切片容量 `pending = pending[:0]`；前端使用模块级单例 `fastBase64ToBytes`（支持 WebKit Stage 4 探测）与分块无堆压力的 `fastBytesToBase64`。
* **SFTP 渲染与无死循环防护**：SFTP 文件列表 <=300 项时采用原生 CSS 硬件加速滚动，彻底消除 @tanstack/react-virtual 在 React 19 并发渲染与非活动 Tab (尺寸 0x0) 下的 flushSync 调度重绘死循环；大列表 (>300项) 显式配置 useFlushSync: false 与稳定回调；采用模块级单例 `Intl.Collator` 自然数字排序杜绝排序热点；将 `selected: Set<string>` 拆分为布尔基元 `isSelected: boolean` 并稳定化所有操作句柄，使 `React.memo(SftpFileItem)` 达成真正的 $O(1)$ 局部更新，消除万级文件点击时全量重排重绘；SftpFileItem 实施 React.memo 行级隔离；HighlightAddon 增设行文本指纹对比 (_lineContentCache)、重入锁 (_isScanning)、80ms 节流与动态淘汰机制（上限 2000 行），彻底斩断 onRender -> registerDecoration -> _fullRefresh 自激振荡死循环与长会话内存泄漏。
* **逐跳探测连接泄漏防护**：`ProbeHopViaSSH` 增设超时竞态取消信道 `done`，超时分支提前返回时，若底层异步 `client.Dial` 延迟成功则强制立即关闭连接，杜绝远端 SSH Channel 与 TCP socket 残留。
* **Hook 依赖指纹化与 IPC 洁净化**：`useSessionSharing` 采用会话 ID 序列指纹（`tabIdsFingerprint`）合并 `useEffect`，彻底杜绝 Tab 内部属性（字号、编码、标题）变动时注销/重注 Wails 事件与重复拉取 `GetShareSessionStatus`；`useWorkspaceSync` 将 `WindowSetTitle` 依赖收敛至 `activeTabName`，工作区自动保存基于结构指纹防抖；`useSessionConnection` 采用函数式状态更新解除 `handleConnect` 与 `openTabs` 的依赖耦合；`useAppThemeEffect` 剔除无用的 `openTabs` 依赖；`useAutoLock` 增设 1000ms 活动节流，杜绝鼠标微小位移时的高频定时器启停。
* **开发后更新**：任何功能开发完成后，必须同步更新根目录 `AGENTS.md` 中对应任务项的状态标记。


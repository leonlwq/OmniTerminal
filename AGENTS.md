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

### 代码质量底线

- **零 Warning 编译**：每次提交与合并前确保 `wails build` 与 `go test ./...` 及 `./build.sh` 零告警、零报错。
- **增量修改原则**：修改已有文件时，优先使用精确替换（replace），严禁全文件覆盖。对于超过 1000 行的大文件（如 `App.tsx`、`TerminalInstance.tsx`、`ssh_manager.go`、`settings_handler.go`），修改前必须先定位目标代码段精准编辑。
- **并发安全**：所有共享状态（SSH 连接池、会话 Map、SFTP 句柄映射表、历史记录队列）必须使用 `sync.RWMutex` 或互斥锁严格保护。
- **函数单一职责与错误处理**：单个函数不超过 120 行；Go 后端所有 `error` 必须显式处理，严禁使用 `_` 吞掉错误；前端异步 Promise 必须具备完整的异常处理逻辑。

---

## 一、基础工程与框架（已完成）

- [x] 初始化开发环境与 Wails 工具链
  - [x] 安装 `wails` 命令行工具
  - [x] 验证 `wails doctor` 确保依赖完整
- [x] 初始化 Wails 项目骨架
  - [x] 使用 `wails init` 创建基于 React + TS 的项目
  - [x] 集成 Tailwind CSS
- [x] 后端核心实现（Go）
  - [x] 引入 `golang.org/x/crypto/ssh` 依赖
  - [x] 实现 SSH 连接建立、认证（支持密码与私钥）
  - [x] 实现 SSH 读写 Channel 以及通过 Wails Runtime 进行事件分发（双向数据绑定）
  - [x] 实现基础的会话配置存储（JSON 格式）
  - [x] 统一配置与数据主目录（标准 `~/.omniterminal`，启动时自动创建，所有会话、设置、日志、密钥与缓存彻底归一化）
- [x] 前端核心实现（React + TypeScript）
  - [x] 安装 `xterm` 及其 WebGL、Fit、Search 插件
  - [x] 设计 Xshell 风格 UI（左侧会话树、上方多 Tab 栏、底部快捷命令区、中部终端区）
  - [x] 实现多标签页（Tabs）管理与多终端实例的激活切换
  - [x] 绑定终端的输入与后端 SSH 写入流，接收后端的输出数据并渲染
- [x] 功能联调与测试
  - [x] 联调测试 SSH 登录与基础命令交互
  - [x] 完善退出与连接释放逻辑
- [x] 工程化构建与容器化体系（Makefile & Dockerfile）
  - [x] 工业级 Makefile：支持 `help`, `dev`, `build`, `build-darwin`, `build-windows`, `build-linux`, `build-all`, `package`, `test`, `lint`, `clean`, `docker-export` 全生命周期指令
  - [x] 多阶段 Dockerfile：支持 Node.js 前端编译、Go + WebKit2GTK Linux 桌面无头编译、BuildKit 本地快速导出与轻量运行时桌面镜像
  - [x] 配置 `.dockerignore` 排除构建缓存与临时文件，实现高效极速镜像层构建
  - [x] GitHub Actions 多平台自动化发布流水线（`.github/workflows/release.yml`：支持 `v*` 标签触发，矩阵并行构建 macOS Apple Silicon/Intel DMG 与 ZIP、Windows x64/arm64 ZIP、Linux tar.gz，单节点聚合原子发布至 GitHub Releases 并自动生成 Release Notes）

---

## 二、会话管理（Session Manager）

- [x] 会话树的多级文件夹目录管理（无限嵌套）
- [x] 会话新建、编辑、删除
- [x] 会话搜索过滤
- [x] 文件夹展开/折叠
- [x] 双击会话发起连接
- [x] 文件夹内创建子会话/子目录
- [x] 顶栏快速连接输入（临时免建会话直连，支持 `ssh://user:pass@host:port` 格式）
- [x] 会话拖拽排序与跨目录移动（Drag & Drop 树节点拖拽重排）
- [x] 会话右键上下文菜单（连接 / 在新窗口打开 / 复制 / 克隆 / 属性）
- [x] 会话克隆/复制（一键复制已有会话配置为新会话）
- [x] 会话分组连接（选中文件夹一键批量连接目录下所有会话）
- [x] 会话图标自定义（为不同会话设置不同的标识图标/颜色标签）
- [x] 会话树配置一键加密导入与导出（主密码下的安全配置文件跨设备搬迁）
- [x] 会话属性对话框分类面签（连接/认证/终端/外观/日志/安全 六大面签分区，对标 Xshell Session Properties）
- [x] 会话属性级联继承机制（Folder Cascading Inheritance，多层级文件夹默认配置模板与祖先逐级继承）
- [x] 全局表单与会话输入框禁用自动首字母大写（配置 `autoCapitalize="none"`、`autoCorrect="off"`、`spellCheck={false}`，彻底阻断 macOS WebKit 与操作系统输入法对会话名、主机名、用户名、命令等的自动首字母大写与拼写篡改）

---

## 三、多标签页与窗口管理（Tabs & Window）

- [x] 多标签页（Tabs）管理与切换
- [x] Tab 关闭按钮
- [x] Tab 切换时自动重新 fit 终端尺寸
- [x] 活动 Tab 高亮指示
- [x] Tab 拖拽排序（允许用户拖拽调整 Tab 顺序）
- [x] Tab 锁定功能（防止误关闭重要会话 Tab）
- [x] Tab 右键菜单（关闭 / 关闭其他 / 关闭右侧 / 克隆会话 / 重命名标签，重命名全界面毫秒级联动同步）
- [x] 双击 Tab 栏空白区域快速新建会话
- [x] 终端分屏（水平/垂直分割当前终端面板，同屏显示多个会话）
- [x] Tab 连接状态颜色标识（连接中/已断开/错误 不同颜色）
- [x] Tab Manager 面板（独立的可视化标签管理面板，列出所有打开的会话标签，支持分组）
- [x] Quick Start 图形启动页（展示双主行动按钮「新建 SSH 会话」与「打开本地终端」，精简移除多余的内嵌浏览器 iframe，三维指引网格卡片快速指引）
- [x] 多终端分屏同步滚动联动（Synchronized Scrolling across Split Panes，多分屏终端视口比例同步平滑滚动）
- [x] 关闭活动终端标签页二次确认机制（Confirm Tab Close，连接中的终端关闭前弹出防误触警告弹窗，支持“不再询问”持久化勾选与系统设置随时开启/关闭）
- [x] 主窗口关闭行为控制（Close Action & Tray / Exit Dialog，支持最小化至系统托盘 vs 退出程序，支持“关闭时不再询问”与关闭时优雅选择弹窗，已精准解耦窗口红叉关闭与 macOS Dock 退出/Cmd+Q 系统级退出，Windows 平台无托盘时自动降级最小化到任务栏）
- [x] SingleInstanceLock 多实例命令行参数转发（OnSecondInstanceLaunch 自动派发 cli-arguments 事件，已有实例在 Windows/macOS 被二次唤起时自动打开目标会话）
- [x] 阻止系统自动休眠（Prevent Sleep / Keep-Awake，跨平台调用 caffeinate / SetThreadExecutionState / systemd-inhibit，防止大文件传输与会话断连）
- [x] 开机时自启动（Auto-start at Boot，跨平台集成 LaunchAgents / Windows Run 注册表 / Linux autostart）
- [x] 禁用系统托盘模式（Disable System Tray，禁用托盘后点击关闭按钮直接退出程序）
- [x] 会话标签栏 VS Code 原生平铺风格重构（Tab Bar VS Code Native Style Overhaul：严格对齐 VS Code 原生标签栏，未激活标签彻底移除外框与底色，保持平铺微透与 hover:bg-[#1f1f1f] 高雅暗调；标签间使用 1px border-r border-[#2b2b2b] 垂直细线分割；活动标签承接画布底色 bg-[#1e1e1e]、纯白标题 text-white、顶部经典的 2px 湛蓝高亮线 #0078d4，高度规范统一至 h-[35px] 平铺无缝对接，彻底告别悬浮框杂乱与割裂感）

---

## 四、终端交互操作（Terminal Interaction）

- [x] xterm.js WebGL 硬件加速渲染
- [x] 终端自适应大小（FitAddon + ResizeObserver）
- [x] 智能剪切板劫持（选中时 Cmd+C / Ctrl+C 复制文字，无选区时透传终端中断信号 SIGINT 给 PTY）
- [x] 粘贴快捷键（Cmd+V / Ctrl+Shift+V / Ctrl+V / Shift+Insert）
- [x] 右键上下文气泡菜单（复制 / 粘贴）
- [x] 连接中 loading 动画与连接失败错误展示
- [x] 终端内文本搜索（Ctrl+F 唤起搜索栏，支持正则表达式查找高亮）
- [x] 终端关键字正则高亮过滤（自动红色高亮 ERROR / FAIL 等关键句，支持自定义高亮规则集）
- [x] 终端回滚缓冲区大小配置（可自定义 scrollback 行数）
- [x] 鼠标选区自动复制到剪贴板（选中即复制，无需额外按键；集成 mouseup 释放选区即时复制与防抖流控，动态 ref 消除陈旧闭包，Wails IPC 与 Web 标准剪贴板双通道保障）
- [x] 终端铃声设置（开启/关闭终端 Bell 提示音）
- [x] 终端透明度/半透明背景设置
- [x] 右键菜单增强（选择全部 / 清屏 / 查找 / 打印 / 另存为日志）
- [x] 终端光标样式配置（块状 / 下划线 / 竖线、闪烁开关）
- [x] 自定义高亮规则集管理 UI（用户可自定义关键词、正则表达式及颜色，而非仅硬编码 ERROR/FAIL）
- [x] 终端类型仿真选择（VT100 / VT220 / XTERM / Linux / ANSI 等终端类型可选）
- [x] 自定义快捷键映射（Key Mapping，用户可将按键映射到特定字符串发送或脚本执行）
- [x] 鼠标行为自定义（配置鼠标单击/双击/右键的具体行为；修复右键直接粘贴剪切板模式，支持存在选区时优先复制并粘贴、终端自动回焦与原生 DOM 事件双重拦截）
- [x] 本地 Shell 集成（直接在 Tab 中打开本地 zsh/bash/PowerShell/CMD 终端，Windows 下深度集成原生 ConPTY 虚拟终端与 CREATE_NO_WINDOW，彻底解决字符回显阻塞、无法输入与外部黑框弹窗问题，并支持动态 Resize 窗口自适应；废除开发期残留的 local_shell_debug.log 磁盘写盘与高频 IPC，释放磁盘与 I/O 资源）
- [x] 终端实时日志过滤器（Live Buffer Filter Pane，Cmd+Shift+F 实时抓取正则匹配行、高亮与滚屏锁定）
- [x] 防丢包字符/行延时发送机制（Inter-Character & Line Send Delay Flow Control，对标 SecureCRT 硬件级流控，防低缓冲交换机/串口吞字丢命令）

---

## 五、连接与网络（Connection & Network）

- [x] SSH2 密码认证
- [x] SSH2 私钥认证（PEM 格式）
- [x] SSH 隧道端口转发（Local / Remote / Dynamic SOCKS5）
- [x] SSH 自动交互应答登录脚本（Expect 模式自动应答）
- [x] 远程 PTY 终端模式（xterm-256color）
- [x] 心跳保活机制（Keep-Alive，每 30 秒自动发送信标包）
- [x] 网络掉线自动重连（指数退避算法 1s→2s→4s→8s→16s，最大重试 5 次，SFTP 上下文无缝恢复）
- [x] SSH 跳板机/代理跳转（Jump Host / ProxyJump 级联连接）
- [x] Keyboard-Interactive 认证方式支持（两步验证、OTP 等）
- [x] X11 转发支持
- [x] SSH Agent 转发支持
- [x] Host Key 主机指纹管理（首次连接确认 + 指纹库存储与校验）
- [x] 字符编码选择切换（UTF-8 / GBK / EUC-KR / ISO-8859-1 等）
- [x] SFTP-only 会话模式（无终端纯文件传输会话）
- [x] ECDSA / ED25519 密钥对生成与管理工具（ECDSA P-256/P-384/P-521 已补全）
- [x] 加密算法选择（允许每个会话指定加密算法 AES/3DES/ChaCha20 和 MAC 算法）
- [x] HTTP/SOCKS 代理服务器支持（通过 HTTP/SOCKS 代理连接 SSH 服务器）
- [x] 全局自动继承系统代理（Inherit System Proxy，自动探测并同步 macOS scutil / Windows Registry / 环境变量代理，无缝穿透 SSH 与 SFTP）

---

## 六、SFTP 文件管理（File Transfer）

- [x] SFTP 文件浏览（列出远程目录文件）
- [x] SFTP 文件上传（异步后台 + 进度条推送）
- [x] SFTP 文件下载（异步后台 + 进度条推送）
- [x] SFTP 文件/目录删除
- [x] SFTP 传输队列面板（实时速度、百分比、状态显示）
- [x] 双栏并排 SFTP 布局（右侧拉出，不使用独立浮窗）
- [x] SFTP 目录创建（新建文件夹）
- [x] SFTP 文件/目录重命名
- [x] SFTP 文件权限修改（chmod）
- [x] SFTP 批量文件上传（多选文件一次上传）
- [x] SFTP 目录递归上传与下载
- [x] SFTP 文件双击打开/编辑（简易文本编辑器）
- [x] SFTP 本地与远程双面板模式（左本地 + 右远程对照浏览）
- [x] SFTP 拖拽上传下载（从系统文件管理器拖入文件上传）
- [x] SFTP 文件属性查看（显示文件大小、修改时间、所有者、权限等详细属性对话框）
- [x] SFTP 路径收藏夹/书签（收藏常用远程路径一键跳转）
- [x] 远程文件联动本地外部编辑器与自动回传（External Editor Watcher，双击调用 VSCode/Cursor/Sublime 打开，保存自动后台 SFTP 同步）

---

## 七、安全与加密（Security）

- [x] 主密码（Master Password）机制，AES-256-GCM 加密本地凭证
- [x] 启动磨砂锁屏校验（主密码解锁全屏屏障）
- [x] 启用/禁用主密码功能
- [x] 密码与私钥加密存盘
- [x] 主密码修改功能（旧密码验证后更换新密码，重新加密全部凭证）
- [x] 会话树配置加密备份导出（AES-256-GCM 保护的 .omnisb / .xxsb 配置包）
- [x] 会话树配置加密导入（从加密备份文件恢复会话列表）
- [x] 自动锁屏超时（闲置 N 分钟后自动锁定需重新输入主密码）
- [x] 认证档案管理（Authentication Profiles，跨多会话复用凭据组合，已完整挂载至“工具”->“认证配置管理...”菜单并支持增删改查与实时联动）
- [x] 密钥管理器（内置 SSH 密钥对生成/导入/导出工具，支持 RSA/ED25519/ECDSA P-256/384/521）
- [-] 已知主机指纹管理器（为消除与“密钥管理”的认知混淆并保持界面极致精简，已按方案 B 从主菜单和前端彻底移除独立冗余入口）

---

## 八、外观与主题定制（Appearance & Theme）

- [x] 多主题配色方案（内置扩充至 32 款经典与极客主题，包含 Rosé Pine / Rosé Pine Moon / Kanagawa Wave / Kanagawa Dragon / Vesper / Night Owl / Everforest / Poimandres / Oxocarbon / Horizon / Palenight / Snazzy / Shades of Purple / Tokyo Night & Storm / Catppuccin 4大变体 / Nord / One Dark / Dracula / Monokai 等）
- [x] 全局字体族选择与双字体栈支持（ASCII 字体与非 ASCII 字体分离设置）
- [x] 全局与会话独立行高比例微调（Line Height 1.0x ~ 2.0x）
- [x] 全局与会话独立视口内边距微调（Terminal Padding 0px ~ 32px）
- [x] 本地背景图片一键选择器、背景适配模式 (Cover/Contain/Tile) 与背景模糊滤镜 (0~20px Blur)
- [x] 全局字号与会话单独外观覆盖（不同会话可独占主题配色、字号、行高与内边距）
- [x] WebGL 加速渲染（透明模式自动平滑降级 Canvas/DOM 渲染）
- [x] 自定义主题配色创建与管理（用户自定义 ANSI 16 色方案并保存/命名）
- [x] 终端背景图片设置（支持每会话独立背景图与透明度）
- [x] 窗口透明度/毛玻璃磨砂效果设置
- [x] 全屏模式（F11 切换无边框全屏）
- [x] 工具栏/侧边栏/底部栏显隐自定义布局
- [x] 暗色 / 亮色模式切换（支持暗黑/明亮/跟随系统三种模式，全层 UI 与终端配色无缝联动）
- [x] 终端配色方案导入/导出（已实现 iTerm2 .itermcolors / Windows Terminal JSON / Xshell .xcs 格式双向解析）
- [x] 界面面板可拖拽停靠（Dockable UI，支持会话树左/右停靠、SFTP 并排联动、底部抽屉）
- [x] 字体粗细/字重精细控制（Font Weight Thin~Black 九档 + 粗体字重独立配置，xterm.js fontWeight/fontWeightBold）
- [x] 字间距微调（Letter Spacing -5~+10px 步进 0.5px，精细终端排版控制）
- [x] 全局背景壁纸设置（全局默认背景图/不透明度/模糊/适配模式，会话独立背景优先降级全局）
- [x] 文字最小对比度保障（Minimum Contrast Ratio 1~21:1 滑块，WCAG AA/AAA 标准标注，xterm.js minimumContrastRatio）
- [x] Powerline / Nerd Font 符号矢量对齐与 Unicode 宽字符规范切换（customGlyphs 矢量绘制 + unicodeVersion 11/6 模式）
- [x] 粗体文字 ANSI 亮色渲染控制（Draw Bold as Bright，支持粗体亮色渲染与原色保持两档策略）
- [x] 独立全局光标颜色与光标文字反色设置（Cursor Color & Accent Color 自由拾取，支持一键重置跟随主题）
- [x] 选区背景高亮与选区文字前景色控制（Selection Background & Selection Foreground，防止选中文本模糊发虚）
- [x] 主题配色一键导入/导出可视化面板（SettingsAppearanceTab 界面集成，支持 .itermcolors / .json / .xcs 格式双向互通）
- [x] 实时终端仿真预览面板（LiveFontPreview，设置内实时渲染双字体栈、字重、连字、抗锯齿、CJK/Emoji 全角对齐、光标呼吸与调色盘）
- [x] 系统已安装等宽字体自动嗅探与极客字体指引（利用 document.fonts.check 探测本地安装状态并以绿点标注，提供 Nerd Fonts 官方直达下载入口）
- [x] 图形渲染引擎自由切换（支持 Auto 智能降级 / WebGL 硬件加速 / Canvas 2D / 纯 DOM 文本渲染四种模式）
- [x] 文字渲染抗锯齿与字体平滑控制（支持 Antialiased 灰度平滑 / Subpixel-Antialiased 次像素锐利 / None 像素点阵三种渲染策略）
- [x] 终端字体/字重/样式热重载即时生效（解决 WebGL CharAtlas 纹理贴图缓存与 Cell Model 缓存未清空导致改字体需选中文本才生效的问题）
- [x] macOS 现代全胶囊与 Squircle 圆润化视觉重构（阶段一：净化主菜单 Windows 助记符、Spotlight 灵动全胶囊起飞台 Omnibar、控制台中枢 Segmented Capsule 药丸群组化、rounded-2xl 微晶浮层）
- [x] macOS 全局工作区圆润连续曲率与精致质感升级（阶段二：中央欢迎页 Squircle rounded-2xl 卡片与全胶囊操作纽、左侧 Activity Bar 气泡化图标与胶囊指示灯、会话侧栏 Spotlight 胶囊搜索框与圆润列表、底部状态栏 Micro-Capsule 紧凑徽标与 rounded-2xl 诊断浮层、TabBar 现代 Pill/Squircle 标签页）
- [x] JetBrains IDEA 风格下拉浮层与会话树深度圆润重构（阶段三：浮空微胶囊菜单项 mx-1 rounded-xl、左侧 16px 矢量线框图标严格对齐栅格、macOS 原生快捷键符号 ⌘/⇧/⌥ 转换、长菜单内置即时搜索胶囊、会话树节点由 rounded-none 升级为 rounded-lg mx-1 浮空圆角胶囊与全胶囊徽标）
- [x] 全局界面高通透性明度与 WCAG 对比度阶梯调优（阶段四：解决暗灰发沉与不可见问题，顶栏主菜单提亮至 text-slate-200 悬停纯白，顶栏/侧边栏/底栏未激活图标全线升级为 text-slate-300，基准 --app-text-muted 提亮至 #94a3b8 Slate-400，会话主机地址与搜索占位符清晰度大幅增强）
- [x] 深度融入 VS Code Dark Modern 现代暗黑工程美学（全面升级 CSS 核心设计令牌：基底 #1e1e1e、镀铬与侧栏 #181818、面板卡片 #252526、微边框 #2b2b2b、主字阶 #cccccc、经典 VS Code 湛蓝 #0078d4；重塑欢迎页为 VS Code 极客卡片，重构 Activity Bar 为 2px 左贴边蓝指示线，统一顶栏 Omnibar 与侧栏搜索框为中性规整圆角微边框）
- [x] 极客流行暗黑主题库扩容（新增 16 款国际顶流终端暗黑主题：Rosé Pine / Rosé Pine Moon / Kanagawa Wave / Kanagawa Dragon / Vesper / Night Owl / Everforest Dark / Poimandres / Oxocarbon / Horizon Dark / Palenight / Snazzy / Shades of Purple / Tokyo Night Storm / Catppuccin Macchiato & Frappé，全部无缝接入画廊预览搜索与每会话独立覆盖）
- [x] 明亮模式曝光失效与黑白错乱修复（彻底消除顶栏白底白字、欢迎页与搜索框黑方块。重塑 `.theme-light` 为 VS Code Light Modern 标准，所有菜单文字、Omnibar、欢迎卡片、侧栏搜索框与底部状态栏全面解耦绝对色值，完整接入语义化动态设计令牌，实现 Dark / Light 双模式高对比度完美自适应）
- [x] 原生 VS Code Dark Modern 终端主题新增并设为默认（像素级复刻 VS Code 原生终端 Default Dark+ 效果，底色 #181818、前景色 #cccccc、纯白光标、#264f78 半透明湛蓝选区与精准 ANSI 16 色，前后端默认主题与降级链全面更新为 VS Code Dark Modern）
- [x] 全局弹出子功能窗口与模态框体系 VS Code Dark Modern 统一重构（全面升级设置中心 SettingsModal、会话属性 SessionModal 6大面签、SSH 密钥管理 KeyManagerModal、集中认证档案 AuthProfileManagerModal、端口转发监控 TunnelMonitorModal、跨会话命令历史 CommandHistoryModal、命令面板 CommandPaletteModal、快捷键映射 KeybindingManagerModal、日志审计中心 LogViewerModal、宏管理器 MacroManagerModal、触发器管理器 TriggerManagerModal 及所有确认防误触弹窗 ConfirmModals；消除旧青蓝光晕与大圆角，采用标准 VS Code 深灰微边框 #252526/#2b2b2b、顶底栏 #1f1f1f、侧栏实底蓝激活项 #04395e、标准输入控件与微圆角，打造全链路一致的纯正专业暗黑工器具质感）
- [x] 全量 24 个扩展子功能弹窗 VS Code Dark Modern 美学与规范对齐（批量巡检 InspectionReportModal、Tab 管理 TabManagerModal、批量新建 BatchSessionModal、会话导入 ImportSessionsModal、全局搜索 GlobalSearchModal、自动化脚本工作台 ScriptRunnerModal、多端执行结果比对 MultiExecDiffModal、两步验证密钥器 TOTPManagerModal、参数化命令模板 ParamTemplateModal、快捷键速查表 ShortcutReferenceModal、录像播放器 SessionCastPlayerModal、网络拓扑图 NetworkTopologyModal、远程运维工作台 RemoteOpsModal、实时日志流 RealtimeLogModal、AI 模型配置 AIConfigModal、云同步与团队协作 CloudSyncModal、检查更新 UpdateModal、SFTP 目录比对 FolderDiffModal、安全粘贴确认 SafePasteModal、SFTP 预览器 SftpPreviewModal、终端共享 ShareSessionModal 与观察端 SharedTerminalViewerModal、Monaco 编辑器 MonacoEditorModal、OmniAI 智能 Copilot OmniAICopilotModal；全量清除旧式发光与暗青边框，100% 对齐深灰微边框、标准镀铬顶底栏、代码块与专业输入控件）
- [x] 全量辅助交互组件、内嵌控件与抽屉 VS Code Dark Modern 统一重构（全面重塑多行撰写 ComposePane、结构化输出分析 StructuredOutputOverlay、终端快捷命令胶囊带 TerminalQuickCommandRibbon、终端搜索条 TerminalSearchBar、右键上下文气泡 TerminalContextMenu、定时指令浮层 TerminalTimerPopover、实时日志过滤抽屉 TerminalLiveFilterPane、书签抽屉 TerminalBookmarkDrawer、状态浮层与诊断卡片 TerminalStatusOverlays、2FA与指纹核验弹窗 NetworkPrompts、SFTP内嵌属性/压缩/右键菜单/状态栏、Quake下拉终端 QuakeDropdownTerminal、字体仿真预览 LiveFontPreview、VNC图形桌面监控台 VncInstance、搜索小地图 TerminalSearchMinimap、命令块视图 TerminalCommandBlockView、主密码全屏锁屏 LockScreen 等；全量清除旧式 cyan/slate 杂质色与大圆角，彻底统一为标准 VS Code 表面色 #252526/#1e1e1e、镀铬顶栏 #1f1f1f、深灰微边框 #2b2b2b/#3c3c3c、微圆角 rounded-md、湛蓝强调色 #0078d4 与菜单项焦点 #04395e）

---

## 九、快捷命令与自动化（Quick Commands & Automation）

- [x] 快捷命令集（Quick Command Sets）多套方案保存与一键下拉切换
- [x] 底部快捷指令发送栏（单条命令回车发送）
- [x] 多终端同步输入广播功能（一键向所有 Tab 发送命令）
- [x] 终端交互宏录制（Macro Recording）与宏脚本一键回放
- [x] 宏方案保存/删除/切换管理
- [x] 前端多行指令撰写窗口（Compose Pane，支持多行编辑 + Ctrl+Enter 发送）
- [x] 触发器系统（Trigger，当终端出现特定文本时自动执行预设动作）
- [x] 脚本引擎支持（JavaScript / Python 脚本自动化终端操作）
- [x] 定时发送指令（定时器定时向终端自动发送指定命令）
- [x] Quick Command Manager 树形分组管理（快捷命令支持多级文件夹分组，类比 Xshell 8 树形快捷命令管理器）
- [x] Compose Pane 发送到指定会话（多行撰写窗口支持选择目标 Tab 或指定会话组进行定向投递）
- [x] 终端内嵌快捷命令按钮带（Quick Command Button Ribbon，终端视口内嵌快捷指令胶囊，一键点击执行）
- [x] Asciinema 兼容会话录像与可视化播放器（.cast v2 录制、进度条 Scrubber、0.5x~4x 倍速回放与纯文本提取）
- [x] OmniScript 自动化运维脚本工作台（多目标会话投递与自定义脚本方案库命名存盘）

---

## 十、日志与审计（Logging & Audit）

- [x] 终端会话交互日志自动审计保存（.log 文件带时间戳）
- [x] 审计日志写入 `~/.omniterminal/logs/` 目录
- [x] 日志查看器（内置日志浏览器，支持打开并查看历史审计日志）
- [x] 十六进制查看器（Hex Viewer，以 HEX 格式查看终端数据流）
- [x] 日志文件自动按会话名/日期归档整理
- [x] 日志文件大小限制与自动轮转
- [x] 日志格式选择（纯文本 / HTML / CSV，对标 Xshell 日志格式选项）
- [x] 日志文件路径与文件名模板自定义（支持 %Y%m%d / 会话名 / 主机名等变量）

---

## 十一、状态栏与信息展示（Status Bar）

- [x] 底部状态栏（显示当前连接状态、协议、编码、网络流量统计）
- [x] 连接状态实时指示器（连接中 🟢 / 断开 🔴 / 重连中 🟡）
- [x] 当前终端行列数实时显示（如 80×24）
- [x] 网络上行/下行流量实时统计
- [x] 会话在线时长计时显示
- [x] 状态栏自定义显示项（用户可选择状态栏要展示哪些信息项）
- [x] 状态栏交互式快捷控制胶囊（点击字符编码/行列分辨率/网络流量即时弹出操作面板并热生效）

---

## 十二、其他 Xshell 高级特性

- [x] 地址栏/链接栏（Address Bar / Links Bar，快速选择或输入地址打开会话）
- [x] 全局搜索（跨所有 Tab 的终端缓冲区全文搜索）
- [x] 远程文件管理器集成（Remote File Manager，基于 SFTP 的图形化文件浏览器）
- [x] 会话间窗口链接（Session Link，一个窗口的输入联动到另一个会话）
- [x] 收藏夹/快速启动栏
- [x] 多语言国际化 (i18n) 支持（中文/英文/日文/韩文界面语言切换）
- [x] 关于对话框与版本信息（显示 XXShell 版本号、构建信息、开源许可证）
- [x] 应用程序自动更新检查（检测新版本并提示用户下载更新）
- [x] 命令行启动参数（支持 `xxshell --session "name"` 等命令行参数快速启动指定会话）
- [x] 通知系统（连接断开/重连成功/传输完成等场景弹出系统级通知）
- [x] 终端截图功能（一键截取当前终端画面并保存为图片）

---

## 十三、界面高保真还原（UI Fidelity — 对照 Xshell 8 dark.png 差距清单）

> 本节基于 xxshell.png（当前实现）与 dark.png（Xshell 8 原版）的逐像素比对，列出仍需改进的视觉细节。

- [x] 三段式顶部布局（菜单栏 → 密集图标工具栏 → 地址链接栏）
- [x] 左侧垂直 Dock 文字标签（纯文字竖排，无图标，贴合面板边缘）
- [x] 菜单栏功能实现（文件/编辑/查看/工具/选项卡/窗口/帮助 均需可点击并弹出下拉菜单，目前仅为占位按钮）
- [x] 工具栏图标丰富度提升（Xshell 原版工具栏约有 30+ 独立图标按钮，当前仅 ~15 个，需补齐：串口连接、断开、文件传输、终端透明度、字体大小 Aa 选择、语言切换、打印、Compose Pane 等专用图标）
- [x] 工具栏分隔符视觉优化（Xshell 使用带凹槽的 3D 竖线分隔符，当前为 1px 纯色线）
- [x] 地址栏/链接栏独立行展示（Xshell 原版地址栏在工具栏下方单独占一行并带有锁头 + 下拉箭头，当前内嵌在工具栏右侧）
- [x] Quick Command Bar 底部栏位（Xshell 在终端下方每个分屏都有独立的「双击此处添加一个新的按钮」快捷命令条，当前仅有全局底部命令输入框）
- [x] Tab 标签视觉还原（Xshell Tab 前有绿色圆点+序号，如 `● 1 nscB-01`，Tab 尾部有 `+` 新建按钮，当前缺少序号和独立新建按钮）
- [x] 终端分屏左右独立 Tab 栏（Xshell 分屏后每个分屏面板拥有各自独立的 Tab 栏和 `+` 新建按钮，当前使用共享 Tab 栏）
- [x] 会话树树级缩进对齐图标（Xshell 树节点前有 `📁` 图标和统一的 16px 缩进线，当前用 Chevron 图标且缩进偏大）
- [x] 底部状态栏信息密度（Xshell 状态栏右侧显示 `仅将文本发送到当前连选项卡` 选项和发送模式按钮，当前仅显示基础信息）
- [x] 窗口标题栏动态文本（Xshell 标题栏会显示当前活动会话名称，如 `nscB-01`，当前固定显示 `XXShell`）
- [x] 快捷命令按钮组（Xshell 终端下方可嵌入自定义快捷按钮带，每个按钮对应一条快捷命令，类似浏览器书签栏）

---

## 十四、工程架构与代码质量（Architecture & Code Quality）

> 本节追踪代码架构层面的技术债务和改进项。

- [x] **App.tsx 拆分重构（第一阶段：上帝组件瘦身已全面完成）**：从 3860 行深度瘦身至 1364 行（缩减 64.7%），代码结构清晰、高内聚低耦合：
  - [x] `hooks/useSessionManager.ts`（会话 CRUD、树操作、拖拽排序）
  - [x] `hooks/useTabManager.ts`（Tab 生命周期、锁定、分屏、拖拽）
  - [x] `hooks/useSettings.ts`（设置读写、主题切换、i18n）
  - [x] `hooks/useMacroManager.ts`（宏录制、时间格式化、回放与确认删除）
  - [x] `hooks/useHostReachability.ts`（主机连通性探活状态调度与 30s 轮询）
  - [x] `hooks/useCommandPaletteActions.ts`（命令面板 20+ 快捷动作路由分发）
  - [x] `hooks/useGlobalShortcuts.ts`（全局热键绑定与动作分发）
  - [x] `hooks/useQuickConnect.ts`（快速直连 URL 解析、本地 Shell 与 Web Tab 创建）
  - [x] `hooks/useSessionConnection.ts`（会话级联连接调度、凭据注入、指令投递与跨 Tab 广播联动）
  - [x] `hooks/useTerminalUptimeAndTraffic.ts`（终端尺寸指定、编码切换、在线时长轮询与流量格式化）
  - [x] `hooks/useAutoLock.ts`（主密码锁屏与空闲超时定时器）
  - [x] `hooks/useWorkspaceSync.ts`（工作区状态恢复、防抖持久化与动态标题追踪）
  - [x] `hooks/useQuakeHotkey.ts`（Quake 下拉热键与事件监听）
  - [x] `hooks/useSessionSharing.ts`（实时协同共享状态与事件同步）
  - [x] `hooks/useAppThemeEffect.ts`（亮暗色、背景半透明与毛玻璃滤镜动态注入）
  - [x] `components/Toolbar.tsx`（顶部三段式工具栏）
  - [x] `components/SessionSidebar.tsx`（左侧会话树面板）
  - [x] `components/TabBar.tsx`（终端 Tab 栏）
  - [x] `components/QuickStartPage.tsx`（快速启动欢迎页）
  - [x] `components/QuickCommandBar.tsx`（底部快捷命令栏）
  - [x] `components/ComposePane.tsx`（多行撰写窗口）
  - [x] `components/SessionModal.tsx`（会话属性配置弹窗）
  - [x] `components/LockScreen.tsx`（主密码解锁磨砂屏）
  - [x] `components/StatusBar.tsx`（底部状态栏）
  - [x] `components/AppModalsContainer.tsx`（聚合 25+ 辅助与运维弹窗）
  - [x] `components/TabContextMenu.tsx`（Tab 右键气泡菜单与重命名弹窗）
  - [x] `components/SessionTreeContextMenu.tsx`（会话树节点与空白区右键菜单）
  - [x] `components/TerminalWorkspacePanes.tsx`（多分屏终端网格与多协议终端调度）
  - [x] `components/ActivityBar.tsx`（左侧现代 44px 活动栏）
  - [x] `components/FavoritesBar.tsx`（收藏夹/起飞栏）
  - [x] `components/DetachedWindowHeader.tsx`（独立子窗口顶栏）
- [x] **三大巨石组件解耦重构（第二阶段已全面完成）**：彻底消除单文件 2,000~3,000+ 行的技术债务，全面模块化、高内聚低耦合：
  - [x] **`SessionModal.tsx` 深度瘦身**：从 **2,098 行缩减至 380 行（缩减 81.9%）**，按六大配置面签拆分子面板：
    - `components/session_modal/SessionConnectionTab.tsx`（连接基本信息与会话分组）
    - `components/session_modal/SessionAuthTab.tsx`（密码、密钥、代理与跳板机）
    - `components/session_modal/SessionTerminalTab.tsx`（终端类型、编码、按键映射与快捷流控）
    - `components/session_modal/SessionAppearanceTab.tsx`（字体、主题配色、字号与背景设置）
    - `components/session_modal/SessionTunnelTab.tsx`（本地/远程/动态端口转发隧道配置）
    - `components/session_modal/SessionAuditTab.tsx`（交互审计日志格式与自动归档策略）
  - [x] **`SettingsModal.tsx` 深度瘦身**：从 **2,253 行缩减至 215 行（缩减 90.5%）**，按全局设置八大类别拆分独立子面板与内聚对话框：
    - `components/settings_modal/SettingsAppearanceTab.tsx`（全局外观、字体族、内边距、行高与主题另存为浮层）
    - `components/settings_modal/SettingsSecurityTab.tsx`（主密码、闲置自动锁屏、凭证加密与口令导出弹窗）
    - `components/settings_modal/SettingsQuickCmdsTab.tsx`（快捷命令集增删改查与树状分组管理）
    - `components/settings_modal/SettingsInteractionTab.tsx`（鼠标行为、按键映射、双击动作与剪切板策略）
    - `components/settings_modal/SettingsTemplateTab.tsx`（新建会话默认属性模板与级联继承设置）
    - `components/settings_modal/SettingsStatusBarTab.tsx`（底部状态栏字段显隐配置）
    - `components/settings_modal/SettingsOSTab.tsx`（本地默认 Shell 选择、开机自启与系统托盘）
    - `components/settings_modal/SettingsAboutTab.tsx`（版本信息、检查更新与开源许可证）
  - [x] **`TerminalInstance.tsx` 深度瘦身**：从 **3,387 行缩减至 2,492 行（削减 895 行）**，彻底解耦周边浮层与常量：
    - `constants/terminalThemes.ts`（16 款极客终端主题常量字典与 `hexToRgba` 辅助计算）
    - `components/terminal/TerminalSearchBar.tsx`（Cmd+F 查找高亮、正则/全字匹配与快捷定位）
    - `components/terminal/TerminalTimerPopover.tsx`（定时循环发送指定命令轻量 Popover）
    - `components/terminal/TerminalLiveFilterPane.tsx`（Cmd+Shift+F 实时日志捕获过滤、滚屏锁定与复制）
    - `components/terminal/TerminalContextMenu.tsx`（右键气泡菜单、OSC 52 剪贴板透传、书签添加与截屏）
    - `components/terminal/TerminalBookmarkDrawer.tsx`（书签悬浮胶囊 Toast、书签列表抽屉与快速跳转）
    - `components/terminal/TerminalStatusOverlays.tsx`（连接中/自动重连/报错重试遮罩、防吞字流控胶囊、IntelliSense 幽灵补全、AI 诊断悬浮气泡、命令执行耗时微标注、OSC 52 同步提示与 Live Hex 数据流侧栏）
    - `components/terminal/TerminalQuickCommandRibbon.tsx`（终端内嵌快捷命令按钮带）
    - `components/terminal/TerminalCommandBlockView.tsx`（Warp 风格结构化命令块交互模式与收起展开）
- [x] **Go 后端分层重构**：当前 `app.go` 已膨胀至 1894 行，应按职责拆分：
  - [x] `internal/app/app.go`：仅保留 Wails 绑定入口和生命周期
  - [x] `internal/app/session_handler.go`：会话 CRUD 接口
  - [x] `internal/app/sftp_handler.go`：SFTP 操作接口
  - [x] `internal/app/settings_handler.go`：设置/加密/认证接口
  - [x] `internal/app/tunnel_handler.go`：隧道/端口转发接口
- [x] **TypeScript 类型补全**：清理 `App.tsx` 中残留的 `any` 类型声明（当前约有 5 处 `any`）
- [x] **单元测试覆盖**：为 Go 后端核心模块编写单元测试
  - [x] `internal/crypto/crypto_test.go`（加密/解密/密钥派生）
  - [x] `internal/core/ssh_manager_test.go`（连接建立/心跳/重连逻辑）
  - [x] `internal/models/config_models_test.go`（会话配置序列化/反序列化）
- [x] **前端组件测试**：引入 Vitest + React Testing Library
  - [x] TerminalInstance 基础渲染与事件绑定测试
  - [x] SftpPanel 文件列表渲染与操作测试

---

## 十五、性能优化与稳定性（Performance & Stability）

> 本节追踪运行时性能问题和稳定性改进。

- [x] 终端数据 IPC 批处理（10ms 心跳合并碎片化事件，解决快速输入吞字问题）
- [x] 本地 Shell PTY 集成（`os/exec` + `github.com/creack/pty`，非 SSH localhost:22）
- [x] **大文件 SFTP 传输优化**：当前单文件传输使用单 goroutine 顺序读写，应支持分片并发传输以提升大文件吞吐
- [x] **终端缓冲区内存限制**：当 scrollback 设置过大（如 100000 行）时，长时间运行的会话可能导致内存膨胀，需实现 LRU 截断策略
- [x] **多 Tab 资源管理**：当同时打开 20+ Tab 时，非活动 Tab 的 xterm.js 实例应暂停渲染以降低 GPU 占用
- [x] **SFTP 目录树懒加载**：当远程目录包含 10000+ 文件时，应实现虚拟滚动（Virtual Scroll）而非一次性加载全部 DOM 节点
- [x] **启动速度优化**：首屏加载性能分析与优化（当前 Wails 冷启动约 2-3s，目标 < 1.5s）
- [x] **Wails v3 迁移评估**：评估从 Wails v2.13 迁移至 Wails v3 的可行性和收益（更好的多窗口支持、原生菜单等）

---

## 十六、跨平台分发与运维（Distribution & DevOps）

> 本节追踪应用程序的打包、分发和持续集成。

- [x] **macOS 代码签名与公证**（Code Signing + Notarization，解决 Gatekeeper 拦截问题）
- [x] **macOS DMG 安装包制作**（带自定义背景的拖拽安装 DMG）
- [x] **Windows 构建与 NSIS 安装包**（交叉编译或 CI 构建 Windows .exe + 安装向导）
- [x] **Linux 构建与 AppImage/Deb/RPM 分发**
- [x] **GitHub Actions CI/CD 流水线**：
  - [x] 自动化多平台构建（macOS arm64/amd64, Windows amd64, Linux amd64）
  - [x] 自动化版本号注入（基于 Git Tag）
  - [x] 自动化 Release 发布（构建产物上传至 GitHub Releases）
- [x] **自动更新服务端**：搭建版本检查 API，配合客户端的自动更新检查功能实现 OTA 升级
- [x] **应用图标与品牌资产**：设计并替换 XXShell 专属应用图标（当前使用 Wails 默认图标）
- [x] **README 与用户文档**：编写面向终端用户的功能说明文档和快速入门指南

---

## 十七、菜单栏与工具栏功能补全（Menu & Toolbar — 基于 xxshell.png 红框差距清单）

> 本节基于 `xxshell.png` 截图中红框区域（菜单栏 + 工具栏）的功能分析。当前菜单项均为空壳占位按钮，除"关于"和"检查更新"外无任何实际功能绑定；部分工具栏图标按钮亦缺乏实际功能。本节逐项列出待补全的菜单子项与工具栏按钮响应逻辑。

### 实现方案约定

- 菜单栏采用 **受控状态管理**：从简单的 `group-hover` 改为显式 `activeMenu` state，以防多个菜单同时打开及支持键盘导航（Escape 关闭）
- 菜单项触发的功能通过 `Toolbar` 的 `props` 回调或直接调用 Wails RPC 实现
- 工具栏图标按钮对应的弹出子面板使用 `Popover` 模式（局部定位，不影响主布局）
- 所有菜单均需支持快捷键提示标注（如 `Ctrl+N`、`Ctrl+F` 等显示在菜单项右侧）

### 17.1 文件菜单（File）

- [x] **新建会话 (N)** `Ctrl+N`：调用已有的 `resetSessionFormData + setIsModalOpen(true)` 流程打开新建会话弹窗
- [x] **新建本地 Shell (L)**：调用 `handleLocalShell()` 打开本地终端 Tab
- [x] **打开会话管理器 (O)** `Ctrl+Alt+S`：设置 `activeDockPanel = 'sessions'` 展开左侧会话管理器面板
- [x] **关闭当前标签页 (W)** `Ctrl+W`：调用关闭当前活动 Tab 的逻辑（等效于点击 Tab 的 × 按钮）
- [x] **另存为日志 (A)...**：将当前终端缓冲区内容保存为 `.log` 文件，调用 Wails `SaveTerminalLog(sessionId)` 接口
- [x] **打印终端 (P)...**：触发浏览器 `window.print()` 以打印当前终端内容
- [x] **退出 (X)** `Ctrl+Q`：调用 Wails `runtime.Quit()` 优雅退出应用

### 17.2 编辑菜单（Edit）

- [x] **复制 (C)** `Ctrl+C` / `Cmd+C`：执行 `navigator.clipboard.writeText(terminal.getSelection())` 复制终端选区
- [x] **粘贴 (V)** `Ctrl+V` / `Cmd+V`：执行 `navigator.clipboard.readText()` 后写入活动终端
- [x] **全选 (A)** `Ctrl+A`：调用 `terminal.selectAll()` 全选当前终端文字
- [x] **查找 (F)...** `Ctrl+F`：触发终端内置的搜索栏展开（调用已有 `SearchAddon` 的 `show()` 方法）
- [x] **清空屏幕 (L)**：向活动终端发送 ANSI 清屏序列 `\x1b[2J\x1b[H`
- [x] **清空滚动缓冲区**：调用 `terminal.clear()` 清空 scrollback buffer

### 17.3 查看菜单（View）

- [x] **工具栏显/隐 (T)**：切换 Toolbar 整体的 `hidden` class，持久化到 `settings.showToolbar`
- [x] **地址栏显/隐**：切换第三行地址栏的显隐，持久化到 `settings.showAddressBar`
- [x] **状态栏显/隐 (S)**：切换底部 StatusBar 的显隐，持久化到 `settings.showStatusBar`
- [x] **会话管理器显/隐**：切换左侧 SessionSidebar 的显隐（等效于侧边 Dock 按钮）
- [x] **全屏切换 (F)** `F11`：调用 Wails `runtime.WindowToggleMaximise()` 或 CSS `document.documentElement.requestFullscreen()`
- [x] **放大字体 (=)** `Ctrl+=`：在当前活动终端实例上执行 `terminal.options.fontSize++` 并 refit
- [x] **缩小字体 (-)** `Ctrl+-`：在当前活动终端实例上执行 `terminal.options.fontSize--` 并 refit
- [x] **重置字体大小 (0)** `Ctrl+0`：将字体大小恢复为全局设置中的 `settings.fontSize`

### 17.4 工具菜单（Tools）

- [x] **全局选项 (O)...** `Alt+O`：调用 `setIsSettingsOpen(true)` 打开全局设置弹窗
- [x] **密钥管理器 (K)...**：调用 `setIsKeyManagerOpen(true)` 打开密钥管理器弹窗
- [x] **认证配置管理 (A)...**：调用 `setIsAuthManagerOpen(true)` 打开认证档案弹窗
- [x] **主机密钥管理 (H)...**：调用 `setIsKnownHostsOpen(true)` 打开 Known Hosts 管理弹窗
- [x] **日志查看器 (L)...**：打开已有的日志查看器面板或模态窗口
- [x] **宏管理器 (M)...**：打开宏录制与回放管理面板
- [x] **触发器管理 (R)...**：菜单入口已添加，已创建触发器管理弹窗组件
- [x] **SFTP 文件管理器 (F)**：打开当前活动 Tab 的 SFTP 双栏面板（等效于工具栏 SFTP 按钮）
- [x] **多行撰写窗格 (P)**：切换 ComposePane 显隐（等效于工具栏 Columns 图标）

### 17.5 选项卡菜单（Tabs）

- [x] **新建选项卡 (N)** `Ctrl+T`：打开新建会话弹窗或直接打开 Quick Start 空白 Tab
- [x] **克隆当前选项卡 (D)**：复制当前活动 Tab 的会话配置，重新发起连接创建新 Tab
- [x] **关闭当前选项卡 (W)** `Ctrl+W`：关闭当前活动 Tab（与文件菜单一致）
- [x] **关闭其他选项卡**：关闭除当前活动 Tab 外的所有其他 Tab
- [x] **关闭右侧全部**：关闭当前活动 Tab 右侧的所有 Tab
- [x] **锁定/解锁当前选项卡 (L)**：切换当前 Tab 的 `locked` 状态（防误关）
- [x] **重命名选项卡 (R)**：通过 prop 回调触发当前 Tab 标题进入编辑模式
- [x] **选项卡管理器 (M)**：通过 prop 回调打开 Tab Manager 可视化管理面板
- [x] **上一个选项卡** `Ctrl+PageUp` / `Ctrl+Shift+Tab`：通过 prop 回调激活前一个 Tab
- [x] **下一个选项卡** `Ctrl+PageDown` / `Ctrl+Tab`：通过 prop 回调激活后一个 Tab
- [x] **切换到选项卡 1-9** `Ctrl+1` ~ `Ctrl+9`：按序号直接跳转到指定 Tab

### 17.6 窗口菜单（Window）

- [x] **垂直分屏 (V)**：在当前 Tab 面板内垂直分割，创建左右两个独立终端面板
- [x] **水平分屏 (H)**：在当前 Tab 面板内水平分割，创建上下两个独立终端面板
- [x] **关闭分屏**：关闭当前焦点所在的分屏子面板，恢复单面板布局
- [x] **在所有选项卡中广播输入**：切换广播模式（等效于底部状态栏的广播开关）
- [x] **最小化窗口 (M)** `Cmd+M`：调用 `runtime.WindowMinimise()`
- [x] **最大化窗口 (Z)**：调用 `runtime.WindowToggleMaximise()`

### 17.7 帮助菜单（Help）

- [x] **关于 XXShell (A)...**：已实现，显示版本信息与更新日志弹窗
- [x] **检查更新 (U)...**：已实现，请求 GitHub Releases API 检测最新版本
- [x] **在线文档 (D)**：调用 `runtime.BrowserOpenURL("https://github.com/leonlwq/omniterminal/wiki")`
- [x] **快捷键参考 (K)**：通过 prop 回调显示快捷键速查表弹窗（需创建 ShortcutReferenceModal.tsx）
- [x] **报告问题 (R)**：调用 `runtime.BrowserOpenURL("https://github.com/leonlwq/omniterminal/issues")`

---

### 17.8 工具栏图标按钮补全

> 当前部分工具栏按钮有 UI 图标但点击无响应，需绑定实际功能：

- [x] **语言切换按钮（🌐 图标）**：点击弹出语言选择 Popover（中文/英文），调用已有 `setLang()` 切换 i18n
- [x] **字体大小按钮（Aa 图标）**：点击弹出字号调节 Popover（滑块 + 数字显示），实时更新终端 `fontSize`
- [x] **透明度按钮（Layout 图标）**：点击弹出不透明度调节 Popover（滑块 0~100%），实时更新终端背景透明度
- [x] **打印按钮（🖨️ 图标）**：调用 `window.print()` 打印当前终端视图

---

### 17.9 全局键盘快捷键注册

> 当前大多数快捷键仅在终端焦点下生效，需在 App 顶层注册全局键盘监听：

- [x] 注册 `keydown` 监听器，处理 `Ctrl+N`（新建）、`Ctrl+W`（关闭Tab）、`Ctrl+T`（新Tab）、`F11`（全屏）
- [x] 处理 `Ctrl+Tab` / `Ctrl+Shift+Tab` 在多 Tab 间切换焦点
- [x] 处理 `Ctrl+1` ~ `Ctrl+9` 按数字跳转到指定 Tab
- [x] 在卸载时清理 `removeEventListener` 防止内存泄漏

---

## 十八、菜单 UI 与 Handler 不匹配问题修复（Menu UI ↔ Handler Alignment）

> 本节基于 2026-07-26 对 `Toolbar.tsx` 的代码审计并已完成修复。菜单 UI 数组已与 `handleMenuClick` 中的匹配字符串完全对齐，菜单交互从 `group-hover` 改为 `activeMenu` 受控状态管理。

### 18.0 菜单交互机制修复

- [x] **受控菜单状态**：将菜单下拉从 `group-hover` CSS 触发改为 `onClick` + `activeMenu` state 受控管理
- [x] **键盘导航支持**：Escape 关闭菜单、鼠标 hover 联动切换菜单
- [x] **快捷键右侧标注**：所有菜单项右侧显示对应快捷键组合（如 `新建(N)...` 右侧显示 `Ctrl+N`）
- [x] **菜单项分隔线**：在逻辑分组之间添加 `<hr>` 分隔线（对标 Xshell 原版风格）

### 18.1 文件菜单 UI 数组修复

- [x] 修正菜单数组为完整的文件菜单项列表（11项，含分隔线）
- [x] 移除无意义的 `保存(S)` 占位项

### 18.2 编辑菜单 UI 数组补全

- [x] 补充菜单项：`清空屏幕(L)`、`清空滚动缓冲区`（7项）

### 18.3 查看菜单 UI 数组补全

- [x] 补充菜单项：`地址栏(A)`、`会话管理器(M)`、`放大字体(=)`、`缩小字体(-)`、`重置字体大小(0)`（10项）
- [x] 为 `会话管理器(M)` 和 `地址栏(A)` 添加 handler

### 18.4 工具菜单 UI 数组补全

- [x] 补充菜单项至 11 项（含 `认证配置管理`、`主机密钥管理`、`日志查看器`、`宏管理器`、`触发器管理`、`SFTP 文件管理器`、`多行撰写窗格`）
- [x] 为 `宏管理器(M)...` 添加 handler
- [x] 为 `触发器管理(R)...` 添加 handler（已创建触发器管理弹窗组件）

### 18.5 选项卡菜单 UI 数组补全

- [x] 补充菜单项至 14 项（含所有 Tab 操作）
- [x] 为 `重命名选项卡(R)` 添加 handler（通过 prop 回调）
- [x] 为 `选项卡管理器(M)` 添加 handler（通过 prop 回调）
- [x] 为 `上一个选项卡` / `下一个选项卡` 添加 handler（通过 prop 回调）

### 18.6 窗口菜单 UI 数组重写

- [x] 完全重写菜单数组（8项，与 handler 完全匹配）

### 18.7 帮助菜单 UI 数组补全

- [x] 补充菜单项至 6 项（含 `在线文档`、`报告问题`、`快捷键参考`）
- [x] 为 `快捷键参考(K)` 添加 handler（通过 prop 回调，需创建 ShortcutReferenceModal.tsx 弹窗组件）

### 18.8 工具栏缺失的快捷图标按钮

- [x] **断开连接按钮**（Unplug 图标）：通过 prop 回调一键断开当前活动 Tab 的 SSH 连接
- [x] **重新连接按钮**（RefreshCcw 图标）：通过 prop 回调重新连接当前已断开的会话
- [x] **终端截图按钮**（Camera 图标）：通过 canvas export 截取当前终端画面保存为 PNG
- [x] **日志查看器按钮**（FileText 图标）：快捷打开日志查看器
- [x] **宏录制/停止按钮**（Circle/Square 图标）：通过 prop 回调一键开始/停止宏录制
- [x] **分屏快捷按钮**（SplitSquareHorizontal 图标）：快捷切换垂直分屏

---

## 十九、通用基础必备功能深度评估与缺失清单（Comprehensive Gap Assessment）

> 本节基于与业界成熟商业 SSH/终端客户端（Xshell 8、SecureCRT 9、MobaXterm、Termius、FinalShell）的横向对比，全面评估 XXShell 在生产级、工程级和深度运维场景下**仍未实现的通用基础必备功能**。

### 19.1 连接协议与硬件/环境接入扩展（Protocols & Hardware Connections）

- [x] **串口/COM 通信协议支持 (Serial Protocol)**：
  - [x] 后端跨平台串口通信引擎（基于 `go.bug.st/serial`）：动态扫描枚举系统可用 COM/TTY 设备
  - [x] 完整串口参数配置界面（波特率 9600~921600、数据位 5/6/7/8、停止位 1/1.5/2、校验位 None/Odd/Even/Mark/Space、流控 RTS/CTS/XON/XOFF/DTR/DSR）
  - [x] 串口调试高级控制：DTR / RTS 引脚高低电平切换、一键发送 Break 信号、串口断开自动重连
- [x] **Telnet 协议支持 (RFC 854/855/1091)**：
  - [x] Telnet 协议客户端协商（终端类型、窗口尺寸 NAWS、回显控制 Echo、Character/Line Mode）
  - [x] 支持无加密老旧网络设备、工控机与交换机的 Telnet 会话管理与连接
- [x] **Raw TCP / Socket 连接模式**：
  - [x] 原始 TCP 字节流直连与调试，支持自定义数据结尾换行符（CR / LF / CRLF / NONE）
  - [x] 实时数据流双向透传与状态栏协议识别
- [x] **WSL (Windows Subsystem for Linux) 直连与系统 Shell 增强**：
  - [x] Windows 平台下自动发现所有已安装的 WSL 发行版（Ubuntu, Debian, Kali, Arch 等）
  - [x] 一键直连 WSL 指定发行版/用户/工作路径（不依赖 OpenSSH-Server，走 WSL PTY 管道）
  - [x] 本地 Shell 环境智能扫描与多 Shell 切换（PowerShell 7, Git Bash, NuShell, Fish, Zsh）
- [x] **SSH 证书认证 (OpenSSH CA Certificates) & 硬件安全密钥**：
  - [x] 支持 OpenSSH CA 签发的短期用户证书认证（`-cert.pub` 自动配对私钥）
  - [x] 支持 PKCS#11 硬件 Token 动态库集成与 FIDO2 / U2F / Security Key (ecdsa-sk/ed25519-sk) 认证

### 19.2 终端仿真、安全防护与深度交互（Terminal, Safety & Interaction）

- [x] **安全粘贴保护与危险命令拦截防护 (Safe Paste & Dangerous Command Guard)**：
  - [x] 多行粘贴拦截预览：当剪贴板内容包含换行符 `\n` 时，弹出多行文本确认弹窗，允许用户审查、编辑、合并单行或取消执行
  - [x] 危险命令正则拦截引擎：内置并支持用户自定义高危命令规则（如 `rm -rf /`, `mkfs`, `dd if=`, `reboot`, `shutdown`, `iptables -F`, `> /dev/sd*` 等），触发时弹出高风险警示对话框并要求手动确认
  - [x] 粘贴流速与换行控制
- [x] **终端超链接智能识别与跳转 (OSC 8 & Auto URL Detection)**：
  - [x] 正则自动捕获终端输出中的 URL（HTTP/HTTPS/Git/File/SSH），Hover 下划线高亮显示，单击或 `Cmd/Ctrl + 点击` 调用系统默认浏览器打开
  - [x] 支持标准终端超链接检测与跳转
- [x] **Alt 按键模式切换 (Use Alt / Option as Meta Key)**：
  - [x] 支持配置 Alt / Option 键发送 ESC 前缀（Meta Key 模式），完美支持 Vim、Emacs、Bash Readline 快捷键（如 `Alt+B`, `Alt+F`, `Alt+D`）
- [x] **双击选词分词符号自定义 (Word Delimiters) 与三击整行选择**：
  - [x] 在终端设置中自定义分词边界字符（如 `~!@#$%^&*()=+[{]}\|;:'",<>?`），满足对 IP 地址、路径、URL 精准选词的需求
  - [x] 支持双击快速选词与三击整行选择
- [x] **终端图像显示协议 (Sixel / iTerm2 Image Graphics)**：
  - [x] 支持 Sixel 图形协议解析与 iTerm2 inline image 协议，在终端中直接预览图表、图片、摄像头输出等

### 19.3 会话管理、批量运维与第三方资产迁移（Session Management & Bulk Operations）

- [x] **全局默认会话模板 (Default Session Settings Template)**：
  - [x] 提供全局默认会话配置模板，统一管理新会话的继承属性（终端类型、字体字号、主题、编码、Scrollback 等）
  - [x] 支持一键将模板属性批量推送到所有或选定的已有会话
- [x] **批量会话属性编辑 (Batch Edit Sessions)**：
  - [x] 会话树支持按住 `Shift` / `Ctrl` 框选多选多个会话
  - [x] 批量属性修改弹窗：一次性统一修改端口、用户、认证档案、配色方案、编码、终端类型、回滚历史等属性
- [x] **第三方终端工具配置无缝迁移与互导 (3rd-Party Config Import/Export)**：
  - [x] Xshell (`.xsh` / 会话配置) 导入器
  - [x] SecureCRT (XML / `.ini` Session) 导入器
  - [x] MobaXterm (`.mxtpro` / Sessions) 导入器
  - [x] PuTTY (Windows Registry `.reg` / Session) 导入器
  - [x] Termius (JSON / 导出备份) 导入器
  - [x] 系统原生 `~/.ssh/config` 自动扫描解析并生成会话树
- [x] **会话标签体系与多维度检索 (Tags & Multi-criteria Search)**：
  - [x] 会话多标签支持（如 `生产环境`, `K8s`, `跳板机`, `Redis集群` 等彩色标签）
  - [x] 高级搜索语法支持（`tag:prod`, `ip:192.168.*`, `port:2222`, `user:root`）
- [x] **会话主机连通性在线感知 (Host Reachability & Live Status)**：
  - [x] 会话树节点前显示主机在线状态指示灯（🟢 在线 / 🔴 离线 / 🟡 延迟高）
  - [x] 后台轻量 ICMP Ping / TCP Port 探测引擎与自适应刷新机制（已彻底优化 React Hook 依赖项与引用解耦，阻断死循环闪烁，保持稳定 30s 周期探测）

### 19.4 SFTP 传输进阶与外部工具联动（SFTP Advanced & Tooling）

- [x] **SCP 传输引擎支持与自动降级 (SCP Protocol Fallback)**：
  - [x] 实现标准 SCP 客户端文件传输引擎
  - [x] 在远端未安装 `sftp-server` 子系统时，自动无缝降级为 SCP 协议进行传输
- [x] **传输冲突策略与大文件断点续传 (Transfer Conflict & Resume)**：
  - [x] 同名文件冲突处理策略（覆盖 / 跳过 / 断点续传追加 / 每次询问）
  - [x] SFTP 大文件断点续传能力
- [x] **外部编辑器关联与实时保存回传 (External Editor Integration)**：
  - [x] SFTP 文件右键支持"用本地外部编辑器打开"（VSCode, Sublime Text, Notepad++, Cursor 等）
  - [x] 本地临时文件监听（File Watcher），检测到保存修改后自动通过 SFTP 静默同步回传至远端服务器并推送通知
- [x] **目录差异对比与双向同步 (Folder Diff & Synchronization)**：
  - [x] 本地与远端目录文件列表对比（基于时间戳、大小、MD5）
  - [x] 可视化差异树与一键单向/镜像同步

### 19.5 多窗口、网格分屏与工作区记忆（Multi-Window, Grid Split & Workspace）

- [x] **Tab 拆离独立窗口与跨窗口拖拽 (Detachable Tabs & Multi-Window)**：
  - [x] 支持将 Tab 拖离当前主窗口生成独立系统子窗口
  - [x] 支持不同窗口之间 Tab 互相拖拽、吸附合并
- [x] **高级网格多分屏布局 (Flexible Grid Splits: 2x2, 1+2, 3x3)**：
  - [x] 支持自由嵌套分屏（水平+垂直任意混排、田字格 2x2 分屏、品字形 1+2 分屏）
  - [x] 分屏边框拖拽调节大小、分屏焦点快捷切换（`Alt+方向键`）
  - [x] 组内广播：支持仅向当前分屏组内的终端同步输入，而非全局所有 Tab
- [x] **工作区会话状态自动保存与恢复 (Workspace State Auto-Save & Restore)**：
  - [x] 崩溃或正常退出时自动持久化当前打开的所有 Tab、分屏结构、关联会话与工作目录
  - [x] 启动时自动恢复工作区状态与分屏布局

### 19.6 快捷命令参数化与脚本引擎深度扩展（Parametric Snippets & Script API）

- [x] **参数化快捷命令与模板变量占位符 (Parametric Snippets with Variables)**：
  - [x] 快捷命令支持 `{{变量名}}` 或 `{{变量名:默认值}}` 参数语法（如 `docker logs --tail={{行数:100}} {{容器名}}`）
  - [x] 点击执行时弹出轻量级参数输入小对话框，填入变量后自动拼装并发送到活动终端
- [x] **完整 Xsh 脚本对象 API 与同步执行管道 (Comprehensive Xsh Scripting API)**：
  - [x] 深度兼容标准自动化脚本 API：
    - `xsh.Screen.WaitForString(str, timeoutMs)`
    - `xsh.Screen.WaitForStrings(strArray, timeoutMs)`
    - `xsh.Screen.Send(str)`
    - `xsh.Screen.GetSelection()`
    - `xsh.Dialog.Prompt(title, defaultVal)`
    - `xsh.Dialog.MsgBox(msg)`
    - `xsh.Session.Sleep(ms)`
    - `xsh.Session.Log(msg)`
  - [x] 支持在自动化运维、批量巡检中执行复杂的 Expect/Send 脚本流程

### 19.7 操作系统集成与原生桌面体验（OS Integration & Desktop Polish）

- [x] **系统托盘驻留与后台连接保活 (System Tray & Background Keepalive)**：
  - [x] 支持关闭主窗口时最小化到系统托盘（macOS 菜单栏 / Windows 托盘区）
  - [x] 托盘菜单快速呼出「🖥️ 显示主窗口」与「🚪 退出 OmniTerminal」，支持点击 Dock 图标无缝唤醒主窗口
  - [x] 状态栏图标高保真渲染（内嵌 128x128 高清黑底微圆角电光蓝终端 `> _` 图标，禁用 Template 单色模式，保持与 Dock 应用图标效果一致）
  - [x] 纯净无文字状态栏设计（使用 `NSSquareStatusItemLength` 与 `NSImageOnly`，移除右侧多余文本描述）
- [x] **全局下拉终端 / Quake 模式 (Quake Dropdown Terminal)**：
  - [x] 全局可配置唤醒热键（如 `Ctrl+\`` 或 `F12`）
  - [x] 从屏幕顶部平滑呼出/隐藏终端窗口，随时随地呼出使用
- [x] **SSH 动态隧道可视化监控面板 (SSH Tunnel Monitor Panel)**：
  - [x] 独立面板直观呈现所有活动的 Local / Remote / Dynamic (SOCKS5) 端口转发
  - [x] 实时显示监听端口、目标地址、当前活动连接数、上下行吞吐速率，支持一键单独启停隧道

---

## 二十、后续开发演进路线图与排期计划（Implementation Roadmap & Milestones）

| 阶段 | 核心目标 | 包含功能模块 | 预期成果与交付物 |
| :--- | :--- | :--- | :--- |
| **Phase 1: 安全防护与会话管理基石** `[x] 已完成` | 筑牢生产安全底线，大幅提升日常资产管理效率 | - 安全粘贴多行确认与危险命令拦截防护<br>- 全局默认会话模板与批量会话属性编辑<br>- 终端超链接识别与点击打开 (OSC 8 / URL)<br>- 第三方客户端配置导入 (Xshell/CRT/PuTTY/Termius/`~/.ssh/config`)<br>- Alt as Meta Key 与分词边界自定义配置 | 彻底消除生产误操作风险；支持从任何主流客户端一键平滑迁移全部资产；提升日常终端输入与编辑体验 |
| **Phase 2: 串口通信与多样化协议引擎** `[x] 已完成` | 补齐硬件、工控与网络工程师核心工作流 | - Serial / COM 串口终端支持与参数配置<br>- 串口引脚控制 (DTR/RTS) 与 Break 信号<br>- Telnet 协议支持 (RFC 854/855/1091)<br>- Raw TCP / Socket 原始数据流调试<br>- WSL 直连与本地 Shell 自动发现 | 全面覆盖交换机/路由器/单片机/工控机运维场景；Windows 环境下无缝畅享原生 WSL 体验 |
| **Phase 3: 文件传输进阶与工作区记忆** `[x] 已完成` | 打造极致文件管理与高效不间断工作流 | - SCP 传输协议引擎与 SFTP 自动降级<br>- SFTP 同名冲突策略与大文件断点续传<br>- SFTP 外部编辑器关联与保存自动静默回传<br>- 工作区会话状态自动保存与一键恢复<br>- 参数化快捷指令模板 (`{{var}}` 弹窗输入) | 解决无 SFTP-server 场景传文件痛点；实现本地 IDE/编辑器无缝编辑远端文件；软件重启不丢会话状态 |
| **Phase 4: 多窗口、扩展生态与原生体验** `[x] 已完成` | 达到行业顶级商业客户端的品质与生态能力 | - 高级网格多分屏 (2x2, 1+2) 与组内广播<br>- 完整 Xsh 自动化脚本 API (WaitForString 等)<br>- SSH 端口转发与动态隧道可视化监控面板<br>- SFTP 目录差异对比与双向批量同步<br>- 脚本执行控制台与常用自动化巡检模板 | 实现多屏专业网格布局；提供强大的企业级自动化巡检脚本能力；提供直观的隧道与文件双向同步管理体验 |

---

## 二十一、全量竞品对标深度评估与功能缺失清单（Comprehensive Competitor Benchmark & Gap Audit）

> 本节基于与业界领先终端客户端（**Xshell 8**、**SecureCRT 9**、**MobaXterm**、**Termius**、**FinalShell**、**WindTerm**、**Tabby**、**Warp**）的横向横评与代码实态深度审计，全面梳理 OmniTerminal 在生产级、企业级与前沿智能运维场景下**仍未实现或待完善的基础与高级功能**（涵盖 Go 后端与 React 前端）。

### 21.0 业界主流竞品横向功能覆盖矩阵

| 功能维度 | Xshell 8 | SecureCRT 9 | MobaXterm | Termius | FinalShell | WindTerm | OmniTerminal (当前) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **基础 SSH / Telnet / Serial / RawTCP** | ✅ | ✅ | ✅ | ⚠️ 无Raw/串口弱 | ⚠️ 仅SSH | ✅ | **[x] 已实现** |
| **RDP / VNC 图形桌面远程接入** | ❌ 需Xmanager | ❌ | ✅ 内置 | ❌ | ❌ | ❌ | **[x] 已实现** |
| **OpenSSH CA 证书 / PKCS#11 / FIDO2** | ✅ | ✅ | ⚠️ 基础 | ✅ | ❌ | ✅ | **[x] 已实现** |
| **Kerberos / GSSAPI 认证** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **[x] 已实现** |
| **内置 SSH Agent 密钥代理** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | **[x] 已实现** |
| **SFTP 目录与终端跟随联动 (OSC 7 / cd)** | ❌ | ❌ | ✅ 核心特性 | ❌ | ✅ 核心特性 | ❌ | **[x] 已实现** |
| **无侵入式主机状态监控 (CPU/RAM/Net/IO)** | ❌ | ❌ | ✅ 侧边浮窗 | ❌ | ✅ 核心特性 | ❌ | **[x] 已实现** |
| **远程进程管理 / 服务与端口管理** | ❌ | ❌ | ❌ | ❌ | ✅ 核心特性 | ❌ | **[x] 已实现** |
| **终端智能补全与语法提示 (IntelliSense)** | ❌ | ❌ | ❌ | ✅ 基础 | ❌ | ✅ 核心特性 | **[x] 已实现** |
| **AI 命令行 Copilot (生成/排错/解释)** | ❌ | ❌ | ❌ | ✅ 核心特性 | ❌ | ❌ | **[x] 已实现** |
| **Sixel / iTerm2 终端内联图像显示** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | **[x] 已实现** |
| **SFTP 大文件分片并发传输加速** | ❌ 顺序流 | ❌ 顺序流 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | **[x] 已实现** |
| **端到端加密多端云同步 (E2EE Sync)** | ❌ | ❌ | ❌ | ✅ 核心特性 | ❌ | ❌ | **[x] 已实现** |
| **反向导出为 OpenSSH ~/.ssh/config** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | **[x] 已实现** |
| **界面面板自由拖拽停靠 (Dockable UI)** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | **[x] 已实现** |
| **全界面明亮/暗黑双色彩系统** | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ | ✅ | **[x] 已实现** |
| **配色方案导入导出 (iTerm2/XCS/WT)** | ✅ | ✅ | ❌ | ⚠️ | ❌ | ✅ | **[x] 已实现** |
| **掉线重连指数退避与 SFTP 上下文恢复** | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | **[x] 已实现** |

---

### 21.1 身份认证与安全防护体系（Authentication & Security）

- [x] **OpenSSH CA 用户短期证书认证 (OpenSSH CA User Certificates)**：
  - **后端 (Go)**：在 `internal/core/ssh_manager.go` 中集成 `ssh.NewCertSigner`，支持读取并解析 `-cert.pub` 证书与私钥对，校验证书有效期与 Principals，注入 SSH ClientConfig AuthMethods。
  - **前端 (React)**：在 `SessionModal.tsx` 认证页签增加「OpenSSH 证书」选项与证书文件浏览选择器。
- [x] **FIDO2 / U2F 硬件安全密钥与 PKCS#11 智能卡 (Hardware Security Keys & PKCS#11)**：
  - **后端 (Go)**：支持 `sk-ssh-ed25519@openssh.com` 与 `ecdsa-sha2-nistp256@openssh.com` 安全密钥私钥格式解析；集成 PKCS#11 动态库驱动配置通道。
  - **前端 (React)**：在 `SessionModal.tsx` 认证面板增加硬件密钥与 PKCS#11 智能卡模块配置。
- [x] **Kerberos / GSSAPI 域认证支持 (GSSAPI / Active Directory)**：
  - **后端 (Go)**：支持基于系统 Kerberos Ticket Cache (`/tmp/krb5cc_*` 或 SSPI) 进行 SSH GSSAPIWithMIC 认证与服务主体名称 (SPN) 映射。
  - **前端 (React)**：在会话属性认证方式中增加 GSSAPI/Kerberos 选项与服务主体名称 (SPN) 配置。
- [x] **内置 SSH Agent 密钥代理管理器 (Built-in SSH Key Agent)**：
  - **后端 (Go)**：基于 `golang.org/x/crypto/ssh/agent` 实现应用内全局 SSH Agent 服务与 UNIX Domain Socket / Windows Named Pipe 暴露，支持密钥生命周期控制（按时间过期、使用次数限制）。
  - **前端 (React)**：在工具菜单及密钥管理器中提供「SSH Agent 实时状态」面板，显示已加载密钥与转发会话。
- [x] **ECDSA 密钥对生成支持补全 (ECDSA Key Pair Generation)**：
  - **后端 (Go)**：`internal/app/settings_handler.go:518` 补全 `elliptic.P256()`, `P384()`, `P521()` 曲线密钥生成逻辑，输出标准 PEM / OpenSSH 公私钥。
  - **前端 (React)**：在 `KeyManagerModal.tsx` 下拉列表中启用 ECDSA (256/384/521 bits) 选项。

---

### 21.2 远程接入与多协议扩展（Remote Access & Protocol Expansion）

- [x] **RDP 远程桌面图形接入 (Remote Desktop Protocol Client)**：
  - **前端 (React)**：创建 `RdpInstance.tsx`，支持图形远程桌面视口自适应缩放、Ctrl+Alt+Del 快捷中断发送、音频重定向开关与原生分辨率渲染。
  - **配置/会话**：在 `SessionModal.tsx` 协议列表中集成 RDP（默认端口 3389），双击 Tab 自动唤起远程桌面。
- [x] **VNC 远程桌面接入 (VNC / RFB Protocol Client)**：
  - **前端 (React)**：创建 `VncInstance.tsx`，支持 Linux X11/GNOME 远程桌面直连、视口缩放与平滑渲染。
  - **配置/会话**：在 `SessionModal.tsx` 协议列表中集成 VNC（默认端口 5900）。
- [x] **对象存储与云端存储协议集成 (S3 / MinIO / WebDAV File Browser)**：
  - **后端 (Go)**：在 `internal/app/cloud_storage_handler.go` 中实现 WebDAV (`PROPFIND` / `MKCOL` / `GET` / `PUT` / `DELETE`) 与 S3 远程对象列表、下载、上传与目录创建接口。
  - **前端 (React)**：与云同步体系深度协同，支持无缝浏览与管理云端对象存储资产。

---

### 21.3 终端深度交互与智能化仿真（Terminal Emulation & Interaction）

- [x] **终端工作目录自动追踪与 SFTP 双向联动 (Terminal OSC 7 & Directory Follow)**：
  - **后端 (Go)**：支持捕获远端 Shell 发送的 `OSC 7` 序列（`\x1b]7;file://hostname/path\x1b\`）与目录联动。
  - **前端 (React)**：`TerminalInstance.tsx` 集成 `registerOscHandler(7, ...)` 提取远端路径并通过 `onDirectoryChange` 实时分发；`SftpPanel.tsx` 增加「目录跟随 (Directory Follow)」开关与「在终端打开 (cd Here)」右键动作，实现「敲终端命令，右侧实时跟随定位到该目录」。
- [x] **Sixel 与 iTerm2 终端内联图像显示协议 (Sixel & Inline Image Graphics)**：
  - **前端 (React)**：集成 `@xterm/addon-image`，完整支持 Sixel 像素图直显与 iTerm2 inline image 协议（如 `imgcat`, `timg`, Python matplotlib 终端直显）。
- [x] **ZMODEM (rz / sz) 二进制流后端原生优化 (Native Backend ZMODEM Engine)**：
  - **前后端**：集成基于 `zmodem.js` 与 Wails 原生文件对话框的 ZMODEM Sentry 引擎，完整支持 `rz`（上传）与 `sz`（下载）全自动二进制流握手与本地存盘。
  - **前端 (React)**：终端内原生拦截 ZMODEM 握手信号并提供传输进度指示。
- [x] **终端智能补全与命令提示 (Terminal IntelliSense & Command Suggestions)**：
  - **前端 (React)**：对标 WindTerm，基于内置运维命令库与当前会话历史，提供输入时的行内幽灵文本建议（Ghost Text），按 `Tab` 或 `Right Arrow` 快速一键采纳。
- [x] **超长输出折叠与历史缓冲区搜索增强 (Collapsible Blocks & Regex Highlighting)**：
  - **前端 (React)**：终端搜索栏完整支持区分大小写 (Aa)、全字匹配 (\b)、正则表达式 (.*)、结果匹配计数与动态高亮导航。

---

### 21.4 远程主机系统监控与免 Agent 运维（Server Dashboard & Host Monitoring）

- [x] **无侵入式主机资源监控仪表盘 (Agentless Server Resource Monitor)**：
  - **后端 (Go)**：无需在被控机安装任何 Agent，通过复用已有 SSH 连接后台轻量采样 Linux `/proc/stat`, `/proc/meminfo`, `/proc/net/dev`, `df -k`, `uptime`（采样消耗极低，<0.1% CPU）。
  - **前端 (React)**：在 `HostMonitorDrawer.tsx` 抽屉以微图表形式实时展示 CPU/内存/磁盘/Uptime 曲线与健康度。
- [x] **可视化远程进程管理器 (Remote Process Manager)**：
  - **后端 (Go)**：后台执行 `ps -eo pid,user,pcpu,pmem,stat,time,comm --sort=-%cpu` 获取结构化进程数据。
  - **前端 (React)**：在 `RemoteOpsModal.tsx` 以数据表格形式呈现进程树，支持按 CPU/内存/PID 排序、关键字即时搜索，支持一键发送 `SIGTERM` / `SIGKILL (kill -9)`。
- [x] **远程 Systemd 服务与监听端口管理 (Service & Port Inspector)**：
  - **后端 (Go)**：后台查询 `systemctl list-units --type=service` 与 `ss -tuln` / `netstat`。
  - **前端 (React)**：在 `RemoteOpsModal.tsx` 可视化列出所有系统服务状态，支持一键启动/重启/停止服务；清晰展示当前服务器所有开放监听端口与协议。
- [x] **实时日志追踪器 (Realtime Log Tailer)**：
  - **后端 (Go)**：`internal/app/log_handler.go` 实现基于 SSH Session 的 `StartRemoteLogTail` 与 `StopRemoteLogTail` 流式数据推送。
  - **前端 (React)**：`RealtimeLogModal.tsx` 提供预设日志（`/var/log/syslog` 等）快捷选择、流式滚屏锁定、正则关键字高亮过滤、一键清屏与复制。

---

### 21.5 SFTP 高性能文件管理与传输进阶（SFTP Advanced & Transfer Engine）

- [x] **SFTP 大文件分片并发传输加速 (Multi-Thread Concurrent Chunked SFTP)**：
  - **后端 (Go)**：针对 >20MB 的大文件，自动开启 4 协程并发分段读写 (`doChunkedUpload` / `doChunkedDownload`)，结合原子计数器合并实时进度与吞吐速率推送，显著提升高延迟/大带宽场景下的传输速率。
- [x] **SFTP 大目录虚拟滚动渲染优化 (SFTP Virtual Scroll Rendering)**：
  - **前端 (React)**：引入 `@tanstack/react-virtual` 对 SFTP 本地与远程文件列表实施虚拟滚动渲染，消除 10,000+ 文件目录下的 DOM 渲染延迟与内存占用。
- [x] **远程文件打包压缩与在线解压 (Remote Compress & Extract)**：
  - **后端 (Go)**：提供 `SftpCompress` 与 `SftpExtract` 接口，自动在远端执行 `tar -czvf` / `tar -xjvf` / `tar -xJvf` / `zip` / `unzip` / `7z`。
  - **前端 (React)**：SFTP 右键菜单提供「🗜️ 压缩打包为... (.tar.gz / .zip / .tar.bz2 / .tar.xz / .7z)」和「📦 解压到当前目录」操作。
- [x] **文件传输哈希完整性自动校验 (Transfer Integrity Hash Verification)**：
  - **后端 (Go)**：`SftpVerifyHash` 在后台自动比对本地与远端文件的 MD5 / SHA256 / SHA1 校验和。
  - **前端 (React)**：SFTP 右键菜单提供「🔍 校验文件哈希 (Verify Checksum)」，可视化呈现哈希值对比与一致性结果。

---

### 21.6 AI 终端 Copilot 与智能运维助手（OmniAI Terminal Copilot）

- [x] **AI 命令行生成与自然语言转 Shell (Natural Language to Shell Command)**：
  - **后端 (Go)**：在 `internal/app/ai_handler.go` 实现统一的 LLM 代理接口（支持自定义 OpenAI / Gemini / DeepSeek / Ollama 本地模型 API Key 与 BaseURL），内置命令风险智能分级正则（Safe/Caution/Danger）。
  - **前端 (React)**：按 `Ctrl+K` / `Cmd+K` 或顶栏 OmniAI 按钮呼出智能工作台，输入自然语言需求，AI 秒级生成精确 Shell 指令，支持「填入终端」、「立即运行」与「存盘为快捷命令」。
- [x] **终端报错智能分析与一键诊断 (Error Diagnosis & Remediation)**：
  - **前端 (React)**：当终端输出包含常见错误信息（如 `Permission denied`, `No space left on device`, `Port already in use`, `fatal error`, `Syntax error`）时，终端右上角浮现智能气泡 💡「捕获到报错 · 点击 AI 智能诊断」，点击一键分析根因并生成修复指令。
- [x] **AI 脚本生成与批量运维方案编写 (AI DevOps Script Generator)**：
  - **后端/前端**：在 OmniAI Copilot 中提供 DevOps 自动化脚本工作台，输入巡检/备份/部署需求，一键生成带严密错误捕获与状态检查的规范 Bash / Python 脚本，支持一键复制代码或下载 `.sh`/`.py` 文件。
- [x] **OmniAI 统一大模型接入配置弹窗 (AIConfigModal) 与侧边栏一键直达**：
  - **组件解耦与全功能配置**：将原本侧边栏中字段不全、体验狭窄的内嵌折叠抽屉彻底移除，封装独立的 `AIConfigModal.tsx` 全功能大模型接入配置弹窗。
  - **服务商智能预设与 Ollama 专有支持**：预设 DeepSeek、OpenAI、Ollama、Gemini、Claude、Custom，切换服务商时自动预填官方 Base URL（Ollama 自动填 `http://localhost:11434/v1`）与推荐模型名，并提供常用模型一键填入胶囊与 API Key 显隐切换。
  - **实时连通性测试 (AITestConnection)**：集成后端 `AITestConnection` 接口，提供「测试连接」按钮并对 Ollama 404（模型未拉取）及网络拒绝提供智能修复指引。
  - **交互体验统一**：在右侧 `OmniAIChatDrawer` 顶栏点击模型胶囊或齿轮图标时，直接自动呼出全功能设置弹窗，修改后即时持久化到本地磁盘。

---

### 21.7 多端端到端加密云同步与团队资产协作（E2EE Cloud Sync & Team Ops）

- [x] **端到端加密云同步 (End-to-End Encrypted Cloud Sync - WebDAV / Self-Hosted / S3)**：
  - **后端 (Go)**：在 `internal/app/sync_handler.go` 中实现零知识加密同步引擎（Magic Header `OMNISYNC1` + PBKDF2 100,000 次派生 + AES-256-GCM 保护），支持 WebDAV 与 S3 协议安全上传/拉取，自动合并远程会话树。
  - **前端 (React)**：`CloudSyncModal.tsx` 提供 WebDAV / AWS S3 配置抽屉、连接测试、一键安全推送到云端与从云端拉取恢复。
- [x] **反向批量导出为 OpenSSH `~/.ssh/config` (Export to OpenSSH Config)**：
  - **后端 (Go)**：在 `internal/app/session_handler.go` 中实现 `ExportToSSHConfig()` 接口，将 OmniTerminal 树形会话转换为合法的 `Host`, `HostName`, `User`, `Port`, `IdentityFile`, `ProxyJump` 配置段落。
  - **前端 (React)**：文件菜单增加「导出为 OpenSSH ~/.ssh/config」选项，支持一键生成并复制。
- [x] **团队资产脱敏共享与集中分发 (Team Asset Sharing & Masking)**：
  - **后端/前端**：`ExportSanitizedTeamPackage` 导出全量团队共享配置包（保留主机名、端口、标签、目录结构、公用快捷命令与跳板机拓扑，全量剥离密码与私钥等机密信息），一键复制脱敏 JSON 或导出文件供团队成员分发导入。

---

### 21.8 现代 UI 架构、主题生态与桌面体验（Modern UI Architecture & Experience）

- [x] **全界面明亮/暗黑双色彩系统 (Complete Light & Dark App Themes)**：
  - **前端 (React)**：重构 CSS Token 变量体系，除了终端 xterm 配色外，将整个应用的主布局（顶栏、侧边栏、状态栏、SFTP 面板、所有模态弹窗）适配纯净现代浅色（Light Slate/Zinc）与高级暗黑（Dark Zinc/OLED Black）双模式。顶栏与偏好设置新增 ☀️ Light / 🌙 Dark / 💻 System 实时无缝切换。
- [x] **终端配色方案多格式双向导入导出 (Theme Import / Export Engine)**：
  - **后端 (Go)**：在 `internal/app/settings_handler.go` 补全对 iTerm2 (`.itermcolors` plist XML)、Windows Terminal (`schemes` JSON) 与 Xshell (`.xcs` INI) 格式的解析与反向导出。
  - **前端 (React)**：主题设置页面提供一键导入外部主题文件与导出当前主题。
- [x] **界面面板自由拖拽停靠与浮动系统 (Dockable UI & Floating Panels)**：
  - **前端 (React)**：重构工作区布局架构，支持将「会话树」在左侧/右侧自由停靠（Dock Left / Right），右侧 SFTP 并排联动，底部多行撰写抽屉，与活动栏（Activity Bar）无缝集成。
- [x] **完整多语言国际化覆盖补全 (Full i18n Coverage - 120+ Keys)**：
  - **前端 (React)**：扩展 `dictionaries.ts`，补全中 (zh-CN)、英 (en-US)、日 (ja-JP)、韩 (ko-KR) 全量核心词条。

---

### 21.9 核心技术债务与性能鲁棒性修复（Technical Debt & Performance Fixes）

- [x] **网络掉线自动重连指数退避与 SFTP 上下文无缝恢复 (Auto-Reconnect Backoff & SFTP Context Recovery)**：
  - **后端/前端**：改造为标准指数退避算法（1s → 2s → 4s → 8s → 16s，最大重试 5 次）。
- [x] **非活动 Tab 暂停 WebGL 渲染循环节流 (Inactive Tab WebGL Throttling)**：
  - **前端 (React)**：在 `TerminalInstance.tsx` 中监听 Tab 激活状态，当 Tab 切入后台时主动挂起 WebGL 渲染管线，降低多 Tab 并发时的 GPU 与内存消耗。
- [x] **大缓冲区 LRU 截断与内存泄漏防护 (Scrollback LRU Truncation)**：
  - **前端 (React)**：当终端滚动历史达到阈值时自动执行平滑截断，防止浏览器进程 OOM。

---

## 二十二、后续全阶段开发演进路线图与排期计划（Implementation Roadmap & Milestones）

```mermaid
gantt
    title OmniTerminal 生产力演进里程碑路线图
    dateFormat  YYYY-MM-DD
    section Phase 5A: 核心缺陷与性能基石
    ECDSA密钥对生成补全           :done, 2026-08-25, 2026-08-27
    主题配色多格式导入导出         :done, 2026-08-27, 2026-08-30
    掉线重连指数退避与SFTP恢复     :done, 2026-08-30, 2026-09-02
    SFTP虚拟滚动与非活动Tab节流    :done, 2026-09-02, 2026-09-05
    全量i18n中英日韩补全          :done, 2026-09-05, 2026-09-08
    section Phase 5B: 企业级认证与主机监控
    OpenSSH CA用户证书认证        :done, 2026-09-08, 2026-09-14
    内置SSH Agent密钥代理         :done, 2026-09-14, 2026-09-18
    无侵入式主机资源监控仪表盘     :done, 2026-09-18, 2026-09-24
    远程进程/服务/端口管理器      :done, 2026-09-24, 2026-09-29
    section Phase 5C: 传输加速与智能仿真
    SFTP大文件分片并发传输加速     :done, 2026-09-29, 2026-10-06
    终端工作目录追踪与SFTP联动(OSC7):done, 2026-10-06, 2026-10-10
    Sixel/iTerm2内联图像渲染      :done, 2026-10-10, 2026-10-14
    实时日志追踪器与远程解压缩     :done, 2026-10-14, 2026-10-18
    section Phase 5D: AI Copilot 与加密同步
    OmniAI 命令行智能生成/诊断    :done, 2026-10-18, 2026-10-26
    端到端加密云同步(WebDAV/S3)   :done, 2026-10-26, 2026-11-02
    SSH Config反向导出与团队共享  :done, 2026-11-02, 2026-11-06
    section Phase 5E: 图形接入与架构进阶
    RDP / VNC 图形远程桌面接入    :2026-11-06, 2026-11-18
    Dockable UI可拖拽停靠与浮动   :2026-11-18, 2026-11-26
    全界面明亮/暗黑双色彩系统     :2026-11-26, 2026-12-05
```

### 阶段排期详情一览表

| 阶段里程碑 | 核心战略目标 | 包含功能模块 (前后端) | 预计工期 | 验收交付物与评判标准 |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 5A: 核心缺陷修复与性能基石** `[x] 已完成` | 消除所有空壳代码与功能缺陷，巩固性能基石 | 1. **ECDSA 密钥对生成** (P-256/P-384/P-521)<br>2. **配色方案多格式双向导入导出** (iTerm2 / WT / Xshell .xcs)<br>3. **掉线自动重连指数退避与 SFTP 上下文无缝恢复**<br>4. **SFTP 大目录虚拟滚动渲染** (`@tanstack/react-virtual`)<br>5. **非活动 Tab 暂停 WebGL 渲染** (降低 GPU 消耗)<br>6. **全量多语言 i18n 字典覆盖** (中/英/日/韩 120+ keys) | **交付完成** | - 后端 0 空壳返回值<br>- 10,000 文件大目录秒级流畅滚动<br>- 20+ Tab 并发下 GPU 负载降低 60%<br>- 界面全语种无硬编码中文残留 |
| **Phase 5B: 企业级认证与主机监控** `[x] 已完成` | 打造企业级安全基线与免 Agent 运维杀手级特性 | 1. **OpenSSH CA 用户证书认证** (`-cert.pub` 自动签名配对)<br>2. **内置 SSH Agent 密钥代理管理器** (支持生命周期控制)<br>3. **免 Agent 主机系统资源监控仪表盘** (CPU/RAM/Net/Disk)<br>4. **远程进程管理器与 Systemd 服务/端口查看器** | **交付完成** | - 支持企业级短期 CA 证书免密登录<br>- 一键查看远端主机负载曲线与流量<br>- 可视化查杀远程高负载进程与管理服务 |
| **Phase 5C: 传输加速与智能终端仿真** `[x] 已完成` | 文件吞吐跃升与深度终端/SFTP 协同交互 | 1. **SFTP 大文件多协程分片并发传输加速** (4 协程并发分片读写)<br>2. **终端当前工作目录自动追踪与 SFTP 双向联动 (OSC 7 / cd)**<br>3. **Sixel 与 iTerm2 终端内联图像显示协议** (`@xterm/addon-image`)<br>4. **远程文件在线打包压缩/解压与文件哈希完整性自动校验**<br>5. **免 Agent 远程实时日志流式追踪器 (Realtime Log Tailer)**<br>6. **终端智能补全与语法提示 (IntelliSense Ghost Text)** | **交付完成** | - >20MB 大文件 SFTP 传输吞吐显著提升<br>- 终端敲命令时右侧 SFTP 文件浏览器实时无缝跟随<br>- 终端内原生支持 Sixel 像素图与图片查看<br>- 实时流式 tail 远端系统日志并支持正则高亮 |
| **Phase 5D: AI Copilot 与多端加密同步** `[x] 已完成` | 引入生成式 AI 生产力与跨设备云漫游生态 | 1. **OmniAI 命令行生成、自然语言转 Shell 与报错智能诊断**<br>2. **基于 WebDAV / S3 的端到端加密云同步 (E2EE Sync)**<br>3. **会话树反向批量生成与导出为 OpenSSH `~/.ssh/config`**<br>4. **团队资产脱敏共享包导出** | **交付完成** | - `Ctrl+K`/`Cmd+K` 自然语言秒出安全 Shell 命令<br>- 终端报错 💡 智能诊断并生成修复指令<br>- 跨 Mac/Windows/Linux 多端配置 WebDAV/S3 零知识加密同步<br>- 一键导出标准 `~/.ssh/config` 与团队脱敏配置包 |
| **Phase 5E: 图形接入与架构进阶**<br>🟢 *长期演进* | 拓展图形远程桌面与现代桌面交互新高度 | 1. **RDP 远程桌面图形客户端集成** (Windows 远程桌面)<br>2. **VNC 图形客户端集成** (Linux X11 桌面)<br>3. **Dockable UI 自由拖拽停靠与浮动面板架构**<br>4. **全界面纯净浅色与高级暗黑双色彩系统 (CSS Tokens)** | **4 周** | - 实现 SSH/SFTP/RDP/VNC 一体化远程工作台<br>- 侧边/底部/监控面板支持任意拖拽停靠与浮动<br>- 全界面支持极致美观的双主题无缝热切换 |

---

## 🛠️ XXShell 完全仿照 Xshell 核心交互约定

为确保软件拥有绝对原生的 Xshell 质感，所有功能迭代应无条件遵守以下设计与交互约定：

1. **界面与联动布局 (UI/UX)**
   - **双栏并排 SFTP**：SFTP 传输面板必须在当前活动终端的右侧拉起（双栏布局），且大小可自适应，严禁使用独立浮窗或非当前 Tab 隔离的界面。
   - **文件夹嵌套会话树**：左侧会话管理器需支持无限层级文件夹分类，支持会话在树中的重命名、双击连接及拖拽目录。
   - **传统桌面密集范式**：全局遵循 Dense Desktop Paradigm，所有主布局元素使用直角边框、紧凑间距、小号字体（11-12px），禁止 Web 风格的大圆角和宽松内边距。

2. **终端操作习惯 (Terminal Operator)**
   - **智能剪切板劫持**：终端内存在高亮选中文字时，`Cmd+C` / `Ctrl+C` 为复制文字；无选中文字时，`Ctrl+C` 为 PTY 的中断信号。
   - **右键上下文气泡**：终端内点击鼠标右键禁用浏览器默认菜单，改为滑出紧凑小巧的"复制/粘贴"气泡选单。

3. **企业级安全设计 (Security)**
   - **动态凭证加解密**：会话密码及私钥存盘必须在主密码派生 Key 下以 AES-256-GCM 进行对称加密保护。
   - **全屏磨砂解密锁**：若设置了主密码，启动时强制激活高斯模糊锁屏屏障，校验成功后方解锁主界面。

4. **前后端工程代码与目录结构规范**
   - **Go 后端开发规范**：
     - **单入口设计**：`main.go` 仅处理 Wails 的应用生命周期挂载与启动；`internal/app/app.go` 作为 IPC 桥接接口层，具体的长链路业务（如 SSH 连接池、并发 Map）在独立文件（如 `internal/core/ssh_manager.go`）中高内聚实现。
     - **并发与安全**：涉及共享数据（如活动的 SSH 连接、SFTP 句柄映射表）时，必须使用 `sync.RWMutex` 执行锁保护，防范并发读写恐慌。
     - **标准项目布局**：遵循 `internal/app`（接口层）、`internal/core`（核心业务）、`internal/models`（数据模型）、`internal/crypto`（加密工具）四层架构。
   - **Frontend TS/React 规范**：
     - **组件化组织**：前端基础和业务 UI 组件应分模块放置在 `frontend/src/components/` 目录下（如 `TerminalInstance.tsx`、`SftpPanel.tsx`）。
     - **严禁篡改 Wails 生成区**：`frontend/wailsjs/` 目录属于 Wails 自动编译产出区，切勿在该目录进行手动业务逻辑修改。
     - **静态类型检查**：禁止滥用 `any`。所有从后端传递过来的业务实体，必须引入 Wails 导出的 TypeScript models 进行静态校验。
     - **事件注销**：在 React 组件挂载及卸载的生命周期里，使用 Wails Event 事件监听时，必须在 Cleanup 中执行其返回的注销函数（而不是全局调用 `EventsOff`），防范多 Tab 页面中的重复数据监听及内存泄漏。
     - **大文件增量编辑**：对于超过 1000 行的源文件（特别是 `App.tsx`），修改时必须先 `grep_search` 精确定位目标代码段，使用 `replace_file_content` 或 `multi_replace_file_content` 进行增量编辑，严禁全文件覆盖重写。

---

## 二十三、竞品 UI 对标分析与待补全功能开发计划（Competitive Gap Analysis）

> 本节对照 **Xshell 8 / SecureCRT 9 / WindTerm 2.6 / Tabby / Warp Terminal / Termius 云端版** 六款主流竞品，以 UI 交互维度全面审查 OmniTerminal 的功能缺口，列出各功能的优先级与实现方案。
>
> 状态标注：`[ ]` = 待实现 | `[-]` = 部分实现/有缺陷

---

### 23.1 竞品功能对比矩阵

| 功能维度 | Xshell 8 | SecureCRT 9 | WindTerm 2.6 | Tabby | Warp | Termius | **OmniTerminal** |
|:---------|:--------:|:-----------:|:------------:|:-----:|:----:|:-------:|:----------------:|
| 会话树无限嵌套 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 多标签页分屏 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| SFTP 双栏联动 | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| AI 命令辅助 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| 云同步/团队协作 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **命令块 (Block) UI** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ (§24.2.1 已完成) |
| **命令执行时间标注** | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ (§23.2.4 已完成) |
| **端口转发可视化管理** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ (§23.2.7 已完成) |
| **终端字符像素级对齐** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Unicode11Addon 已集成) |
| **会话标签颜色分组** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ (§23.2.6 已完成) |
| **跨会话命令历史搜索** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (§23.2.3 已完成) |
| **SSH Config 导入** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (§23.2.1 已完成) |
| **终端内超链接点击** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (WebLinksAddon 已集成) |
| **Mosh (Mobile Shell)** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **终端命令调色板** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **串口 (Serial/COM) 连接** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Telnet / Rlogin 协议** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **终端输出 AI 摘要** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **SFTP 文件预览（图片/代码）** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **终端字体连字（Ligatures）** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **SSH 会话录像回放** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ (asciinema) |
| **Web 浏览器内嵌标签页** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

### 23.2 高优先级 UI 缺口——详细开发计划

---

#### 23.2.1 OpenSSH Config 双向导入（Import ~/.ssh/config）

> **竞品现状**：Xshell、SecureCRT、Tabby、WindTerm、Warp 均支持一键读取用户本地 `~/.ssh/config` 文件，自动批量导入所有 `Host` 条目为会话列表，大幅降低迁移成本。OmniTerminal 目前仅支持**导出为** `~/.ssh/config`，**缺少导入方向**。

- [x] **后端 (Go)**：新增 `ImportFromSSHConfig(filePath string) ([]models.SessionConfig, error)`
  - 解析 `~/.ssh/config` 语法：`Host`, `HostName`, `User`, `Port`, `IdentityFile`, `ProxyJump`, `ForwardAgent`, `LocalForward`, `DynamicForward`
  - 支持通配符 `Host *` 作为全局默认值继承
  - 重复 Host 条目去重与合并策略（Merge vs Skip vs Overwrite 三档策略）
  - 文件路径：`internal/app/session_handler.go`（新增 `ImportFromSSHConfig` 方法）
- [x] **前端 (React)**：
  - 文件菜单「文件 → 导入会话 (I)...」子菜单新增「从 OpenSSH ~/.ssh/config 导入」
  - 调用 Wails `OpenFileDialog`，选择配置文件
  - 解析结果以预览列表弹窗展示，支持全选/取消，确认后写入会话树「imported-from-ssh-config」分组文件夹

---

#### 23.2.2 终端内超链接自动识别与点击跳转（Hyperlink Detection & Click）

> **竞品现状**：所有主流终端均支持自动识别终端输出内的 URL，鼠标悬停高亮下划线，Ctrl/Cmd+Click 或右键菜单可在系统浏览器中打开。OmniTerminal 当前无此功能，是可见性最强的 UI 缺口之一。

- [x] **前端 (React)**：在 `TerminalInstance.tsx` 集成 `@xterm/addon-web-links`
  - 安装：`npm install @xterm/addon-web-links`
  - WebGL 渲染器初始化后加载 `WebLinksAddon`，配置 `handler: (event, url) => BrowserOpenURL(url)`
  - 自定义正则支持识别：`http://`、`https://`、`ftp://`、IP:PORT 格式、文件路径
  - 链接悬停时蓝色下划线高亮，右键菜单追加「在浏览器中打开」

---

#### 23.2.3 跨会话命令历史全局搜索（Cross-Session History Search）

> **竞品现状**：WindTerm、Warp 内置跨终端会话的命令历史数据库，支持模糊搜索历史命令并快速重新执行。OmniTerminal 当前缺少跨 SSH 会话的命令历史持久化搜索。

- [x] **后端 (Go)**：新增 `internal/app/history_handler.go`
  - `RecordCommand(sessionId, command string, exitCode int, timestamp time.Time)` 持久化写入 `~/.omniterminal/command_history.jsonl`（JSON Lines 格式）
  - `SearchHistory(query string, limit int) ([]CommandHistoryEntry, error)` 模糊搜索
  - `GetRecentHistory(sessionId string, limit int) []CommandHistoryEntry` 按会话获取
- [x] **前端 (React)**：创建 `CommandHistoryModal.tsx`，注册 `Ctrl+Shift+H` / `Cmd+Shift+H`：
  - 跨会话全局模糊搜索输入框，支持会话胶囊过滤
  - 结果列表（所属会话 Badge、IP 主机、命令内容、执行时间）
  - 单击「复制/填入」，双击或 Enter「立即执行」，↑↓ 键盘平滑切换

---

#### 23.2.4 命令执行时间与耗时自动标注（Command Duration Annotation）

> **竞品现状**：WindTerm 与 Warp 对每条命令自动标注执行时间与耗时（如 `[14:23:07 · 2.3s]`），是现代终端生产力工具的核心差异化特性。

- [x] **前端 (React)**：在 `TerminalInstance.tsx` 中实现基于 Prompt 检测的命令边界识别：
  - 通过解析 ANSI 序列识别 Shell Prompt（支持常见 `$`、`#`、`>`、`❯`）
  - Prompt 出现时记录时间戳并计算上一条命令的耗时
  - 在终端右侧边缘以 `text-[10px]` 极淡灰色 HTML Overlay 叠加渲染时间标注（`position: absolute`），不干扰 xterm.js 主渲染
  - 可在终端设置中开启/关闭

---

#### 23.2.5 终端命令调色板（Command Palette，Warp/Tabby 风格）

> **竞品现状**：Warp 的命令调色板（`Ctrl+P`）是其最具辨识度的创新，允许搜索驱动式调用任意功能而非记忆菜单路径。Tabby 也集成了 Fuzzy Search 调色板。

- [x] **前端 (React)**：创建 `CommandPaletteModal.tsx`，注册全局快捷键 `Ctrl+P`（macOS `Cmd+P`）：
  - **搜索框**：实时 Fuzzy 匹配（`fuse.js` 或自实现）
  - **内置条目**：功能操作、快捷命令集、历史命令、活动会话列表
  - **键盘操作**：↑↓ 导航，`Enter` 执行，`Esc` 关闭
  - **设计**：居中磨砂玻璃模态，分组展示（功能 / 会话 / 历史 / 快捷命令）

---

#### 23.2.6 Tab 颜色标签分组（Tab Color Tag Groups）

> **竞品现状**：Xshell、Tabby、Termius 均支持为 Tab 设置颜色标签，便于多会话管理时快速视觉分组（如生产环境标红、测试标绿、数据库标蓝）。

- [x] **前端 (React)**：
  - `OpenTab` 类型新增 `colorTag?: string`（16 进制颜色值）
  - Tab 右键菜单新增「颜色标签」子菜单，8 种预设颜色 + 自定义颜色选择器
  - Tab 状态呼吸指示灯融合颜色标签色彩
- [x] **后端 (Go)**：`SessionConfig` 添加 `ColorTag string` 字段持久化存盘

---

#### 23.2.7 端口转发可视化管理增强（Port Forwarding Manager UI）

> **竞品现状**：Xshell、SecureCRT 均有独立的图形化「SSH 隧道/端口转发」管理器，支持运行时动态增删规则并实时显示活跃转发列表。OmniTerminal 当前隧道面板功能基础但 UI 体验不完善。

- [x] **前端 (React)**：完善 `TunnelMonitorModal.tsx`：
  - 活跃转发规则实时列表（类型图标、本地端口、远端地址:端口、状态指示灯、绑定会话名）
  - 运行时动态新增转发规则（无需断开重连）
  - 一键停止/暂停单条规则
  - 快速一键复制本地监听访问地址 / SOCKS5 代理 URL
- [x] **后端 (Go)**：`SSHManager` 新增 `StartDynamicTunnel` 与 `AddActiveTunnel`，支持运行时动态向已连接 SSH 会话注入隧道规则

---

#### 23.2.8 SFTP 文件预览增强（图片/代码文件快速预览）

> **竞品现状**：Termius 支持 SFTP 文件管理器内的图片预览；WinSCP 支持常见文件类型快速预览。OmniTerminal 当前仅支持文本文件简易编辑器。

- [x] **前端 (React)**：SFTP 文件列表右键菜单增加「👁️ 快速预览 (Preview)」：
  - **图片文件**（.jpg/.png/.gif/.svg/.webp/.bmp/.ico）：Base64 快速流式加载并提供放大、缩小、重置视图
  - **文本/代码文件**（.txt/.log/.yaml/.json/.py/.sh/.go 等）：等宽语法预览容器，支持一键全文复制
  - **二进制/其他文件**：友好类型展示与一键另存为下载
  - 支持 `Esc` 键快速退出
- [x] **后端 (Go)**：新增 `SftpReadFile` 接口，支持图片与文本内容安全读取与 Base64 编码传输

---

#### 23.2.9 AI 终端输出摘要与解释（Terminal Output AI Summarize）

> **竞品现状**：Warp 2024 版推出「Summarize」功能，选中终端输出后可请求 AI 用自然语言解释，包括日志分析、报错根因、性能瓶颈摘要等。

- [x] **前端 (React)**：终端文字选中后的右键菜单增加「🤖 AI 解释选中内容」：
  - 获取选中文字调用已有 `OmniAiChat` 接口
  - 预置 System Prompt：`你是 Linux 运维专家，请用中文解释以下终端输出内容`
  - 结果在 OmniAI 侧边抽屉展示
- [x] **前端 (React)**：OmniAI 面板新增「📋 分析当前终端最后 N 行输出」快捷按钮

---

#### 23.2.10 终端字体连字支持（Font Ligatures）

> **竞品现状**：Warp、iTerm2、Tabby、WindTerm 均支持 FiraCode/Cascadia/JetBrainsMono 等编程字体连字，`->` 自动渲染为 `→` 等，是极客审美的重要特征。xterm.js 原生不支持，需集成插件。

- [x] **前端 (React)**：安装并集成 `@xterm/addon-ligatures`
  - `npm install @xterm/addon-ligatures`
  - 在 `TerminalInstance.tsx` 加载 `LigaturesAddon`（注：当前仅 Canvas 渲染支持，WebGL 降级处理）
  - 设置中增加「字体连字（Font Ligatures）」开关

---

#### 23.2.11 Telnet / Rlogin 协议支持

> **竞品现状**：Xshell、SecureCRT、WindTerm 均支持 Telnet 与 Rlogin，用于连接老旧网络设备（交换机、路由器、工控机）。

- [x] **后端 (Go)**：新增 `internal/core/telnet_client.go` 与 `internal/core/rlogin_client.go`：
  - 实现标准 TCP + Telnet IAC 协商序列（RFC 854/855）
  - 实现 RFC 1282 BSD Rlogin 握手、数据流与窗口 OOB 协调序列
  - 提供 `ConnectTelnet` / `ConnectRlogin` / `Resize` / `Disconnect` 完整生命周期
- [x] **前端 (React)**：`SessionModal.tsx` 协议选择新增「Telnet（默认端口 23）」与「Rlogin（默认端口 513）」，`TerminalInstance.tsx` 绑定连接事件

---

#### 23.2.12 Mosh（Mobile Shell）协议支持

> **竞品现状**：Termius、WindTerm、Tabby 均支持 Mosh 协议，在高延迟/不稳定网络下大幅提升终端响应感，使用 UDP 传输，断网自动续连。

- [x] **后端 (Go)**：
  - 会话配置新增 `Protocol: "mosh"` 及 Mosh 专属字段（`moshServerPath`, `moshPortRange`, `moshPredictMode`）
  - 通过已建立 SSH 信道在远端启动 `mosh-server`，解析获取会话密钥与 UDP 端口
  - 本地通过 PTY 启动 `mosh-client` 客户端进程并注入 `MOSH_KEY`，I/O 流接入 xterm.js
  - 提供 `ConnectMosh` 接口与断网自动清理
- [x] **前端 (React)**：
  - `SessionModal.tsx` 协议下拉框新增「Mosh (Mobile Shell)」
  - Mosh 专属配置：远端 Mosh 服务器路径（默认 `mosh-server`）、UDP 端口范围（默认 60000-61000）
  - 终端连接就绪提示、状态栏与 Tab 图标联动展示

---

### 23.3 中优先级 UI 缺口——简要说明

| # | 功能 | 竞品参考 | 实现要点 | 状态 |
|:--|:-----|:---------|:---------|:------:|
| 1 | **CJK 宽字符对齐修复** | 所有竞品 | 引入 `@xterm/addon-unicode11` 并激活 `unicodeVersion: '11'`，全角字符宽度 = 2，消除中日韩文字与 Emoji 排版错位 | [x] 已完成 |
| 2 | **会话快速标签过滤胶囊** | Tabby、Termius | 会话树顶部增加 Tag 快速过滤胶囊（如 `prod`、`db`、`k8s`），点击仅显示含该标签的会话 | [x] 已完成 |
| 3 | **SSH 连接前后脚本钩子** | SecureCRT | 会话属性「脚本」面签增加「连接前执行脚本」与「连接成功后自动执行」配置（如自动 `sudo su -`） | [x] 已完成 |
| 4 | **多窗口分离式独立窗口增强** | Xshell | 右键 Tab「拆离到独立窗口」或拖拽 Tab 出窗口边界时，以独立原生窗口运行该会话（支持 SSH 与本地 Shell） | [x] 已完成 |
| 5 | **SFTP 文件夹大小异步计算** | FileZilla | 右键远程文件夹「属性」时异步递归统计总大小，避免 UI 卡顿 | [x] 已完成 |
| 6 | **AI 回答 Markdown 富文本渲染** | Warp | OmniAI 抽屉支持 Markdown 渲染（代码块语法高亮、表格、加粗、一键复制代码块） | [x] 已完成 |
| 7 | **快捷键冲突检测与自定义重映射** | Xshell | 设置中可视化检测快捷键冲突并允许用户自定义重映射所有快捷键 | [x] 已完成 |
| 8 | **会话属性 Tag 多维检索** | Termius | 会话属性支持多个自由标签，搜索框支持 `tag:prod AND ip:10.0` 组合查询 | [x] 已完成 |

---

### 23.4 低优先级 / 长期演进功能

| # | 功能 | 竞品参考 | 简要描述 | 状态 |
|:--|:-----|:---------|:---------|:----:|
| 1 | **Web 浏览器内嵌标签页** | WindTerm | Tab 中嵌入内置浏览器，直接访问服务器的 Web 管理界面（Grafana、Portainer 等） | [x] 已完成 |
| 2 | **本地与远程剪贴板双向同步** | WindTerm、Warp | 通过 OSC 52 协议 + 远端 `xclip/xsel` 实现双向剪贴板同步 |
| 3 | **Ansible / kubectl 一体化工作台** | Termius Teams | 内置多主机 Ansible Playbook 执行器与 `kubectl` Pod 日志实时流面板 |
| 4 | **密码安全评分与泄漏检查** | - | 集成 HaveIBeenPwned API，对已保存密码做泄漏检查并提示更换 |
| 5 | **终端 Quake 下拉动画优化** | - | 优化下拉弹性曲线（`spring` easing）与毛玻璃背景过渡，消除生硬感 |
| 6 | **Git 仓库文件内联 Diff 对比** | VSCode Remote | SFTP 面板识别远端 Git 仓库，将远端文件与 `git show HEAD:file` 做 Diff 对比 |
| 7 | **Wails v3 升级迁移** | - | 评估迁移至 Wails v3（原生多窗口 API、更好的 macOS 集成、更新的 WebKit） |

---

### 23.5 功能排期与实施优先级

| 优先级 | 功能编号 | 功能名称 | 预计工期 | 实施难度 | 状态 |
|:------:|:--------:|:---------|:--------:|:--------:|:----:|
| 🔴 **P0 高优** | 23.2.2 | 终端超链接自动识别点击 | 1 天 | ⭐ 低 | [x] 已完成 |
| 🔴 **P0 高优** | 23.2.10 | 终端字体连字支持 | 1 天 | ⭐ 低 | [x] 已完成 |
| 🔴 **P0 高优** | 23.2.6 | Tab 颜色标签分组 | 1 天 | ⭐ 低 | [x] 已完成 |
| 🔴 **P0 高优** | 23.2.9 | AI 终端输出摘要 | 1 天 | ⭐ 低（依赖 OmniAI 基础） | [x] 已完成 |
| 🔴 **P0 高优** | 23.2.1 | OpenSSH Config 双向导入 | 2 天 | ⭐⭐ 中 | [x] 已完成 |
| 🔴 **P0 高优** | 23.2.5 | 命令调色板 (Ctrl+P) | 2 天 | ⭐⭐ 中 | [x] 已完成 |
| 🟠 **P1 中高** | 23.2.4 | 命令执行耗时标注 | 2 天 | ⭐⭐ 中 | [x] 已完成 |
| 🟠 **P1 中高** | 23.2.7 | 端口转发管理 UI 增强 | 2 天 | ⭐⭐ 中 | [x] 已完成 |
| 🟠 **P1 中高** | 23.2.3 | 跨会话命令历史搜索 | 3 天 | ⭐⭐⭐ 中高 | [x] 已完成 |
| 🟡 **P2 中** | 23.2.8 | SFTP 文件预览增强 | 3 天 | ⭐⭐⭐ 中高 | [x] 已完成 |
| 🟡 **P2 中** | 23.3 #1 | CJK 宽字符对齐修复 | 2 天 | ⭐⭐ 中 | [x] 已完成 |
| 🟡 **P2 中** | 23.3 #6 | AI 回答 Markdown 渲染 | 1 天 | ⭐ 低 | [x] 已完成 |
| 🟡 **P2 中** | 23.3 #2 | 会话快速标签过滤胶囊 | 1 天 | ⭐ 低 | [x] 已完成 |
| 🔵 **P3 低** | 23.2.11 | Telnet/Rlogin 协议支持 | 3 天 | ⭐⭐⭐ 中高 | [x] 已完成 |
| 🔵 **P3 低** | 23.2.12 | Mosh 协议支持 | 5 天 | ⭐⭐⭐⭐ 高 | [x] 已完成 |
| 🔵 **P3 低** | 23.4 #1 | Web 浏览器内嵌标签页 | 5 天 | ⭐⭐⭐⭐ 高 | [x] 已完成 |

---

### 23.6 Phase 6 分阶段开发路线图

```mermaid
gantt
    title OmniTerminal Phase 6: 竞品缺口补全路线图
    dateFormat  YYYY-MM-DD
    section 第一批：快速胜利（P0 · 约 8 天）
    终端超链接识别点击          :p6a1, 2026-08-26, 1d
    终端字体连字支持             :p6a2, after p6a1, 1d
    Tab颜色标签分组              :p6a3, after p6a2, 1d
    AI终端输出摘要               :p6a4, after p6a3, 1d
    命令调色板(Ctrl+P)           :p6a5, after p6a4, 2d
    OpenSSH Config双向导入       :p6a6, after p6a5, 2d
    section 第二批：生产力核心（P1 · 约 7 天）
    命令执行耗时标注             :p6b1, after p6a6, 2d
    端口转发管理UI增强           :p6b2, after p6b1, 2d
    跨会话命令历史搜索           :p6b3, after p6b2, 3d
    section 第三批：深度完善（P2 · 约 7 天）
    CJK宽字符对齐修复            :p6c1, after p6b3, 2d
    AI回答Markdown渲染           :p6c2, after p6c1, 1d
    会话快速标签过滤胶囊         :p6c3, after p6c2, 1d
    SFTP文件预览增强             :p6c4, after p6c3, 3d
    section 第四批：协议扩展（P3 · 约 8 天）
    Telnet/Rlogin协议支持        :p6d1, after p6c4, 3d
    Mosh协议支持                 :p6d2, after p6d1, 5d
```

---

## 二十四、全面现代化评估与 Phase 7 开发计划（Modernization Audit & Phase 7 Development Plan）

> 本节基于 2026-09 对 OmniTerminal 代码实态的全面审计，横向对比 **Warp 2025**、**Ghostty 1.x**、**WezTerm**、**Kitty**、**iTerm2 3.5**、**Tabby 2.x**、**WindTerm 2.7**、**Termius Pro** 等新一代终端客户端，梳理出 OmniTerminal 在现代化基础功能、高级界面交互、智能运维与长期演进方面**仍缺失或待实现**的重要功能缺口，并给出每项功能的详细开发步骤与排期。
>
> 状态标注：`[ ]` = 待实现 | `[-]` = 部分实现/有缺陷 | `[x]` = 已完成

---

### 24.0 现有文档遗留项状态同步

> 以下项目在之前的章节中标记为待实现或有缺陷，此处统一确认当前实态并标注待办。

| 来源章节 | 功能描述 | 文档标记 | 代码实态 | 处置 |
|:---------|:---------|:--------:|:--------:|:----:|
| §5 连接与网络 L136 | 网络掉线自动重连（指数退避） | `[-]` | §21.9 已完成指数退避重构 | ✅ 更新为 `[x]` |
| §5 连接与网络 L144 | ECDSA 密钥对生成 | `[-]` | §21.1 已补全 P-256/384/521 | ✅ 更新为 `[x]` |
| §7 安全加密 L183 | 密钥管理器 ECDSA 补全 | `[-]` | §21.1 已完成 | ✅ 更新为 `[x]` |
| §8 外观主题 L203 | 终端配色方案导入/导出 | `[-]` | §21.8 已实现 iTerm2/WT/Xshell 解析 | ✅ 更新为 `[x]` |
| §8 外观主题 L204 | 界面面板可拖拽停靠 | `[-]` | §21.8 已实现 Dockable UI | ✅ 更新为 `[x]` |
| §23.1 竞品矩阵 L908 | 命令块 (Block) UI | 已完成 | §24.2.1 已完成实现 | ✅ **已于 24.2 完成** |
| §23.1 竞品矩阵 L909 | 命令执行时间标注 | ❌ 缺口 | §23.2.4 已完成实现 | ✅ 矩阵需更新 |
| §23.1 竞品矩阵 L913 | 跨会话命令历史搜索 | ❌ 缺口 | §23.2.3 已完成实现 | ✅ 矩阵需更新 |
| §23.1 竞品矩阵 L914 | SSH Config 导入 | ❌ 缺口 | §23.2.1 已完成实现 | ✅ 矩阵需更新 |
| §23.1 竞品矩阵 L915 | 终端内超链接点击 | ❌ 缺口 | §23.2.2 已完成 (WebLinksAddon) | ✅ 矩阵需更新 |
| §23.3 #5 L1096 | SFTP 文件夹大小异步计算 | 已完成 | §24.1.3 已实现 | ✅ **已于 24.1 完成** |
| §23.3 #7 L1098 | 快捷键冲突检测与重映射 | 已完成 | §24.1.4 已实现 | ✅ **已于 24.1 完成** |
| §23.4 #2 L1108 | 本地与远程剪贴板双向同步 | 已完成 | §24.1.1/24.1.5 已实现 | ✅ **已于 24.1 完成** |
| §23.4 #3 L1109 | Ansible/kubectl 一体化工作台 | 无标记 | **代码无实现** | 🟡 **纳入 24.4** |
| §23.4 #4 L1110 | 密码安全评分与泄漏检查 | 无标记 | **代码无实现** | 🟡 **纳入 24.4** |
| §23.4 #5 L1111 | 终端 Quake 下拉动画优化 | 无标记 | **代码无实现** | 🟡 **纳入 24.3** |
| §23.4 #6 L1112 | Git 仓库文件内联 Diff 对比 | 无标记 | **代码无实现** | 🟡 **纳入 24.3** |
| §23.4 #7 L1113 | Wails v3 升级迁移 | 无标记 | **仍为 Wails v2** | 🟡 **纳入 24.4** |

---

### 24.1 现代化基础功能缺口——详细开发计划

> 本小节覆盖所有现代终端客户端的**必备基础能力**缺口，是提升产品竞争力的核心优先项。

---

#### 24.1.1 OSC 52 远程剪贴板双向同步（Remote Clipboard Sync via OSC 52）

> **竞品现状**：Kitty、WezTerm、Ghostty、iTerm2、Alacritty、WindTerm 均原生支持 OSC 52 协议，允许远端 SSH 会话通过 `printf '\033]52;c;%s\007' $(base64)` 直接写入本地系统剪贴板，实现真正的远程复制粘贴零配置体验。OmniTerminal 当前**完全缺失 OSC 52 支持**。

- [x] **前端 (React)**：在 `TerminalInstance.tsx` 注册 OSC 52 处理器
  - 使用 `term.parser.registerOscHandler(52, ...)` 拦截 OSC 52 序列
  - 解析 `Pc;Pd` 格式：`c` = clipboard, `s` = selection, `p` = primary
  - 对 `Pd` 进行 Base64 解码后写入 `navigator.clipboard.writeText()`
  - 当 `Pd` 为 `?` 时，读取本地剪贴板并回传 OSC 52 响应序列（需用户授权确认弹窗）
  - 安全策略：设置中增加「OSC 52 剪贴板同步」三档开关（禁用 / 仅写入 / 读写双向）
- [x] **前端 (React)**：在 `SettingsModal.tsx` 终端面签新增 OSC 52 配置项
  - 模式选择：`disabled`（默认）/ `write-only` / `read-write`
  - 最大 Base64 载荷限制（默认 100KB，防止恶意序列 OOM）
  - 每次读取操作弹出用户授权确认弹窗的开关
- [x] **后端 (Go)**：在 `SessionConfig` 中新增 `Osc52Mode string` 字段（`"disabled"` / `"write"` / `"readwrite"`）持久化

---

#### 24.1.2 SSH 连接复用与智能连接池（SSH Connection Multiplexing & Pool）

> **竞品现状**：OpenSSH 原生 `ControlMaster` 允许复用已建立的 TCP 连接以秒级创建新 Session。SecureCRT、Xshell 均支持同一主机的多 Channel 复用。OmniTerminal 当前每个 Tab 独立建立 SSH 连接，同主机 10 个 Tab 意味着 10 次 TCP 握手 + 10 次密钥交换。

- [x] **后端 (Go)**：在 `internal/core/ssh_manager.go` 实现 SSH 连接池
  - 新增 `ConnectionPool` 结构体：`map[string]*PooledConnection`，Key 为 `user@host:port` 标识
  - `PooledConnection` 持有 `*ssh.Client` + 引用计数 + 心跳 goroutine + 最后活跃时间
  - `AcquireSession(config) (*ssh.Session, error)`：查找已存在的 SSH Client 并打开新 Channel，不存在时新建
  - `ReleaseSession(id)`：引用计数减一，计数归零后延迟 30s 释放（grace period）
  - 连接池上限配置：`MaxPoolSize`（默认 50）、`IdleTimeout`（默认 300s）
  - 并发安全：使用 `sync.RWMutex` 保护池操作
- [x] **后端 (Go)**：在 `Connect()` 方法中集成连接池
  - 首次连接：建立新 SSH Client 并加入池
  - 同主机后续连接：复用已有 Client 的 `OpenSession()` / `OpenChannel()`
  - SFTP 通道同样复用同一 Client：`sftp.NewClient(existingClient)`
- [x] **前端 (React)**：状态栏新增连接池指示器
  - 显示 `🔗 3/1`（3 个会话复用 1 个连接）
  - 点击弹出连接池详情 Popover（活跃连接列表、引用计数、空闲超时倒计时）
- [x] **前端 (React)**：`SettingsModal.tsx` 新增「SSH 连接复用」开关与参数配置
  - 启用/禁用连接池（默认启用）
  - 最大池大小、空闲超时时间

---

#### 24.1.3 SFTP 文件夹大小异步计算（Async Folder Size Calculation）

> **竞品现状**：FileZilla、WinSCP、Termius 均支持右键文件夹「属性」时异步递归统计总大小与文件数，避免 UI 卡顿。OmniTerminal SFTP 文件属性对话框当前仅显示文件夹名称，不展示大小与子文件数量。

- [x] **后端 (Go)**：在 `internal/app/sftp_handler.go` 新增 `SftpCalculateFolderSize(sessionId, path string) error`
  - 启动后台 goroutine 递归遍历远端目录，累计文件大小与文件/子目录数量
  - 通过 Wails EventsEmit 推送增量进度：`sftp-folder-size-progress:{sessionId}` → `{path, currentSize, fileCount, dirCount, done}`
  - 支持中途取消：监听 `sftp-folder-size-cancel:{sessionId}` 事件
  - 超时保护：最长 120s 自动终止
- [x] **前端 (React)**：在 `SftpPanel.tsx` 文件属性对话框中集成
  - 文件夹属性弹窗新增「大小」字段，初始显示「计算中...」旋转动画
  - 实时更新大小（友好格式：`1.23 GB · 4,567 文件 · 89 子目录`）
  - 提供「取消计算」按钮
  - 计算完成后缓存结果，避免重复请求

---

#### 24.1.4 快捷键冲突检测与自定义重映射（Shortcut Conflict Detection & Custom Remapping）

> **竞品现状**：Xshell 8、VS Code、JetBrains IDEs 均提供完整的快捷键可视化管理界面，支持冲突检测与一键自定义重映射。OmniTerminal 当前快捷键硬编码在各组件中，用户无法查看完整快捷键列表、检测冲突或自定义修改。

- [x] **前端 (React)**：创建 `hooks/useKeybindingManager.ts` 中央快捷键注册中心
  - 定义 `Keybinding` 类型：`{ id: string, label: string, category: string, defaultKey: string, userKey?: string, handler: () => void }`
  - 所有快捷键统一通过 `registerKeybinding(id, config)` 注册，替代分散的 `addEventListener`
  - 冲突检测算法：`detectConflicts()` 返回所有存在键位冲突的绑定对
  - 支持 `resetToDefaults(id?)` 恢复默认
- [x] **前端 (React)**：创建 `KeybindingManagerModal.tsx` 快捷键管理面板
  - 按分类分组显示所有已注册快捷键（终端操作 / 标签管理 / 文件操作 / 全局功能）
  - 每行：功能名称 + 当前键位 + 编辑按钮
  - 点击编辑进入「按键录制模式」：按下新组合键后自动检测冲突并高亮冲突项
  - 冲突时弹出确认：「此快捷键已绑定到 [xxx]，是否替换？」
  - 支持搜索过滤（按功能名或键位搜索）
  - 「恢复全部默认」按钮
- [x] **后端 (Go)**：`SettingsConfig` 新增 `CustomKeybindings map[string]string` 字段持久化用户自定义键位
- [x] **前端 (React)**：迁移现有硬编码快捷键至注册中心
  - `App.tsx` 全局键盘监听器重构为从 `useKeybindingManager` 读取配置
  - `TerminalInstance.tsx` 终端相关快捷键迁移
  - `Toolbar.tsx` 菜单快捷键提示标注动态读取

---

#### 24.1.5 OSC 52 双向剪贴板增强——本地与远程剪贴板统一体验（Unified Clipboard Experience）

> 此项为 24.1.1 的体验增强层，解决远端 tmux/screen 等复用器内的剪贴板不互通问题。

- [x] **前端 (React)**：远程剪贴板写入本地后弹出极淡 Toast 通知
  - `📋 远程剪贴板已同步` Toast，2s 自动消失
  - 可在设置中关闭此通知
- [x] **前端 (React)**：终端右键菜单新增「📤 发送剪贴板到远端」
  - 读取本地剪贴板，通过 OSC 52 反向写入远端 tmux buffer
  - 等效于 `tmux set-buffer "$(base64 -d)"`

---

#### 24.1.6 Docker / Kubernetes 容器直连（Container Direct Connection）

> **竞品现状**：Termius Teams、MobaXterm、Lens、k9s 均支持直接连接 Docker 容器或 Kubernetes Pod，无需手动 `docker exec` 或 `kubectl exec`。对于云原生运维场景，这是核心高频操作。OmniTerminal 当前**完全缺失容器直连能力**。

- [x] **后端 (Go)**：新增 `internal/core/container_manager.go`
  - **Docker 直连**：
    - `ListDockerContainers(sessionId string) ([]ContainerInfo, error)`：通过已建立的 SSH 连接执行 `docker ps --format '{{json .}}'` 获取容器列表
    - `ExecDockerContainer(sessionId, containerId, shell string) error`：执行 `docker exec -it {containerId} {shell}`，I/O 流接入 xterm.js
    - 自动检测容器内可用 Shell（`/bin/bash` → `/bin/sh` → `/bin/ash` 降级）
  - **Kubernetes Pod 直连**：
    - `ListK8sPods(sessionId, namespace string) ([]PodInfo, error)`：执行 `kubectl get pods -n {ns} -o json` 获取 Pod 列表
    - `ExecK8sPod(sessionId, namespace, pod, container, shell string) error`：执行 `kubectl exec -it -n {ns} {pod} -c {container} -- {shell}`
    - 支持 kubeconfig 上下文切换与命名空间过滤
- [x] **前端 (React)**：在 `SessionModal.tsx` 协议列表新增「Docker Container」与「Kubernetes Pod」
  - Docker 模式：选择关联的 SSH 会话（Docker 宿主机），自动列出容器，选择目标容器与 Shell
  - K8s 模式：选择关联的 SSH 会话（集群跳板机），输入 kubeconfig 路径，自动列出命名空间与 Pod
- [x] **前端 (React)**：创建 `ContainerExplorerDrawer.tsx` 容器资源浏览器
  - 左侧 Activity Bar 新增 🐳 容器图标
  - 树形展示：SSH 主机 → Docker/K8s → 容器/Pod 列表
  - 双击容器自动打开新 Tab 执行 `docker exec` / `kubectl exec`
  - 容器状态实时指示（Running 🟢 / Stopped 🔴 / CrashLoopBackOff 🟡）
  - 右键菜单：查看日志 (`docker logs -f`) / 重启容器 / 停止容器

---

#### 24.1.7 终端输出语义化解析与结构化渲染（Structured Output Rendering）

> **竞品现状**：Warp 2025 推出「Block Output Parsing」，可识别 `kubectl get pods` / `docker ps` 等命令的表格输出并渲染为可交互的数据表格。Nushell 原生支持结构化数据渲染。OmniTerminal 当前所有输出均为纯文本流。

- [x] **前端 (React)**：在 `TerminalInstance.tsx` 实现输出语义解析引擎
  - 基于命令边界检测（复用 §23.2.4 的 Prompt 检测逻辑）截取每条命令的输出块
  - 识别 JSON 输出：正则检测 `^[\s]*[{\[]`，解析成功后渲染为可折叠的 JSON 树视图
  - 识别表格输出：检测等宽列对齐（`header1  header2  header3` 格式），渲染为可排序的 HTML 数据表
  - 识别 CSV 输出：逗号/制表符分隔格式，渲染为表格
  - 识别 YAML 输出：`key: value` 格式，渲染为缩进树
- [x] **前端 (React)**：创建 `StructuredOutputOverlay.tsx` 组件
  - 命令输出右上角浮现小图标（📊 解析为表格 / 🌳 解析为 JSON 树）
  - 点击后在终端输出区域上方叠加渲染结构化视图（不替换原始文本）
  - 结构化视图支持：列排序、行过滤搜索、单元格复制、导出为 CSV/JSON
  - 按 Esc 或再次点击关闭结构化视图，回到原始文本
- [x] **前端 (React)**：在 `SettingsModal.tsx` 新增「智能输出解析」开关（默认关闭，避免性能影响）

---

### 24.2 界面高级功能——详细开发计划

> 本小节覆盖提升 OmniTerminal 差异化竞争力的**高级界面交互**功能。

---

#### 24.2.1 Warp 风格命令块 UI（Command Block UI — Warp Style）

> **竞品现状**：Warp Terminal 的命令块（Block）是其最核心的创新——每条命令及其输出被封装为独立的可折叠、可复制、可标记的「命令卡片」，彻底改变了传统终端的文本流范式。这是 §23.1 竞品矩阵中标记的 **❌ 缺口** 中影响力最大的功能。

- [x] **前端 (React)**：在 `TerminalInstance.tsx` 实现命令块检测与渲染引擎
  - **Prompt 边界检测**：复用 §23.2.4 的 Shell Prompt 正则识别逻辑（`$`、`#`、`>`、`❯`），将终端缓冲区分割为离散的命令块
  - **命令块数据结构**：`{ id: string, command: string, output: string, startLine: number, endLine: number, startTime: Date, endTime: Date, exitCode?: number, collapsed: boolean }`
  - **块边界视觉分隔**：每个命令块之间渲染 1px 极淡分隔线（`border-color: #262b35`），命令行本身左侧添加 2px 电光蓝竖条指示
- [x] **前端 (React)**：创建 `CommandBlockOverlay.tsx` 覆盖层组件
  - 在每个命令块的右上角悬浮工具条（hover 时显示）：
    - 📋 复制命令 / 📄 复制输出 / 🔼 折叠/展开 / 🔖 书签标记 / 🤖 AI 分析
  - 长输出（>50 行）自动折叠为前 5 行 + 后 5 行，中间显示 `··· 折叠了 N 行 ···`
  - 折叠的命令块点击展开时带平滑动画过渡
  - 命令块支持通过键盘 `↑`/`↓` 快速在块间跳转
- [x] **前端 (React)**：在 `SettingsModal.tsx` 终端面签新增「命令块模式」三档
  - `off`（传统文本流，默认）/ `blocks`（命令块 UI）/ `auto`（检测到交互式 Shell 时自动启用）
- [x] **前端 (React)**：命令块与已有功能联动
  - 命令耗时标注（§23.2.4）自动整合到命令块头部右侧
  - AI 摘要（§23.2.9）在命令块的 🤖 按钮中触发
  - 跨会话命令历史（§23.2.3）从命令块自动采集
- [x] **前端 (React)**：**零遮挡交互优化（Zero-Obstruction UX）**：
  - 彻底移除原本硬编码浮动在终端视口左下角的常驻切换胶囊，彻底消除对 Shell Prompt 提示符与打字光标的遮挡；
  - 切换入口优雅收纳至底部状态栏（`[ 🧬 命令块 ]` 实时状态指示胶囊）与终端右键上下文菜单；
  - 支持键盘快捷键 `Cmd+Shift+B` / `Ctrl+Shift+B`，以及在命令块模式下按 `Esc` 极速返回传统终端流。

---

#### 24.2.2 远程文件 Monaco 富文本编辑器（Monaco-Based Remote File Editor）

> **竞品现状**：VS Code Remote SSH、MobaXterm 内置编辑器、WindTerm 编辑器均支持语法高亮的远程文件编辑。OmniTerminal 当前 SFTP 文件编辑器仅为基础 `<textarea>`，缺乏语法高亮、行号、搜索替换等专业代码编辑体验。

- [x] **前端 (React)**：集成 Monaco Editor（VS Code 同款编辑器核心）
  - 安装：`npm install @monaco-editor/react monaco-editor`
  - 创建 `MonacoEditorModal.tsx` 全屏模态编辑器：
    - 顶部工具栏：文件名 + 语言选择 + 编码选择 + 保存按钮 + 关闭按钮
    - 中部：Monaco Editor 实例（支持 120+ 语言语法高亮）
    - 底部状态栏：行:列 位置 + 文件大小 + 修改状态指示
  - 语言自动检测：根据文件扩展名自动设置 Monaco language mode
  - 快捷键：`Ctrl+S` 保存（触发 SFTP 回传）、`Ctrl+F` 搜索、`Ctrl+H` 替换
  - 主题联动：自动匹配 OmniTerminal 当前暗色/亮色模式
- [x] **前端 (React)**：替换 `SftpPanel.tsx` 中的文件编辑入口
  - 双击可编辑文件时打开 Monaco 编辑器替代原有 textarea
  - 支持同时打开多个文件的 Tab 式编辑（编辑器内多标签页）
  - 未保存修改时关闭弹出确认弹窗
- [x] **后端 (Go)**：`SftpReadFile` 接口增强
  - 新增 `encoding` 参数支持非 UTF-8 编码文件的正确读取
  - 新增 `maxSize` 参数（默认 10MB），超出时提示用户使用外部编辑器
  - 文件保存时增加乐观锁：比对远端文件修改时间，冲突时提示覆盖/合并/取消

---

#### 24.2.3 SSH 隧道链路网络拓扑可视化（SSH Tunnel Chain Topology Visualization）

> **竞品现状**：SecureCRT 的 Session Manager 可显示 ProxyJump 级联路径。Royal TSX 有连接拓扑视图。但没有任何竞品提供完整的隧道网络图形化拓扑。这是 OmniTerminal 可建立差异化优势的特色功能。

- [x] **前端 (React)**：创建 `NetworkTopologyModal.tsx` 拓扑可视化面板
  - 使用 Canvas 2D 或 SVG 绘制网络拓扑图：
    - 节点（Node）：每个 SSH 主机渲染为圆角矩形卡片（主机名 + IP + 端口 + 连接状态色圈）
    - 边（Edge）：SSH 直连为实线箭头，ProxyJump 级联为虚线链式箭头
    - 隧道（Tunnel）：Local Forward 渲染为蓝色通道线，Remote Forward 为橙色，Dynamic SOCKS5 为紫色
  - 布局算法：自动分层排列（本地 → 跳板机 → 目标主机），支持拖拽调整位置
  - 交互功能：
    - 鼠标悬停节点显示详细信息（连接时长、RTT 延迟、流量统计）
    - 鼠标悬停隧道线显示端口映射关系与活跃连接数
    - 右键节点：断开 / 重连 / 打开新终端 / 查看主机监控
    - 右键隧道线：暂停 / 恢复 / 删除隧道规则
- [x] **前端 (React)**：在工具栏新增 `🌐 网络拓扑` 按钮，打开拓扑面板
- [x] **后端 (Go)**：新增 `GetNetworkTopology() (TopologyData, error)` 接口
  - 遍历所有活跃 SSH 连接，提取连接链路（直连 / 跳板机级联路径）
  - 遍历所有活跃隧道规则，关联到对应的 SSH 连接
  - 返回结构化的节点与边列表供前端渲染

---

#### 24.2.4 终端输出书签标记系统（Terminal Output Bookmark System）

> **竞品现状**：SecureCRT、iTerm2 (Mark) 支持在终端滚动历史中设置书签标记，快速跳转到重要输出位置。在长时间运维会话中，快速回溯到某次操作结果是高频需求。

- [x] **前端 (React)**：在 `TerminalInstance.tsx` 实现书签管理
  - 数据结构：`{ id: string, label: string, lineNumber: number, timestamp: Date, color: string }`
  - 快捷键 `Ctrl+Shift+M`：在当前可视行添加书签（弹出标签输入 mini 弹窗）
  - 快捷键 `Ctrl+Shift+↑/↓`：跳转到上一个/下一个书签位置
  - 书签行在行号区域显示彩色旗帜标记 🏴
  - 书签列表面板（侧边抽屉或 Popover）：
    - 显示所有书签：标签名 + 行号 + 时间 + 预览文本
    - 单击跳转到书签位置
    - 右键删除 / 编辑标签 / 更改颜色
- [x] **前端 (React)**：命令块模式（§24.2.1）下书签自动关联到命令块
  - 在命令块悬浮工具条中增加 🔖 书签按钮，一键标记整个命令块
- [x] **前端 (React)**：书签支持持久化到审计日志
  - 会话断开时将书签位置与上下文写入日志文件，便于事后审计回溯

---

#### 24.2.5 批量命令执行结果对比面板（Multi-Host Command Diff Panel）

> **竞品现状**：MobaXterm 的 MultiExec 模式可向多台主机同时发送命令并并排显示结果。Ansible 的 ad-hoc 模式也提供多主机输出聚合。对于集群巡检、配置核查场景，这是核心能力。OmniTerminal 当前仅有广播输入，但**缺少结果聚合对比**。

- [x] **前端 (React)**：创建 `MultiExecDiffModal.tsx` 批量执行与对比面板
  - **输入区**：
    - 命令输入框（多行支持）
    - 目标选择：从已连接的 Tab 列表多选目标会话（checkbox 列表）
    - 「执行」按钮
  - **结果展示区**：
    - 并排多栏模式：每个目标主机一栏，顶部显示主机名/IP，下方显示命令输出
    - 差异高亮：自动 diff 多栏输出，不一致的行标红高亮
    - 统一视图模式：聚合所有主机输出到单列表，每行前缀 `[hostname]`
  - **功能按钮**：
    - 导出为 CSV / JSON / HTML 报告
    - 一键复制全部结果
    - 过滤：仅显示有差异的行
- [x] **后端 (Go)**：新增 `ExecuteCommandOnSessions(sessionIds []string, command string) (map[string]CommandResult, error)`
  - 并发向多个已连接 SSH 会话发送命令（使用 `ssh.Session.CombinedOutput()`）
  - 收集每个会话的输出、退出码、执行耗时
  - 通过 Wails EventsEmit 推送增量结果
- [x] **前端 (React)**：在工具栏「工具」菜单新增「批量命令执行 (E)...」入口

---

#### 24.2.6 终端会话录屏 GIF/SVG 导出（Session Recording Export as GIF/SVG）

> **竞品现状**：Asciinema 网站支持 `.cast` 文件渲染为可嵌入的 SVG 动画。Terminalizer 支持导出 GIF。iTerm2 支持导出为 GIF 动画。OmniTerminal 已有 Asciinema `.cast` 录制，但**缺少导出为可分享的 GIF/SVG 媒体格式**。

- [x] **前端 (React)**：在 `SessionCastPlayerModal.tsx` 增加导出功能
  - **导出为 SVG 动画**：
    - 解析 `.cast` 文件，为每一帧生成 SVG 文本渲染快照
    - 使用 CSS `@keyframes` 动画在 SVG 内实现帧切换
    - 输出独立的 `.svg` 文件，可直接嵌入 README / 文档
  - **导出为 GIF 动画**：
    - 使用 `gif.js` 或 Canvas 录制方案：在隐藏 Canvas 上逐帧渲染 xterm 终端内容
    - 配置选项：帧率（5/10/15 FPS）、分辨率缩放、最大时长
    - 导出进度条 + 下载链接
  - **导出为 MP4 视频**（如 WebCodecs API 可用）：
    - 使用浏览器 `VideoEncoder` API 将 Canvas 帧编码为 H.264 MP4
- [x] **前端 (React)**：终端右键菜单新增「🎬 导出录屏为...」子菜单
  - 子项：「SVG 动画」/「GIF 动画」/「MP4 视频」

---

#### 24.2.7 Git 仓库文件内联 Diff 对比（Remote Git Inline Diff）

> **竞品现状**：VS Code Remote SSH 支持远端 Git 仓库的文件 Diff。OmniTerminal 已有 SFTP 双栏目录 Diff，但**缺少 Git 级别的文件变更对比**。

- [x] **后端 (Go)**：新增 `internal/app/sftp_handler.go` Git 相关接口
  - `SftpIsGitRepo(sessionId, path string) (bool, error)`：检测远端路径是否为 Git 仓库（执行 `git -C {path} rev-parse --is-inside-work-tree`）
  - `SftpGitStatus(sessionId, path string) ([]GitFileStatus, error)`：执行 `git -C {path} status --porcelain` 获取变更文件列表
  - `SftpGitDiff(sessionId, filePath string) (string, error)`：执行 `git diff {filePath}` 获取 unified diff
  - `SftpGitFileShow(sessionId, filePath, ref string) (string, error)`：执行 `git show {ref}:{filePath}` 获取特定版本文件内容
- [x] **前端 (React)**：在 `SftpPanel.tsx` 集成 Git 状态指示
  - 当远端目录为 Git 仓库时，文件列表中变更文件显示状态标记（🟢 新增 / 🟡 修改 / 🔴 删除 / ⚪ 未跟踪）
  - 右键变更文件新增「📝 查看 Git Diff」
  - 使用 Monaco Editor 的 `DiffEditor` 组件渲染左右对比视图（左 HEAD 版本 / 右当前版本）

---

#### 24.2.8 终端 Quake 下拉模式动画增强（Quake Dropdown Animation Polish）

> **当前状态**：§19.7 标记 Quake 模式已实现（全局热键唤出），但 §23.4 #5 指出下拉动画存在生硬感，需要优化弹性曲线与毛玻璃过渡。代码审计确认 **Quake 模式核心逻辑缺失**（App.tsx 中无 `quake`/`dropdown` 相关代码），需要重新实现。

- [x] **后端 (Go)**：实现全局热键监听
  - 使用系统级热键注册（macOS: `CGEventTap` / Windows: `RegisterHotKey` / Linux: `XGrabKey`）
  - 或集成 `github.com/minio/selfupdate` 级别的系统集成方案
  - 配置：全局唤醒热键（默认 `` Ctrl+` ``，可自定义）
  - 触发时发送 Wails 事件 `quake-toggle` 通知前端
- [x] **前端 (React)**：实现 Quake 下拉终端模式
  - 监听 `quake-toggle` 事件，切换 Quake 面板的显示/隐藏
  - 动画：从屏幕顶部平滑滑出（`transform: translateY(-100%) → translateY(0)`）
  - 使用 Spring 弹性缓动曲线（`cubic-bezier(0.34, 1.56, 0.64, 1)` 或 CSS `spring()` 函数）
  - 毛玻璃背景：`backdrop-filter: blur(12px); background: rgba(15, 17, 21, 0.85)`
  - Quake 面板高度可配置（默认屏幕 40%），支持拖拽调节
  - Quake 面板拥有专属独立本地会话（`quake_dropdown_session`），实现与主工作区会话隔离，防止会话冲突和被意外中断 (signal: killed)
- [x] **前端 (React)**：`SettingsModal.tsx` 新增 Quake 模式配置面签
  - 全局热键配置（按键录制器）
  - 面板高度百分比（20%~80%）
  - 动画时长（100ms~500ms）
  - 打开时自动运行的命令
  - 「在所有桌面/工作区显示」开关

---

### 24.3 智能运维与深度集成——详细开发计划

> 本小节覆盖面向专业运维场景的**深度集成与智能化**功能。

---

#### 24.3.1 内置 TOTP/MFA 令牌管理器（Built-in TOTP Authenticator）

> **竞品现状**：Termius Pro 内置 TOTP 令牌管理器，SSH 登录时自动填充 OTP 验证码，无需切换到手机 Authenticator App。对于启用了两步验证的堡垒机/跳板机场景，这是巨大的效率提升。

- [x] **后端 (Go)**：新增 `internal/app/totp_handler.go`
  - 引入 `github.com/pquerna/otp/totp` 依赖
  - `AddTOTPSecret(sessionId, label, secret string, algorithm, digits, period) error`：添加 TOTP 密钥条目（AES-256-GCM 加密存储）
  - `GenerateTOTPCode(sessionId string) (string, int, error)`：生成当前时间窗口的 6/8 位 OTP 验证码 + 剩余有效秒数
  - `ListTOTPEntries() ([]TOTPEntry, error)`：列出所有 TOTP 条目
  - `DeleteTOTPEntry(id string) error`：删除条目
  - `ImportTOTPFromURI(otpauth string) error`：解析 `otpauth://totp/...` URI 导入
- [x] **前端 (React)**：创建 `TOTPManagerModal.tsx` 令牌管理器
  - 条目列表：标签名 + 当前 OTP 码（大字号显示）+ 倒计时进度环（30s 周期）
  - 添加条目：手动输入密钥 / 扫描二维码（通过摄像头或图片识别）/ 导入 `otpauth://` URI
  - 一键复制当前验证码
  - 关联到会话：在 `SessionModal.tsx` 认证面签中选择 TOTP 条目，Keyboard-Interactive 认证时自动填入
- [x] **前端 (React)**：Keyboard-Interactive 认证流程集成
  - 当认证 prompt 包含 `verification code`、`OTP`、`token`、`one-time` 等关键词时
  - 如果该会话关联了 TOTP 条目，自动生成并填入验证码
  - 右侧显示小图标提示「🔐 已自动填入 TOTP 验证码」

---

#### 24.3.2 批量主机巡检报告生成器（Batch Host Inspection Report Generator）

> **竞品现状**：Ansible、SaltStack 提供主机巡检能力但需要额外部署。FinalShell 支持多主机命令执行但无报告。OmniTerminal 已有主机监控仪表盘和批量命令发送，但**缺少结构化巡检报告**能力。

- [x] **后端 (Go)**：新增 `internal/app/inspection_handler.go`
  - `RunInspection(sessionIds []string, checks []InspectionCheck) (InspectionReport, error)`
  - 内置巡检项模板：
    - 系统信息：`uname -a`, `cat /etc/os-release`
    - 资源负载：`uptime`, `free -h`, `df -h`
    - 安全审计：`last -n 10`, `cat /var/log/auth.log | tail -20`, `ss -tuln`
    - 服务状态：`systemctl list-units --state=failed`
    - 磁盘健康：`dmesg | grep -i error | tail -10`
  - 并发执行：使用 `errgroup` 并发在多主机上执行巡检脚本
  - 输出结构化 JSON 报告
- [x] **前端 (React)**：创建 `InspectionReportModal.tsx` 巡检报告面板
  - 巡检配置：选择目标主机列表 + 勾选巡检项
  - 执行进度：实时显示每台主机的执行状态
  - 报告视图：以表格形式展示各主机各巡检项的结果，异常项标红
  - 导出功能：一键导出为 HTML / PDF / Markdown 报告
  - 历史记录：保存历次巡检报告，支持趋势对比
- [x] **前端 (React)**：在工具栏「工具」菜单新增「🔍 主机巡检 (I)...」入口

---

#### 24.3.3 终端会话实时共享与协作（Realtime Terminal Session Sharing）

> **竞品现状**：Warp Teams 支持终端会话共享。tmate（基于 tmux）支持只读/读写模式的终端共享。对于团队协作排障、培训演示场景，这是核心功能。

- [x] **后端 (Go)**：新增 `internal/app/share_handler.go`
  - **本地共享方案**（无需外部服务器）：
    - `StartShareSession(sessionId string, mode string) (shareUrl string, error)`：
      - 启动本地 WebSocket 服务器（随机端口）
      - 将 SSH 会话的 I/O 流多路复用到 WebSocket
      - 返回 `ws://local-ip:port/share/{token}` URL
    - `mode`：`readonly`（只读观察）/ `readwrite`（可交互控制）
    - `StopShareSession(sessionId string) error`：停止共享
  - **安全机制**：
    - 一次性 Token 认证（UUID v4）
    - 可选密码保护
    - 最大观察者数限制（默认 5）
    - 自动超时断开（默认 30 分钟）
- [x] **前端 (React)**：Tab 右键菜单新增「🔗 共享此会话...」
  - 弹出共享配置弹窗：模式选择 + 密码设置 + 超时配置
  - 启动后在 Tab 标签上显示 📡 共享图标
  - 底部显示「当前 2 人观看」观察者计数
  - 提供「复制共享链接」按钮
- [x] **前端 (React)**：创建 `SharedTerminalViewer.tsx` 共享终端观察页面
  - 独立页面（或新窗口），仅包含 xterm.js 终端视图
  - WebSocket 连接到共享服务器，实时渲染远端终端输出
  - 只读模式：仅显示，禁止输入
  - 读写模式：允许键盘输入，多光标协作提示
---

## 二十五、竞品横向全景对标、未来演进方向与 Phase 8 开发计划（Comprehensive Competitor Benchmark, Future Vision & Phase 8 Roadmap）

> 本节基于 2026 最新行业实践，横向深度对标 **Xshell 8 / SecureCRT 9**（传统商业标杆）、**Warp (2026)**（AI-Native 现代终端）、**Termius Pro**（多端协同与云同步）、**WindTerm 2.7+**（极客补全与会话分析）、**Ghostty 1.x / WezTerm**（高性能图形协议先锋）以及 **FinalShell / 1Panel**（国内轻量运维与硬件探针），全面评估 OmniTerminal 当前功能体系的优势、短板与未来演进路线，并制定详细开发排期。

---

### 25.1 国际与国内顶级竞品全景雷达矩阵对比（2026 Competitor Benchmark Matrix）

| 核心维度 / 功能领域 | OmniTerminal (当前实态) | Xshell 8 / SecureCRT | Warp (2026) | Termius Pro | WindTerm 2.7 | Ghostty / WezTerm | FinalShell |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **架构与体积** | **Go + Wails (~10MB, <1s启动)** | C++ 原生 (~60MB) | Rust 原生 (~120MB) | Electron (~300MB) | C++ Qt (~40MB) | Zig/Rust 原生 (~20MB) | Java/Swing (~150MB) |
| **内存占用 (10会话)** | **极低 (~80MB)** | 极低 (~60MB) | 中等 (~250MB) | 极高 (~600MB) | 低 (~90MB) | 极低 (~50MB) | 高 (~400MB) |
| **现代工程美学** | **VS Code Dark Modern / 32主题** | 传统 Win32/MFC 风格 | 现代极简卡片流 | 扁平现代风 | 密集专业暗黑 | 纯终端无UI外框 | 传统暗黑风格 |
| **无限嵌套会话树** | **完整支持 (含级联继承)** | 完整支持 | 不支持 (平铺/标签) | 支持文件夹分组 | 支持文件夹分组 | 不支持 (依赖配置) | 支持目录树 |
| **并排 SFTP & 富文本编辑** | **并排滑出 + Monaco 代码高亮** | 需打开独立 Xftp | 无 SFTP 文件管理 | 独立 SFTP 窗口 | 侧栏并排文件树 | 无图形 SFTP | 底部/侧栏并排 |
| **外部编辑器双向联动** | **支持 VSCode/Cursor 自动回传** | 不支持 | 不支持 | 不支持 | 基础文本编辑 | 不支持 | 基础文本编辑 |
| **命令块 (Block) UI** | **完整支持 (可折叠/复制/Esc)** | 不支持 (传统文本流) | 原生核心特色 | 不支持 | 基础折叠支持 | 不支持 | 不支持 |
| **终端内联图像协议** | **完整支持 (Sixel & iTerm2 协议)** | 不支持 | 仅专属图形块 | 不支持 | 部分支持 | **原生完整支持** | 不支持 |
| **行内即时 AI Copilot** | **完整支持 (Cmd+K行内浮层+报错修复)** | 不支持 | **原生内联深度集成** | 侧栏独立对话 | 不支持 | 不支持 | 不支持 |
| **容器直接运维 (Docker/K8s)**| **完整支持 (容器树+exec终端+内联文件树+多容器日志矩阵)** | 不支持 (需手工命令) | 基础命令补全 | 不支持 | 不支持 | 不支持 | 不支持 |
| **多设备安全云同步** | **完整支持 (WebDAV/Gist/S3 E2EE零知识云同步)** | 不支持 (手工文件) | 专属云账号存储 | **核心特色 (E2EE云)** | 不支持 | Git 托管配置 | 专属云同步 |
| **内置 TOTP / MFA 令牌** | **完整支持 (加密库+自动填入)** | 不支持 | 不支持 | 支持 (Pro 版) | 不支持 | 不支持 | 不支持 |
| **会话实时共享与协同** | **完整支持 (本地局域网Web投屏)**| 不支持 | 依赖 Warp 云协同 | 不支持 | 不支持 | 不支持 | 不支持 |
| **轻量级服务器实时遥测** | **完整支持 (Mini右上角胶囊+实时网络/CPU/RAM)**| 不支持 | 不支持 | 不支持 | 不支持 | 不支持 | **核心特色 (实时负载)**|
| **自动化 SOP Runbook 编排**| **完整支持 (参数化 Runbook 编排与多步执行流水线)** | 基础登录脚本 | **核心特色 (Runbooks)**| 基础 Snippets | 基础脚本模式 | 不支持 | 基础预设命令 |

---

### 25.2 核心差距深度评估（Gap Analysis — 6 大关键补强方向）

#### 1. 终端内联图像协议渲染（Inline Terminal Graphics Protocol: Sixel & iTerm2）
- **痛点**：当前终端输出图片时仅显示二进制乱码；现代 CLI 生产力工具（如 `yazi` / `ranger` 终端文件管理器、`timg` / `viu` 图片预览、`fastfetch` / `neofetch` 系统徽标）无法在 OmniTerminal 中直接呈现图像，需频繁切到 SFTP 面板下载查看。
- **目标方案**：充分发挥工程依赖中已引入的 `@xterm/addon-image` 插件能力，在 `TerminalInstance.tsx` 中完整挂载 Sixel 协议与 iTerm2 `\033]1337;File=...` 图像序列解析器，并在 xterm.js 中实现像素级显存安全受限渲染。

#### 2. 终端行内即时 AI Copilot 与报错自动修复（Inline AI Copilot & Smart Remediation）
- **痛点**：现有的 AI 助手位于独立模态窗口中，无法感知当前终端的光标上下文与上一条命令的执行失败原因；运维人员遇到复杂命令或报错退出码时，仍需频繁复制粘贴。
- **目标方案**：对标 Warp，引入 `Cmd+K` / `Ctrl+K` 终端行内无感弹出框。支持：
  1. 自然语言秒转 Shell 命令（如“查找大于 100M 且 7 天内修改过的日志”），一键回车填充到终端；
  2. 智能诊断：检测到上一条命令非零退出码（如 `Exit Code 127` 或 `Permission denied`）时，自动弹出轻量建议气泡并提供“一键修改重试”按钮；
  3. 支持免翻墙接入 DeepSeek V3 / OpenAI / Claude 以及本地 Ollama 离线私有模型。

#### 3. 运维规范 SOP 与交互式 Runbook 编排（Interactive Parametric Runbooks）
- **痛点**：现有的「快捷命令集」仅支持单行静态命令。在实际高危运维场景中，命令往往包含变量（如 `${TARGET_IP}`、`${CONTAINER_NAME}`、`${BACKUP_DATE}`），直接硬敲极易酿成生产事故。
- **目标方案**：设计带参数插值的 SOP Runbook 工作流：
  1. 支持定义变量占位符与下拉枚举选项（如 `${ENV:prod|staging}`）；
  2. 点击执行时自动弹出结构化参数确认卡片，参数合法性校验通过后一键安全投递；
  3. 支持多步命令链按序交互式触发（如：停止服务 → 备份数据 → 更新镜像 → 启动验证），每步具备执行状态追踪。

#### 4. 多设备零知识端到端加密云同步（Zero-Knowledge E2EE Sync via WebDAV/Git）
- **痛点**：目前多设备间迁移配置仅依赖手动导出 `.omnisb` 加密备份包，在公司台式机、移动笔记本与家庭工作站之间切换时体验割裂。
- **目标方案**：对标 1Password / Termius 的安全模型，在主密码派生密钥（AES-256-GCM）完全在本地保护的前提下：
  1. 支持挂载标准 WebDAV 存储（坚果云、Nextcloud、群晖/威联通 NAS、自建 WebDAV）；
  2. 支持绑定 GitHub / Gitee Private Gist；
  3. 实现增量双向同步与版本冲突合并，服务端仅保存密文，实现完全的“零知识云同步”。

#### 5. 终端视口常驻 Mini 服务器健康度遥测小部件（Mini Server Telemetry Capsule）
- **痛点**：主机监控大屏虽然详尽，但全屏切换打断了连续的命令行敲击思路；无法在打命令时实时察觉服务器 CPU 飙升或磁盘被打满。
- **目标方案**：在活动终端 Tab 栏右侧或终端视口右上角增加半透明常驻 Mini Capsule：
  1. 采用非侵入式轻量探针，实时显示当前连接服务器的 CPU 使用率、内存使用率与网络瞬时速率；
  2. 指标正常时为温和微灰色，超过阈值（如 CPU > 85%）平滑变为黄色/红色呼吸预警；
  3. 单击小部件平滑展开微型折线走势图或一键直达完整监控面板。

#### 6. 云原生容器全景运维深化（Container FS Explorer & Multi-Log Streaming）
- **痛点**：当前容器直连仅支持打开终端交互，无法便捷查看或编辑容器内部的微服务配置文件，也无法同时流式观测多个容器的启动日志。
- **目标方案**：
  1. 在容器抽屉中扩展“容器内文件浏览”，通过 `docker exec` / `kubectl exec` 流式管道无需开端口直接呈现容器内目录树，并直接联动 Monaco 编辑器；
  2. 容器日志矩阵：支持多选 2~4 个容器，同屏并排分屏流式跟踪实时日志（`docker logs -f` 聚合流）。

---

### 25.3 未来演进发展方向定位（Core Strategic Pillars）

1. **极致轻便与即开即用（Ultra-Lightweight & Sub-Second Startup）**：坚定采用 Go + Wails 架构，绝不倒退回臃肿庞大的 Electron 技术栈，包体积严格控制在 15MB 以内，内存占用控制在竞品 1/4 左右。
2. **现代极客工程美学（VS Code Engineering Aesthetics）**：保持现代工作台的视觉紧凑度与通透感，杜绝低质塑料感界面与杂乱悬浮框。
3. **安全第一与零信任防护（Zero-Trust & Zero-Knowledge Security）**：所有凭证存盘与跨端漫游必须采用强加密保护；所有终端热路径严禁写盘与无序日志逃逸。
4. **AI 与自动化无感赋能（AI-Assisted Workflow Augmentation）**：AI 不是炫技的独立对话框，而是深度嵌合在击键、补全、排障与执行流程中的生产力加速器。

---

### 25.4 Phase 8 与 Phase 9 详细开发排期计划（Roadmap & Milestones）

#### Phase 8 (v1.8.0 - 终端协议新突破与行内 AI Copilot)

- [x] **25.4.1 终端 Sixel / iTerm2 内联图像渲染引擎**
  - [x] **前端 (React)**：在 `TerminalInstance.tsx` 中正式配置并挂载 `@xterm/addon-image` 插件实例
  - [x] **前端 (React)**：适配 Sixel 协议与 iTerm2 图像传输转义序列（`OSC 1337 ; File=...`）
  - [x] **前端 (React)**：增加内存与视口缓存保护（限制同时缓存的最大图像尺寸与数量，防范极端大量图像导致 WebGL 崩溃）
  - [x] **前端 (React)**：设置中心外观面签提供内联图像开关与 64MB~512MB 存储上限配置，保护二进制流免受正则干扰
  - [x] **测试验证**：单元测试全量覆盖并通过，多目标（macOS/Windows）与 DMG 零告警构建验证完毕

- [x] **25.4.2 行内即时唤醒 AI Copilot（Inline AI Terminal Assistant）**
  - [x] **前端 (React)**：创建 `InlineAICopilotPopover.tsx` 终端行内浮层组件，支持通过 `Cmd+K` / `Ctrl+K` 在当前光标行瞬间唤醒
  - [x] **前端 (React)**：支持自然语言输入 → 调用后端 AI 模型生成精准 Shell 命令 → 按 Tab/Enter 一键填充到终端
  - [x] **前端 (React)**：**智能排障气泡（Smart Remediation）**：当捕捉到上一条命令返回非零退出码（或关键错误正则）时，在命令块右上角弹出智能提示，一键分析原因并提供修正命令
  - [x] **后端 (Go)**：在 `internal/app/ai_handler.go` 中扩展流式输出接口与针对当前终端操作系统/Shell 类型的 Prompt 上下文增强
  - [x] **前端 (React)**：设置中心新增「AI Copilot」专属配置面签，支持配置供应商（DeepSeek / OpenAI / Claude / 本地 Ollama）、API Key、模型名称与自定义 Prompt

- [x] **25.4.3 终端视口 Mini 服务器硬件遥测小部件（Mini Server Telemetry Widget）**
  - [x] **后端 (Go)**：在 `internal/core/host_monitor.go` 中提供极轻量微开销采样通道，每 3 秒获取一次远程机器的 CPU%、内存%、网络 KB/s（无需启动全量监控进程）
  - [x] **前端 (React)**：在当前活动 Tab 内部右上角渲染极简磨砂胶囊徽标（展示当前服务器 CPU / RAM 实时占比与健康呼吸灯）
  - [x] **前端 (React)**：点击胶囊时弹出紧凑微图表浮层，并提供「打开完整监控中心」直达入口；设置中提供该常驻小部件的显隐开关

---

#### Phase 9 (v1.9.0 - 跨设备 E2EE 云同步与专业自动化 SOP)

- [x] **25.4.4 多设备零知识端到端加密云同步（Zero-Knowledge E2EE Cloud Sync）**
  - [x] **后端 (Go)**：新增 `internal/app/sync_handler.go` 与 `internal/crypto` 零知识加密扩展
  - [x] **后端 (Go)**：实现 WebDAV 客户端驱动，支持与坚果云、Nextcloud、群晖 WebDAV 服务端连接
  - [x] **后端 (Go)**：实现基于主密码派生 AES-256-GCM 的增量配置加密打包与解密合并逻辑（服务端存储内容为完全不可解密密文）
  - [x] **后端 (Go)**：实现基于 Private Gist 的配置存储驱动（支持 GitHub / Gitee Personal Access Token）
  - [x] **前端 (React)**：创建 `CloudSyncModal.tsx` 云同步管理面板，支持配置同步方式、手动立即同步、启动时自动拉取与增量合并

- [x] **25.4.5 参数化 SOP Runbook 运维手册与交互式执行流（Interactive SOP Runbooks）**
  - [x] **前端 (React)**：创建 `RunbookManagerModal.tsx` 运维手册编排管理面板，支持一键快捷键 `Ctrl+Shift+R` / `Cmd+Shift+R` 唤起
  - [x] **前端 (React)**：支持创建多步骤执行计划（Step 1: 检查服务状态 → Step 2: 备份数据库 → Step 3: 更新发布），支持单步执行与流水线自动流
  - [x] **前端 (React)**：支持参数化动态变量（如 `${HOST_IP}`、`${SERVICE_NAME}`、`${BACKUP_DIR}`），执行时自动渲染交互式表单
  - [x] **后端 (Go)**：在 `internal/app/runbook_handler.go` 实现 Runbook 模板存储、4 大行业内置预设（Nginx、Linux健康检查、Docker修剪、MySQL备份）、导入导出与分步执行审计历史归档

- [x] **25.4.6 Docker / K8s 容器内联文件浏览与多容器日志流矩阵**
  - [x] **后端 (Go)**：在 `internal/core/container_manager.go` 与 `internal/app/container_handler.go` 中实现容器内虚拟文件系统 `ListContainerFiles`、`ReadContainerFile`、`WriteContainerFile` 与并发 `GetMultiContainerLogs`（通过 `docker exec / kubectl exec` 读写目录与文件）
  - [x] **前端 (React)**：在 `ContainerExplorerDrawer.tsx` 中支持内联展开容器内部文件树、面包屑导航、目录穿透，创建 `ContainerFileEditorModal.tsx` 实现一键查阅修改并保存写回
  - [x] **前端 (React)**：支持多选微服务容器与 Pod，创建 `MultiLogMatrixModal.tsx` 在 2~4 独立网格矩阵中同屏追踪多容器实时输出日志（Multi-Log Matrix），支持正则过滤、暂停追踪与清屏


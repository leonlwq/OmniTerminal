# OmniTerminal

OmniTerminal 是一款现代、跨平台的 SSH/SFTP 终端生产力工作台，专为追求极致效率、优雅美学与原生桌面体验的开发者、运维与 SRE 工程师打造。基于 Go 与 React (Wails 框架) 构建，兼具原生级别的性能与现代化的极客交互体验，完美支持 macOS、Windows 与 Linux。

![App Icon](./build/appicon.png)

## 🌟 核心特性 (Features)

* **现代一体化工作台 (Modern Pro Workspace)**：整合专属 Omnibar 快速直连胶囊、全局快捷命令中心与细腻微圆角现代暗黑设计。
* **无限级会话树管理器**：支持多层级文件夹、拖拽排序、状态连通性探测与批量分组连接。
* **双栏联动的 SFTP 传输**：终端与远程文件管理器右侧无缝并排，支持并发分片传输、实时传输进度队列抽屉与文件即时编辑。
* **多终端胶囊选项卡 (Capsule Tabs) 与分屏**：支持水平/垂直/田字格多分屏、标签拖拽分离为独立窗口与状态呼吸指示灯。
* **全量主密码安全凭证库**：基于 AES-256-GCM 对所有私钥、密码进行加密盘内存储，支持闲置自动锁屏防护。
* **自动化脚本与快捷指令**：支持多行撰写 Compose Pane、宏录制回放、自动化触发器 (Triggers) 与 Python/JS 自动化脚本。
* **GPU 硬件加速渲染**：终端内核采用 xterm.js WebGL 渲染，支持平滑 60fps 输出与极低 CPU/内存占用。

## 📥 下载与安装

您可以直接前往 [Releases 页面](https://github.com/leonlwq/omniterminal/releases) 获取为您系统编译好的二进制包：
- **macOS**: 提供针对 Intel 与 Apple Silicon 的 `.dmg` 安装包
- **Windows**: 提供免安装单文件与 NSIS 安装向导 `.exe`
- **Linux**: 提供通用 AppImage 与 `.deb` 文件

## 🚀 本地开发与构建

OmniTerminal 基于 [Wails v2](https://wails.io/) 构建。

### 环境准备

1. 安装 Go (>= 1.22)
2. 安装 Node.js (>= 18) 与 npm
3. 安装 Wails 命令行工具:
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### 运行开发模式

开发模式将同时启动 React 的热重载服务器与 Go 后端程序：
```bash
wails dev
```

### 编译正式版

要为当前系统打包，请运行：
```bash
wails build -clean
```

## 📝 许可证 (License)

本项目采用 MIT 许可证。欢迎提交 Issue 与 Pull Request 共同建设 OmniTerminal！

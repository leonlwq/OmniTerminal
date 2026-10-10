<p align="center">
  <img src="./build/appicon.png" alt="OmniTerminal 图标" width="120" height="120" />
</p>

<h1 align="center">OmniTerminal</h1>

<p align="center">
  面向服务器集群运维与系统开发的高性能跨平台 SSH / SFTP 终端桌面工作台。
</p>

<p align="center">
  <a href="./README.md">English</a> · <b>简体中文</b> · <a href="./README_JA.md">日本語</a> · <a href="./README_KO.md">한국어</a>
</p>

<p align="center">
  <a href="https://github.com/leonlwq/OmniTerminal/releases"><img src="https://img.shields.io/github/v/release/leonlwq/OmniTerminal?color=0078d4&label=release" alt="Release"></a>
  <a href="https://omniterminal.leonlwq.com/"><img src="https://img.shields.io/badge/website-omniterminal.leonlwq.com-2ea44f" alt="官网"></a>
  <a href="https://github.com/leonlwq/OmniTerminal/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="开源协议"></a>
  <img src="https://img.shields.io/badge/go-%3E%3D1.22-00ADD8?logo=go" alt="Go 版本">
  <img src="https://img.shields.io/badge/wails-v2-DF1A29" alt="Wails 框架">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="支持平台">
</p>

---

## 项目概述

OmniTerminal 是一款基于 Go 高并发核心与现代 Web 技术栈 (Wails v2 + React 19) 构建的原生桌面 SSH/SFTP 客户端。项目遵循标准分层工程架构，专为替代陈旧终端工具设计，提供 WebGL GPU 硬件加速渲染、侧边联动 SFTP 传输与本地零明文凭据加密保护。

* **官方网站**: [https://omniterminal.leonlwq.com/](https://omniterminal.leonlwq.com/)
* **Issue 反馈**: [GitHub Issues](https://github.com/leonlwq/OmniTerminal/issues)

---

## 核心工程特性

### 1. 现代化工作台架构
- **顶栏起飞胶囊 (Omnibar)**：支持 `ssh://user@host:port` 单行快捷直连，免除强制存盘流程。
- **树状会话层级管理**：支持无限级嵌套文件夹、拖拽重排与彩色状态标识；提供跳板机与端口转发配置，子会话自动级联继承父级模板。
- **VS Code Dark Modern 界面范式**：采用模块化五层架构 (`internal/app` 接口层、`internal/core` 核心链路、`internal/models` 数据契约、`internal/config` 统一配置、`internal/crypto` 加密工具)。

### 2. 侧边抽屉式联动 SFTP
- **同屏一体化视口**：终端右侧无缝滑出文件管理器抽屉，维持当前会话工作目录与上下文关联，告别独立弹窗。
- **并发传输队列**：多任务分片并发上传/下载、断点续传支持与远端文件权限 (`chmod`) 快捷管理。

### 3. 本地主密码凭证金库 (Zero-Plaintext)
- **PBKDF2 与 AES-256-GCM 存盘加密**：所有会话连接密码、私钥与 TOTP 密钥均通过主密码派生密钥高强度加密存盘。
- **零明文留存与闲置保护**：敏感数据严禁明文落地；支持超时闲置自动触发磨砂玻璃锁屏。

### 4. GPU 硬件加速终端渲染
- **xterm.js WebGL 渲染管线**：高频打印大容量日志流稳定保持 60 FPS 刷新率。
- **零热路径磁盘写盘 (Zero Hot-path Logging)**：彻底废除 PTY I/O 读写主链路中的无轮转临时调试日志，避免内存逃逸与堆分配开销。
- **10ms IPC 批处理流控**：采用 10ms 批处理窗口合并碎片化事件，配合字符延时发送机制彻底杜绝高吞吐时 IPC 丢包。

### 5. 多分屏视口比例同步滚动
- **灵活分屏布局**：支持水平与垂直多分屏对比显示。
- **视口比例同步联动**：基于相对视口高度比例实现多屏同步滚动，大幅提升集群多节点日志对比排障效率。

### 6. 命令自动化与多行撰写
- **Compose 广播面板**：底部折叠面板支持多行指令富文本编辑，一键向所有活动终端广播执行。
- **Expect 式登录自动应答**：支持基于正则匹配的登录交互自动响应，简化日常重复性巡检运维。

---

## 竞品特性横向对比

| 核心特性维度 | OmniTerminal | Xshell | SecureCRT | Termius |
| :--- | :--- | :--- | :--- | :--- |
| **开源协议与价格** | **MIT 完全免费开源** | 商业付费 / 严格限制 | 商业买断 ($99+) | 月度订阅制 ($10+/月) |
| **跨平台原生支持** | **macOS / Windows / Linux** | 仅 Windows | 跨平台 (旧版界面) | 跨平台 (Electron 内存占用高) |
| **SFTP 联动机制** | **原生侧边抽屉联动** | 需独立弹窗唤起 Xftp | 独立复杂弹窗 | 独立切换页面 |
| **凭据存储安全** | **AES-256-GCM 本地加密** | 存在明文导出风险 / 弱加密 | 传统配置文件存储 | 强制云端同步账号体系 |
| **终端渲染引擎** | **xterm.js WebGL GPU 硬件加速** | 传统 GDI / DirectWrite | 传统 Win32 绘制 | Electron 软件渲染 |
| **UI 架构与交互** | **VS Code Dark Modern 规范** | 传统 Windows 对话框 | 经典多级菜单栏风格 | 移动端扁平风格 |
| **多分屏同步滚动** | **支持 (基于视口比例)** | 不支持 | 不支持 | 不支持 |

---

## 发行版下载与安装

全平台编译产物均可在 [GitHub Releases](https://github.com/leonlwq/OmniTerminal/releases) 页面或 [官方网站](https://omniterminal.leonlwq.com/) 获取：

| 操作系统平台 | 架构规格 | 安装包类型 | 文件名称 |
| :--- | :--- | :--- | :--- |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | DMG 镜像 | `OmniTerminal-macos-arm64.dmg` |
| **macOS** | Apple Silicon (ARM64) | 绿色免安装 ZIP | `OmniTerminal-macos-arm64.zip` |
| **macOS** | Intel 64 位 (x86_64) | DMG 镜像 | `OmniTerminal-macos-intel.dmg` |
| **Windows** | 64 位 (x86_64 / amd64) | 绿色免安装 ZIP | `OmniTerminal-windows-amd64.zip` |
| **Windows** | ARM64 (Surface / Snapdragon) | 绿色免安装 ZIP | `OmniTerminal-windows-arm64.zip` |
| **Linux** | 64 位 (glibc 2.35+) | 通用标准 tar.gz | `OmniTerminal-linux-amd64.tar.gz` |

---

## 本地编译与构建

OmniTerminal 基于 [Wails v2](https://wails.io/) 与 Go 语言构建。

### 环境准备

1. **Go 语言环境**: 版本 `>= 1.22` ([golang.org](https://go.dev/dl/))
2. **Node.js**: 版本 `>= 18` 与 `npm` ([nodejs.org](https://nodejs.org/))
3. **Wails CLI 工具**:
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### 运行开发模式

开发模式将同时启动前端热重载服务与 Go 后端通信调试：

```bash
wails dev
```

### 编译正式发行包

为当前平台编译打包生产版本二进制文件：

```bash
wails build -clean
```

跨平台交叉编译及全矩阵发布脚本请参考 [build.sh](./build.sh) 或 GitHub Actions CI 配置文件。

---

## 常用快捷键速查

| 快捷键 | 触发区域 | 功能说明 |
| :--- | :--- | :--- |
| `Cmd/Ctrl + C` | 终端主视口 | 存在文本选区时执行复制，无选区时透传 `SIGINT` 中断信号 |
| `Cmd/Ctrl + Shift + F` | 终端主视口 | 呼出实时日志过滤面板 (基于正则匹配实时抓取) |
| `Ctrl + Enter` | Compose 面板 | 向所有活动终端分屏一键广播多行编写指令 |
| `Cmd/Ctrl + F` | 终端主视口 | 终端内全文检索与正则高亮匹配 |
| `F11` | 主窗口 | 切换无边框全屏工作模式 |
| `双击 Tab 栏空白` | 页签区域 | 新建会话或打开本地 Shell 终端 |

---

## 安全设计规范

- **统一主目录寻址**：所有配置、密钥与缓存均通过 `internal/config` 统一归一化至 `~/.omniterminal`，严禁业务模块硬编码路径。
- **敏感凭证零明文存盘**：会话密码、私钥与 TOTP 均经 PBKDF2 主密钥派生算法通过 AES-256-GCM 加密后落盘。
- **并发状态安全保护**：活动连接池、会话 Map 与 SFTP 句柄表使用 `sync.RWMutex` 互斥保护，杜绝并发竞争。

---

## 开源协议

本项目基于 [MIT 许可证](./LICENSE) 开源。欢迎提交 Issue 与 Pull Request 共同完善 OmniTerminal！

<p align="center">
  <img src="./build/appicon.png" alt="OmniTerminal Icon" width="120" height="120" />
</p>

<h1 align="center">OmniTerminal</h1>

<p align="center">
  A high-performance, cross-platform SSH and SFTP desktop client for infrastructure operations and systems engineering.
</p>

<p align="center">
  <b>English</b> · <a href="./README_ZH.md">简体中文</a> · <a href="./README_JA.md">日本語</a> · <a href="./README_KO.md">한국어</a>
</p>

<p align="center">
  <a href="https://github.com/leonlwq/OmniTerminal/releases"><img src="https://img.shields.io/github/v/release/leonlwq/OmniTerminal?color=0078d4&label=release" alt="Release"></a>
  <a href="https://omniterminal.leonlwq.com/"><img src="https://img.shields.io/badge/website-omniterminal.leonlwq.com-2ea44f" alt="Website"></a>
  <a href="https://github.com/leonlwq/OmniTerminal/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/go-%3E%3D1.22-00ADD8?logo=go" alt="Go Version">
  <img src="https://img.shields.io/badge/wails-v2-DF1A29" alt="Wails Version">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="Platform">
</p>

---

## Overview

OmniTerminal is a native desktop SSH/SFTP client engineered with Go concurrency and modern web technologies (Wails v2 + React 19). Designed as a production-grade alternative to legacy terminal clients, it combines hardware-accelerated terminal rendering, context-aware SFTP transfers, and zero-plaintext credential encryption.

* **Official Website**: [https://omniterminal.leonlwq.com/](https://omniterminal.leonlwq.com/)
* **Issue Tracker**: [GitHub Issues](https://github.com/leonlwq/OmniTerminal/issues)

---

## Key Engineering Features

### 1. Modern Workspace Architecture
- **Unified Command Bar (Omnibar)**: Direct single-line connections via `ssh://user@host:port` without mandatory persistent storage.
- **Hierarchical Session Tree**: Unlimited nested directory levels, drag-and-drop reordering, color status indicators, and recursive template inheritance for jump hosts and port forwardings.
- **VS Code Dark Modern Ergonomics**: Built on a modular 5-tier architecture (`internal/app`, `internal/core`, `internal/models`, `internal/config`, `internal/crypto`).

### 2. Context-Aware SFTP Drawer
- **Integrated Viewport**: Side-by-side sliding file drawer within the active terminal tab, eliminating disjointed popup windows.
- **Concurrent Transfer Engine**: Multi-threaded upload/download queues with chunk-level transfer resuming and remote permission management (`chmod`).

### 3. Local Master Password Vault (Zero-Plaintext)
- **PBKDF2 & AES-256-GCM Encryption**: All stored passwords, private keys, and TOTP seeds are encrypted locally with a master-derived key.
- **Automated Security**: Idle timeout triggers a frosted-glass lock screen. No plaintext credentials ever touch the disk.

### 4. GPU-Accelerated Terminal Rendering
- **xterm.js WebGL Pipeline**: GPU rendering maintaining steady 60 FPS under continuous, high-volume log streams.
- **Zero Hot-path Disk Logging**: PTY I/O read/write loops bypass unrotated disk debug logs, reducing memory escape and latency spikes.
- **10ms Batching Window**: IPC events are batched into 10ms intervals with character transmission flow control to eliminate packet drops.

### 5. Multi-Pane Synchronized Diagnostics
- **Flexible Splitting**: Horizontal and vertical split views for side-by-side terminal sessions.
- **Viewport-Ratio Synchronized Scrolling**: Synchronizes scroll positions across split panes by viewport ratio, streamlining cluster log analysis.

### 6. Command Automation & Compose Console
- **Compose Pane**: Bottom drawer supporting multi-line command editing and broadcast execution across all active split panes.
- **Expect-Style Auto-Response**: Automated login and regex-based response triggers to minimize repetitive maintenance operations.

---

## Comparison Matrix

| Feature Dimension | OmniTerminal | Xshell | SecureCRT | Termius |
| :--- | :--- | :--- | :--- | :--- |
| **License & Cost** | **MIT Open Source (Free)** | Commercial Proprietary | Commercial Proprietary ($99+) | Monthly Subscription ($10+/mo) |
| **Platform Support** | **macOS / Windows / Linux** | Windows Only | Multi-platform (Legacy UI) | Multi-platform (Heavy RAM) |
| **SFTP Integration** | **Side-by-side Drawer** | External Window (Xftp) | External Window | Separate Tab Switching |
| **Credential Storage** | **AES-256-GCM Local Vault** | Export Risk / Weak Storage | Legacy Config Files | Mandatory Cloud Account |
| **Rendering Engine** | **xterm.js WebGL GPU** | GDI / DirectWrite | Win32 Draw | Electron Software Render |
| **UI Paradigm** | **VS Code Dark Modern** | Windows Classic | Classic Menubar | Mobile Flat Design |
| **Split-Pane Sync Scroll**| **Supported (Viewport Ratio)**| Not Supported | Not Supported | Not Supported |

---

## Downloads & Installation

Pre-built binaries for all supported platforms are published on the [GitHub Releases](https://github.com/leonlwq/OmniTerminal/releases) page and the [Official Website](https://omniterminal.leonlwq.com/):

| Platform | Architecture | Package Format | Binary File |
| :--- | :--- | :--- | :--- |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | DMG Installer | `OmniTerminal-macos-arm64.dmg` |
| **macOS** | Apple Silicon (ARM64) | Portable ZIP | `OmniTerminal-macos-arm64.zip` |
| **macOS** | Intel 64-bit (x86_64) | DMG Installer | `OmniTerminal-macos-intel.dmg` |
| **Windows** | 64-bit (x86_64 / amd64) | Portable ZIP | `OmniTerminal-windows-amd64.zip` |
| **Windows** | ARM64 (Surface / Snapdragon) | Portable ZIP | `OmniTerminal-windows-arm64.zip` |
| **Linux** | 64-bit (glibc 2.35+) | tar.gz Archive | `OmniTerminal-linux-amd64.tar.gz` |

---

## Building from Source

OmniTerminal is built with [Wails v2](https://wails.io/) and Go.

### Prerequisites

1. **Go**: Version `>= 1.22` installed ([golang.org](https://go.dev/dl/))
2. **Node.js**: Version `>= 18` and `npm` installed ([nodejs.org](https://nodejs.org/))
3. **Wails CLI**: Install the official CLI tool:
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### Development Mode

Run the application with hot-reloading for both React frontend and Go backend:

```bash
wails dev
```

### Production Build

Compile a production binary optimized for your current operating system:

```bash
wails build -clean
```

For cross-compilation and automated release artifacts, refer to [build.sh](./build.sh) or GitHub Actions CI workflows.

---

## Keyboard Shortcuts

| Shortcut | Context | Function |
| :--- | :--- | :--- |
| `Cmd/Ctrl + C` | Terminal | Copy selected text if selection exists; transmit `SIGINT` otherwise |
| `Cmd/Ctrl + Shift + F` | Terminal | Summon live log buffer filter panel with regex streaming |
| `Ctrl + Enter` | Compose Pane | Broadcast multi-line input to all active terminal panes |
| `Cmd/Ctrl + F` | Terminal | Full-text search with regex match highlighting |
| `F11` | Window | Toggle borderless fullscreen workspace |
| `Double Click Tab Bar` | Workspace | Open a new session tab or local shell |

---

## Security Architecture

- **Path Centralization**: All configurations, keys, and caches are centralized under `~/.omniterminal` via `internal/config`.
- **Zero Plaintext**: Passwords, private keys, and TOTP secrets are encrypted using AES-256-GCM with PBKDF2 master key derivation.
- **Memory Safety**: Terminal sessions and SSH connection pools are concurrency-guarded via `sync.RWMutex` to prevent race conditions.

---

## License

This project is licensed under the [MIT License](./LICENSE). Contributions, bug reports, and pull requests are welcome.

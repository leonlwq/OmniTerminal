# ==============================================================================
# OmniTerminal - 现代跨平台 SSH/SFTP 生产力客户端
# 多阶段 Docker 构建文件 (Multi-Stage Dockerfile)
# ==============================================================================
# 目标：
# 1. 提供纯净且一致的无头 CI/CD 构建环境，支持在任何平台编译 Linux/Windows 二进制。
# 2. 支持 BuildKit 一键导出产物: docker build --target export --output type=local,dest=. .
# 3. 提供可在 X11 / Wayland / VNC 下直接运行的轻量级 Linux 桌面运行时镜像。
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: 前端构建环境 (Frontend Builder)
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# 利用 Docker 层缓存加速 npm 依赖安装
COPY frontend/package.json ./
# 如果存在 package-lock.json 则复制
COPY frontend/package*.json ./

RUN npm install --prefer-offline --no-audit

# 复制前端完整源码
COPY frontend/ ./

# 执行 TypeScript 编译与 Vite 静态资源打包
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Wails 与 Go 编译环境 (Wails Builder)
# ------------------------------------------------------------------------------
FROM golang:1.23-bookworm AS builder

# 替换/优化 apt 源并安装 Linux 桌面应用构建必备的 CGO / GTK3 / WebKit2GTK 依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    gcc-mingw-w64 \
    curl \
    git \
    zip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 安装 Node.js 运行时 (用于 Wails 内部的工具链调用)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# 安装 Wails v2 命令行构建工具
ENV WAILS_VERSION=v2.13.0
RUN go install github.com/wailsapp/wails/v2/cmd/wails@${WAILS_VERSION}

WORKDIR /app

# 优先缓存 Go 依赖模块
COPY go.mod go.sum ./
RUN go mod download

# 复制项目全局配置与元数据
COPY wails.json ./
COPY build/ ./build/

# 复制 Stage 1 编译完成的前端代码与 dist 产物
COPY frontend/ ./frontend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 复制 Go 后端源码与主入口
COPY internal/ ./internal/
COPY main.go ./

# 设置 CGO 编译参数并执行 Wails 生产构建
ENV CGO_ENABLED=1
RUN wails build -platform linux/amd64 -s -clean=false

# ------------------------------------------------------------------------------
# Stage 3: 产物导出镜像 (Export Target)
# 用于结合 BuildKit 直接将 build/bin 产物提取到宿主机：
# docker build --target export --output type=local,dest=. .
# ------------------------------------------------------------------------------
FROM scratch AS export
COPY --from=builder /app/build/bin /build/bin

# ------------------------------------------------------------------------------
# Stage 4: 最终轻量运行镜像 (Desktop Runtime)
# ------------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime

# 安装 GUI 桌面运行所需的动态链接库 (不含庞大的 -dev 头文件包)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-3-0 \
    libwebkit2gtk-4.1-0 \
    ca-certificates \
    fontconfig \
    libayatana-appindicator3-1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建器中复制已编译好的 Linux 桌面二进制产物
COPY --from=builder /app/build/bin/omniterminal /app/omniterminal
COPY --from=builder /app/build/appicon.png /app/appicon.png

# 创建非 root 用户提高安全性
RUN useradd -m -s /bin/bash omni && \
    chown -R omni:omni /app

USER omni

# 默认启动命令 (需要外部挂载 DISPLAY 环境变量或 X11/Wayland 套接字)
ENTRYPOINT ["/app/omniterminal"]

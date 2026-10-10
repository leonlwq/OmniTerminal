# ==============================================================================
# OmniTerminal - 现代跨平台 SSH/SFTP 生产力客户端
# Makefile 构建与工程化管理脚本
# ==============================================================================

APP_NAME       := OmniTerminal
BINARY_NAME    := omniterminal
VERSION        ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "1.0.0")
COMMIT         ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME     ?= $(shell date -u '+%Y-%m-%d_%H:%M:%S')

# 宿主机环境自动探测
UNAME_S        := $(shell uname -s)
UNAME_M        := $(shell uname -m)

ifeq ($(UNAME_S),Darwin)
    HOST_OS    := darwin
else ifeq ($(UNAME_S),Linux)
    HOST_OS    := linux
else
    HOST_OS    := windows
endif

ifeq ($(UNAME_M),x86_64)
    HOST_ARCH  := amd64
else ifeq ($(UNAME_M),arm64)
    HOST_ARCH  := arm64
else ifeq ($(UNAME_M),aarch64)
    HOST_ARCH  := arm64
else
    HOST_ARCH  := amd64
endif

# 工具链可执行文件
GO             ?= go
WAILS          ?= wails
NPM            ?= npm
DOCKER         ?= docker
CREATE_DMG     ?= create-dmg
ZIP            ?= zip

# 目录与产物路径
BUILD_DIR      := build/bin
FRONTEND_DIR   := frontend
DMG_NAME       := $(APP_NAME).dmg
WIN_ZIP_AMD64  := $(APP_NAME)-windows-amd64.zip
WIN_ZIP_ARM64  := $(APP_NAME)-windows-arm64.zip

# 镜像名称标签
DOCKER_IMAGE   := omniterminal-builder:latest

# 终端 ANSI 色彩高亮
CYAN           := \033[36m
GREEN          := \033[32m
YELLOW         := \033[33m
RED            := \033[31m
BOLD           := \033[1m
RESET          := \033[0m

.PHONY: all help dev build build-all build-darwin build-windows build-linux \
        package package-darwin package-windows test test-backend test-frontend \
        lint lint-backend lint-frontend deps clean docker-build docker-export doctor

# 默认执行当前平台构建
all: build

## help: 显示所有可用命令及详细说明
help:
	@echo ""
	@echo "$(BOLD)$(CYAN)OmniTerminal 工程化构建工具$(RESET)"
	@echo "当前探测环境: $(GREEN)$(HOST_OS)/$(HOST_ARCH)$(RESET) | 版本: $(YELLOW)$(VERSION)$(RESET)"
	@echo ""
	@echo "$(BOLD)使用方法:$(RESET)"
	@echo "  make $(GREEN)<target>$(RESET) [ARCH=amd64|arm64]"
	@echo ""
	@echo "$(BOLD)日常开发指令:$(RESET)"
	@echo "  $(GREEN)dev$(RESET)              启动 Wails 前后端热重载开发服务器"
	@echo "  $(GREEN)deps$(RESET)             检查并安装 Go 与前端全部依赖"
	@echo "  $(GREEN)doctor$(RESET)           运行 wails doctor 检查系统构建依赖完整性"
	@echo ""
	@echo "$(BOLD)编译构建指令:$(RESET)"
	@echo "  $(GREEN)build$(RESET)            编译当前宿主系统的生产版本 ($(HOST_OS)/$(HOST_ARCH))"
	@echo "  $(GREEN)build-darwin$(RESET)     编译 macOS 桌面应用包 (可指定 ARCH=arm64 或 ARCH=amd64)"
	@echo "  $(GREEN)build-windows$(RESET)    编译 Windows 平台二进制 (可指定 ARCH=amd64 或 ARCH=arm64)"
	@echo "  $(GREEN)build-linux$(RESET)      编译 Linux 平台二进制 (可指定 ARCH=amd64 或 ARCH=arm64)"
	@echo "  $(GREEN)build-all$(RESET)        跨平台全量构建 (Darwin x64/arm64 + Windows x64/arm64)"
	@echo ""
	@echo "$(BOLD)分发打包指令:$(RESET)"
	@echo "  $(GREEN)package$(RESET)          一键构建全平台并打包分发安装包 (DMG + ZIP)"
	@echo "  $(GREEN)package-darwin$(RESET)   打包 macOS DMG 拖拽安装镜像"
	@echo "  $(GREEN)package-windows$(RESET)  打包 Windows 绿色版发布压缩包 (ZIP)"
	@echo ""
	@echo "$(BOLD)测试与质量校验:$(RESET)"
	@echo "  $(GREEN)test$(RESET)             运行全部单元测试 (Go 后端 + 前端)"
	@echo "  $(GREEN)test-backend$(RESET)     运行 Go 后端测试与竞态检测"
	@echo "  $(GREEN)test-frontend$(RESET)    运行前端测试 (Vitest)"
	@echo "  $(GREEN)lint$(RESET)             运行代码静态分析与前端类型校验"
	@echo ""
	@echo "$(BOLD)Docker 容器化指令:$(RESET)"
	@echo "  $(GREEN)docker-build$(RESET)     构建跨平台 Linux 编译 Docker 镜像"
	@echo "  $(GREEN)docker-export$(RESET)    在 Docker 容器中无头编译并导出二进制到本地"
	@echo ""
	@echo "$(BOLD)清理指令:$(RESET)"
	@echo "  $(GREEN)clean$(RESET)            清理所有编译产物、DMG、ZIP及临时缓存"
	@echo ""

## doctor: 运行环境依赖自检
doctor:
	@echo "$(CYAN)==> 运行 Wails 环境依赖自检...$(RESET)"
	@$(WAILS) doctor

## deps: 检查并安装项目依赖
deps:
	@echo "$(CYAN)==> 检查并同步 Go 模块依赖...$(RESET)"
	@$(GO) mod tidy
	@echo "$(CYAN)==> 安装前端 Node.js 依赖...$(RESET)"
	@cd $(FRONTEND_DIR) && $(NPM) install

## dev: 启动 Wails 本地热重载开发模式
dev:
	@echo "$(GREEN)==> 启动 OmniTerminal 实时开发调试环境...$(RESET)"
	@$(WAILS) dev

## build: 构建当前平台生产应用
build:
	@echo "$(GREEN)==> 正在为当前系统编译生产版本: $(HOST_OS)/$(HOST_ARCH)...$(RESET)"
	@rm -rf $(BUILD_DIR)/$(APP_NAME).app $(BUILD_DIR)/$(BINARY_NAME).app
	@$(WAILS) build -platform $(HOST_OS)/$(HOST_ARCH)
	@echo "$(GREEN)✔ 编译完成: $(BUILD_DIR)/$(RESET)"

## build-darwin: 构建 macOS 桌面版本
build-darwin:
	@ARCH_TARGET=$${ARCH:-$(HOST_ARCH)}; \
	echo "$(GREEN)==> 正在编译 macOS ($$ARCH_TARGET) 桌面应用...$(RESET)"; \
	rm -rf $(BUILD_DIR)/$(APP_NAME).app $(BUILD_DIR)/$(BINARY_NAME)-$$ARCH_TARGET.app; \
	$(WAILS) build -platform darwin/$$ARCH_TARGET; \
	if [ -d "$(BUILD_DIR)/$(BINARY_NAME)-$$ARCH_TARGET.app" ]; then \
		rm -rf $(BUILD_DIR)/$(APP_NAME).app; \
		cp -R $(BUILD_DIR)/$(BINARY_NAME)-$$ARCH_TARGET.app $(BUILD_DIR)/$(APP_NAME).app; \
	fi; \
	echo "$(GREEN)✔ macOS 应用打包就绪: $(BUILD_DIR)/$(APP_NAME).app$(RESET)"

## build-windows: 构建 Windows 二进制
build-windows:
	@ARCH_TARGET=$${ARCH:-amd64}; \
	echo "$(GREEN)==> 正在编译 Windows ($$ARCH_TARGET) 二进制...$(RESET)"; \
	$(WAILS) build -platform windows/$$ARCH_TARGET; \
	echo "$(GREEN)✔ Windows 二进制已生成: $(BUILD_DIR)/$(BINARY_NAME)-$$ARCH_TARGET.exe$(RESET)"

## build-linux: 构建 Linux 二进制
build-linux:
	@ARCH_TARGET=$${ARCH:-amd64}; \
	echo "$(GREEN)==> 正在编译 Linux ($$ARCH_TARGET) 二进制...$(RESET)"; \
	$(WAILS) build -platform linux/$$ARCH_TARGET; \
	echo "$(GREEN)✔ Linux 二进制已生成: $(BUILD_DIR)/$(BINARY_NAME)-$$ARCH_TARGET$(RESET)"

## build-all: 跨平台全量构建
build-all:
	@echo "$(CYAN)==> 开始全平台多架构矩阵构建...$(RESET)"
	@$(WAILS) build -platform windows/amd64,windows/arm64,darwin/amd64,darwin/arm64
	@echo "$(GREEN)✔ 全平台构建全部完成!$(RESET)"

## package-darwin: 打包 macOS DMG 安装盘
package-darwin:
	@echo "$(CYAN)==> 制作 macOS 拖拽安装镜像 $(DMG_NAME)...$(RESET)"
	@ARCH_TARGET=$${ARCH:-$(HOST_ARCH)}; \
	if [ -d "$(BUILD_DIR)/$(BINARY_NAME)-arm64.app" ] && [ "$(HOST_ARCH)" = "arm64" ]; then \
		rm -rf $(BUILD_DIR)/$(APP_NAME).app; \
		cp -R $(BUILD_DIR)/$(BINARY_NAME)-arm64.app $(BUILD_DIR)/$(APP_NAME).app; \
	elif [ -d "$(BUILD_DIR)/$(BINARY_NAME)-amd64.app" ]; then \
		rm -rf $(BUILD_DIR)/$(APP_NAME).app; \
		cp -R $(BUILD_DIR)/$(BINARY_NAME)-amd64.app $(BUILD_DIR)/$(APP_NAME).app; \
	fi
	@if [ -d "$(BUILD_DIR)/$(APP_NAME).app" ]; then \
		rm -f $(DMG_NAME); \
		if command -v $(CREATE_DMG) >/dev/null 2>&1; then \
			$(CREATE_DMG) \
				--volname "$(APP_NAME)" \
				--window-size 800 400 \
				--icon-size 128 \
				--icon "$(APP_NAME).app" 200 200 \
				--app-drop-link 600 200 \
				--overwrite \
				$(DMG_NAME) \
				$(BUILD_DIR)/$(APP_NAME).app || true; \
			echo "$(GREEN)✔ DMG 镜像已生成: $(DMG_NAME)$(RESET)"; \
		else \
			echo "$(YELLOW)⚠ 未安装 create-dmg 工具，正在使用 hdiutil 生成基础 DMG...$(RESET)"; \
			hdiutil create -volname "$(APP_NAME)" -srcfolder "$(BUILD_DIR)/$(APP_NAME).app" -ov -format UDZO "$(DMG_NAME)"; \
			echo "$(GREEN)✔ 基础 DMG 镜像已生成: $(DMG_NAME)$(RESET)"; \
		fi \
	else \
		echo "$(RED)✖ 错误: 未找到 $(BUILD_DIR)/$(APP_NAME).app，请先执行 make build-darwin$(RESET)"; \
		exit 1; \
	fi

## package-windows: 打包 Windows 压缩包
package-windows:
	@echo "$(CYAN)==> 打包 Windows 绿色版发布压缩包...$(RESET)"
	@if [ -f "$(BUILD_DIR)/$(BINARY_NAME)-amd64.exe" ]; then \
		$(ZIP) -q -u $(WIN_ZIP_AMD64) $(BUILD_DIR)/$(BINARY_NAME)-amd64.exe || $(ZIP) -q $(WIN_ZIP_AMD64) $(BUILD_DIR)/$(BINARY_NAME)-amd64.exe; \
		echo "$(GREEN)✔ Windows x64 压缩包就绪: $(WIN_ZIP_AMD64)$(RESET)"; \
	fi
	@if [ -f "$(BUILD_DIR)/$(BINARY_NAME)-arm64.exe" ]; then \
		$(ZIP) -q -u $(WIN_ZIP_ARM64) $(BUILD_DIR)/$(BINARY_NAME)-arm64.exe || $(ZIP) -q $(WIN_ZIP_ARM64) $(BUILD_DIR)/$(BINARY_NAME)-arm64.exe; \
		echo "$(GREEN)✔ Windows arm64 压缩包就绪: $(WIN_ZIP_ARM64)$(RESET)"; \
	fi

## package: 一键构建并生成全部分发安装包
package: build-all package-darwin package-windows
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)🎉 OmniTerminal 全平台发布包打包完成!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

## test: 运行全量测试
test: test-backend test-frontend

## test-backend: 运行 Go 后端测试
test-backend:
	@echo "$(CYAN)==> 运行 Go 后端单元测试...$(RESET)"
	@$(GO) test -v ./...

## test-frontend: 运行前端单元测试
test-frontend:
	@echo "$(CYAN)==> 运行前端单元测试 (Vitest)...$(RESET)"
	@cd $(FRONTEND_DIR) && $(NPM) run test

## lint: 代码检查
lint: lint-backend lint-frontend

## lint-backend: Go 静态检查
lint-backend:
	@echo "$(CYAN)==> 运行 Go vet 检查...$(RESET)"
	@$(GO) vet ./...

## lint-frontend: 前端 TypeScript 类型检查与构建验证
lint-frontend:
	@echo "$(CYAN)==> 运行前端 TypeScript 类型验证与构建测试...$(RESET)"
	@cd $(FRONTEND_DIR) && $(NPM) run build

## docker-build: 构建用于跨平台 Linux 编译的 Docker 镜像
docker-build:
	@echo "$(CYAN)==> 构建编译环境 Docker 镜像 $(DOCKER_IMAGE)...$(RESET)"
	@$(DOCKER) build -t $(DOCKER_IMAGE) .

## docker-export: 容器内无头编译并将产物导出到本地
docker-export:
	@echo "$(CYAN)==> 使用 Docker 编译并将 Linux 产物提取至本地 build/bin...$(RESET)"
	@mkdir -p $(BUILD_DIR)
	@$(DOCKER) build --target export --output type=local,dest=. .
	@echo "$(GREEN)✔ Docker 编译产物已成功导出至 $(BUILD_DIR)/$(RESET)"

## clean: 清理产物与临时文件
clean:
	@echo "$(YELLOW)==> 清理编译产物与分发包...$(RESET)"
	@rm -rf $(BUILD_DIR)/$(BINARY_NAME)* $(BUILD_DIR)/$(APP_NAME)*
	@rm -f *.dmg *.zip
	@rm -rf $(FRONTEND_DIR)/dist
	@echo "$(GREEN)✔ 清理完成!$(RESET)"

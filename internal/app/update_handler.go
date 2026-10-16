package app

import (
	"errors"
	"fmt"

	"omniterminal/internal/config"
	"omniterminal/internal/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// GetAppVersion 获取当前客户端程序版本
func (a *App) GetAppVersion() string {
	return config.AppVersion
}

// CheckAppUpdate 检查最新版本并自动识别当前平台架构
func (a *App) CheckAppUpdate() (*models.UpdateCheckResult, error) {
	if a.updateManager == nil {
		return nil, errors.New("更新服务未初始化")
	}
	return a.updateManager.CheckUpdate(config.AppVersion)
}

// StartAppUpdateDownload 在后台启动应用内更新包流式下载，并通过 Wails 事件推送进度
func (a *App) StartAppUpdateDownload(downloadURL string, useMirror bool) error {
	if a.updateManager == nil {
		return errors.New("更新服务未初始化")
	}
	if downloadURL == "" {
		return errors.New("下载链接不能为空")
	}

	go func() {
		ctx := a.ctx
		_, err := a.updateManager.DownloadUpdate(ctx, downloadURL, useMirror, func(progress models.UpdateProgress) {
			if a.ctx != nil {
				runtime.EventsEmit(a.ctx, "app_update_progress", progress)
			}
		})
		if err != nil && a.ctx != nil {
			runtime.EventsEmit(a.ctx, "app_update_progress", models.UpdateProgress{
				Status:   "error",
				ErrorMsg: err.Error(),
			})
		}
	}()

	return nil
}

// CancelAppUpdateDownload 取消正在进行的更新包下载
func (a *App) CancelAppUpdateDownload() error {
	if a.updateManager == nil {
		return errors.New("更新服务未初始化")
	}
	a.updateManager.CancelDownload()
	return nil
}

// ApplyAppUpdateAndRestart 执行安装包覆盖替换与自动重启拉起
func (a *App) ApplyAppUpdateAndRestart(downloadedFilePath string) error {
	if a.updateManager == nil {
		return errors.New("更新服务未初始化")
	}
	if downloadedFilePath == "" {
		return errors.New("更新安装包路径不能为空")
	}

	if err := a.updateManager.ApplyUpdateAndRestart(downloadedFilePath); err != nil {
		return fmt.Errorf("应用更新失败: %w", err)
	}

	return nil
}

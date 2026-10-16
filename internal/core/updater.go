package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/models"
)

// githubReleaseResponse GitHub Release API 数据结构
type githubReleaseResponse struct {
	TagName     string        `json:"tag_name"`
	Name        string        `json:"name"`
	Body        string        `json:"body"`
	PublishedAt string        `json:"published_at"`
	HTMLURL     string        `json:"html_url"`
	Assets      []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	Size               int64  `json:"size"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// UpdateManager 管理应用内全自动检查、下载与热更新
type UpdateManager struct {
	mu             sync.Mutex
	cancelFunc     context.CancelFunc
	isDownloading  bool
	downloadedFile string
}

// NewUpdateManager 创建更新管理器单例
func NewUpdateManager() *UpdateManager {
	return &UpdateManager{}
}

// CheckUpdate 查询 GitHub 最新 Release 并自动匹配当前系统架构的安装包
func (u *UpdateManager) CheckUpdate(currentVer string) (*models.UpdateCheckResult, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequest("GET", "https://api.github.com/repos/leonlwq/omniterminal/releases/latest", nil)
	if err != nil {
		return nil, fmt.Errorf("创建更新检测请求失败: %w", err)
	}
	req.Header.Set("User-Agent", "OmniTerminal-AutoUpdater")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("连接版本服务器失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("版本服务器返回异常状态码: %d", resp.StatusCode)
	}

	var rel githubReleaseResponse
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, fmt.Errorf("解析版本数据失败: %w", err)
	}

	hasUpdate := isNewerVersion(rel.TagName, currentVer)
	matchedAsset := matchTargetAsset(rel.Assets, goruntime.GOOS, goruntime.GOARCH)

	result := &models.UpdateCheckResult{
		HasUpdate:      hasUpdate,
		CurrentVersion: currentVer,
		LatestVersion:  rel.TagName,
		ReleaseTitle:   rel.Name,
		ReleaseNotes:   rel.Body,
		PublishedAt:    rel.PublishedAt,
		HTMLURL:        rel.HTMLURL,
		PlatformOS:     goruntime.GOOS,
		PlatformArch:   goruntime.GOARCH,
		TargetAsset:    matchedAsset,
	}

	return result, nil
}

// isNewerVersion 语义化版本号比对
func isNewerVersion(latest, current string) bool {
	cleanLatest := strings.TrimPrefix(strings.TrimSpace(latest), "v")
	cleanCurrent := strings.TrimPrefix(strings.TrimSpace(current), "v")

	partsL := strings.Split(cleanLatest, ".")
	partsC := strings.Split(cleanCurrent, ".")

	maxLen := len(partsL)
	if len(partsC) > maxLen {
		maxLen = len(partsC)
	}

	for i := 0; i < maxLen; i++ {
		var numL, numC int
		if i < len(partsL) {
			numL, _ = strconv.Atoi(partsL[i])
		}
		if i < len(partsC) {
			numC, _ = strconv.Atoi(partsC[i])
		}
		if numL > numC {
			return true
		}
		if numL < numC {
			return false
		}
	}
	return false
}

// matchTargetAsset 依据操作系统与架构自动匹配最合适的 Release Asset
func matchTargetAsset(assets []githubAsset, goos, goarch string) *models.UpdateAssetInfo {
	if len(assets) == 0 {
		return nil
	}

	var candidates []githubAsset

	switch goos {
	case "darwin":
		if goarch == "arm64" {
			// 首选 macos-arm64.zip，其次 .dmg
			candidates = filterAssets(assets, "macos-arm64", ".zip", ".dmg")
		} else {
			// Intel 架构
			candidates = filterAssets(assets, "macos-intel", ".zip", ".dmg")
			if len(candidates) == 0 {
				candidates = filterAssets(assets, "macos-amd64", ".zip", ".dmg")
			}
		}
	case "windows":
		if goarch == "arm64" {
			candidates = filterAssets(assets, "windows-arm64", ".zip", ".exe")
		} else {
			candidates = filterAssets(assets, "windows-amd64", ".zip", ".exe")
		}
	case "linux":
		if goarch == "arm64" {
			candidates = filterAssets(assets, "linux-arm64", ".tar.gz", ".zip", ".AppImage", ".deb")
		} else {
			candidates = filterAssets(assets, "linux-amd64", ".tar.gz", ".zip", ".AppImage", ".deb")
		}
	}

	if len(candidates) == 0 {
		// 普适回退：寻找包含当前系统关键词的文件
		for _, a := range assets {
			nameLower := strings.ToLower(a.Name)
			if strings.Contains(nameLower, goos) {
				return &models.UpdateAssetInfo{
					Name:        a.Name,
					DownloadURL: a.BrowserDownloadURL,
					Size:        a.Size,
					BrowserURL:  a.BrowserDownloadURL,
				}
			}
		}
		return nil
	}

	best := candidates[0]
	return &models.UpdateAssetInfo{
		Name:        best.Name,
		DownloadURL: best.BrowserDownloadURL,
		Size:        best.Size,
		BrowserURL:  best.BrowserDownloadURL,
	}
}

// filterAssets 根据关键词与优先扩展名过滤资产
func filterAssets(assets []githubAsset, archKey string, preferredExts ...string) []githubAsset {
	var matched []githubAsset
	for _, ext := range preferredExts {
		for _, a := range assets {
			nameLower := strings.ToLower(a.Name)
			if strings.Contains(nameLower, strings.ToLower(archKey)) && strings.HasSuffix(nameLower, strings.ToLower(ext)) {
				matched = append(matched, a)
			}
		}
		if len(matched) > 0 {
			return matched
		}
	}
	return matched
}

// DownloadUpdate 应用内流式分块下载安装包，并实时计算速率与百分比
func (u *UpdateManager) DownloadUpdate(
	ctx context.Context,
	downloadURL string,
	useMirror bool,
	onProgress func(models.UpdateProgress),
) (string, error) {
	u.mu.Lock()
	if u.isDownloading {
		u.mu.Unlock()
		return "", errors.New("已有下载任务正在进行中")
	}

	downloadCtx, cancel := context.WithCancel(ctx)
	u.cancelFunc = cancel
	u.isDownloading = true
	u.mu.Unlock()

	defer func() {
		u.mu.Lock()
		u.isDownloading = false
		u.cancelFunc = nil
		u.mu.Unlock()
	}()

	finalURL := downloadURL
	if useMirror && strings.HasPrefix(downloadURL, "https://github.com/") {
		// 使用稳定的公开加速代理
		finalURL = "https://ghproxy.net/" + downloadURL
	}

	req, err := http.NewRequestWithContext(downloadCtx, "GET", finalURL, nil)
	if err != nil {
		return "", fmt.Errorf("创建下载请求失败: %w", err)
	}
	req.Header.Set("User-Agent", "OmniTerminal-AutoUpdater")

	client := &http.Client{
		Timeout: 30 * time.Minute,
	}

	resp, err := client.Do(req)
	if err != nil {
		if errors.Is(downloadCtx.Err(), context.Canceled) {
			onProgress(models.UpdateProgress{Status: "cancelled"})
			return "", errors.New("下载已取消")
		}
		return "", fmt.Errorf("发起下载失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("下载服务器返回错误状态码: %d", resp.StatusCode)
	}

	totalBytes := resp.ContentLength
	updatesDir := config.GetSubDir("cache/updates")
	fileName := filepath.Base(downloadURL)
	if idx := strings.Index(fileName, "?"); idx != -1 {
		fileName = fileName[:idx]
	}
	destPath := filepath.Join(updatesDir, fileName)

	tmpPath := destPath + ".part"
	outFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return "", fmt.Errorf("创建本地临时更新文件失败: %w", err)
	}

	buf := make([]byte, 32*1024)
	var downloaded int64
	lastTime := time.Now()
	var lastBytes int64

	for {
		select {
		case <-downloadCtx.Done():
			_ = outFile.Close()
			_ = os.Remove(tmpPath)
			onProgress(models.UpdateProgress{Status: "cancelled"})
			return "", errors.New("下载已取消")
		default:
		}

		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := outFile.Write(buf[:n]); writeErr != nil {
				_ = outFile.Close()
				_ = os.Remove(tmpPath)
				return "", fmt.Errorf("写入本地文件失败: %w", writeErr)
			}
			downloaded += int64(n)

			now := time.Now()
			elapsed := now.Sub(lastTime)
			if elapsed >= 200*time.Millisecond || readErr != nil {
				var speed int64
				if elapsed.Seconds() > 0 {
					speed = int64(float64(downloaded-lastBytes) / elapsed.Seconds())
				}
				lastBytes = downloaded
				lastTime = now

				var percent float64
				if totalBytes > 0 {
					percent = float64(downloaded) / float64(totalBytes) * 100
				}

				onProgress(models.UpdateProgress{
					Status:          "downloading",
					TotalBytes:      totalBytes,
					DownloadedBytes: downloaded,
					Percent:         percent,
					SpeedBytes:      speed,
					FilePath:        destPath,
				})
			}
		}

		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				break
			}
			_ = outFile.Close()
			_ = os.Remove(tmpPath)
			return "", fmt.Errorf("读取数据流中断: %w", readErr)
		}
	}

	_ = outFile.Close()
	_ = os.Remove(destPath)
	if err := os.Rename(tmpPath, destPath); err != nil {
		return "", fmt.Errorf("归档更新包失败: %w", err)
	}

	u.mu.Lock()
	u.downloadedFile = destPath
	u.mu.Unlock()

	onProgress(models.UpdateProgress{
		Status:          "ready",
		TotalBytes:      totalBytes,
		DownloadedBytes: downloaded,
		Percent:         100,
		FilePath:        destPath,
	})

	return destPath, nil
}

// CancelDownload 取消当前正在进行的下载
func (u *UpdateManager) CancelDownload() {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.cancelFunc != nil {
		u.cancelFunc()
	}
}

// ApplyUpdateAndRestart 执行安装包解压、就地替换与自动拉起新版本
func (u *UpdateManager) ApplyUpdateAndRestart(downloadedFilePath string) error {
	if _, err := os.Stat(downloadedFilePath); err != nil {
		return fmt.Errorf("安装包不存在: %s", downloadedFilePath)
	}

	switch goruntime.GOOS {
	case "darwin":
		return applyUpdateDarwin(downloadedFilePath)
	case "windows":
		return applyUpdateWindows(downloadedFilePath)
	case "linux":
		return applyUpdateLinux(downloadedFilePath)
	default:
		return fmt.Errorf("暂不支持当前系统架构的自动重启更新: %s", goruntime.GOOS)
	}
}

// applyUpdateDarwin macOS 热更新与拉起逻辑
func applyUpdateDarwin(downloadedFilePath string) error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("无法获取当前程序路径: %w", err)
	}
	execPath, _ = filepath.EvalSymlinks(execPath)

	// 查找当前是否在 .app bundle 内部
	targetApp := ""
	cur := execPath
	for {
		if strings.HasSuffix(cur, ".app") {
			targetApp = cur
			break
		}
		parent := filepath.Dir(cur)
		if parent == cur || parent == "/" || parent == "." {
			break
		}
		cur = parent
	}
	if targetApp == "" {
		targetApp = "/Applications/OmniTerminal.app"
	}

	stagingDir := filepath.Join(config.GetSubDir("cache/updates"), "staged")
	_ = os.RemoveAll(stagingDir)
	_ = os.MkdirAll(stagingDir, 0755)

	if strings.HasSuffix(downloadedFilePath, ".zip") {
		// 使用原生 /usr/bin/unzip 保证权限、软链与 Mach-O 标志完整
		out, err := exec.Command("/usr/bin/unzip", "-q", "-o", downloadedFilePath, "-d", stagingDir).CombinedOutput()
		if err != nil {
			return fmt.Errorf("解压安装包失败: %s: %w", string(out), err)
		}
	} else if strings.HasSuffix(downloadedFilePath, ".dmg") {
		// 如果是 DMG，则自动打开挂载
		_ = exec.Command("/usr/bin/open", downloadedFilePath).Start()
		return nil
	}

	stagedApp := filepath.Join(stagingDir, "OmniTerminal.app")
	if _, err := os.Stat(stagedApp); err != nil {
		entries, _ := os.ReadDir(stagingDir)
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), ".app") {
				stagedApp = filepath.Join(stagingDir, e.Name())
				break
			}
		}
	}

	if _, err := os.Stat(stagedApp); err != nil {
		return fmt.Errorf("未在更新包中找到有效的 .app 目录: %w", err)
	}

	// 清除隔离属性
	_ = exec.Command("/usr/bin/xattr", "-rd", "com.apple.quarantine", stagedApp).Run()

	scriptPath := filepath.Join(config.GetSubDir("cache/updates"), "install_restart.sh")
	scriptContent := fmt.Sprintf(`#!/bin/sh
PID=%d
STAGED_APP="%s"
TARGET_APP="%s"

# 等待旧主进程完全退出
while kill -0 "$PID" 2>/dev/null; do
  sleep 0.2
done

if [ -d "$STAGED_APP" ]; then
  rm -rf "$TARGET_APP" 2>/dev/null || true
  if cp -R "$STAGED_APP" "$TARGET_APP" 2>/dev/null; then
    xattr -rd com.apple.quarantine "$TARGET_APP" 2>/dev/null || true
    open -a "$TARGET_APP" --args --updated
  else
    USER_APP="$HOME/Applications/OmniTerminal.app"
    mkdir -p "$HOME/Applications"
    rm -rf "$USER_APP" 2>/dev/null || true
    cp -R "$STAGED_APP" "$USER_APP"
    xattr -rd com.apple.quarantine "$USER_APP" 2>/dev/null || true
    open -a "$USER_APP" --args --updated
  fi
fi
`, os.Getpid(), stagedApp, targetApp)

	if err := os.WriteFile(scriptPath, []byte(scriptContent), 0755); err != nil {
		return fmt.Errorf("写入更新辅助脚本失败: %w", err)
	}

	cmd := exec.Command("/bin/sh", scriptPath)
	detachProcess(cmd)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("拉起自动重启进程失败: %w", err)
	}

	// 退出旧版主进程
	go func() {
		time.Sleep(300 * time.Millisecond)
		os.Exit(0)
	}()

	return nil
}

// applyUpdateWindows Windows 热更新替换逻辑
func applyUpdateWindows(downloadedFilePath string) error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取运行路径失败: %w", err)
	}
	execPath, _ = filepath.EvalSymlinks(execPath)

	stagingDir := filepath.Join(config.GetSubDir("cache/updates"), "staged")
	_ = os.RemoveAll(stagingDir)
	_ = os.MkdirAll(stagingDir, 0755)

	// 使用 PowerShell 解压
	psCmd := fmt.Sprintf("Expand-Archive -Path '%s' -DestinationPath '%s' -Force", downloadedFilePath, stagingDir)
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).CombinedOutput(); err != nil {
		return fmt.Errorf("Windows 解压失败: %s: %w", string(out), err)
	}

	stagedExe := filepath.Join(stagingDir, "OmniTerminal.exe")
	if _, err := os.Stat(stagedExe); err != nil {
		return fmt.Errorf("更新包中未找到 OmniTerminal.exe")
	}

	batPath := filepath.Join(config.GetSubDir("cache/updates"), "update.bat")
	batContent := fmt.Sprintf(`@echo off
timeout /t 1 /nobreak >nul
:wait
tasklist /fi "pid eq %d" | find "%d" >nul
if not errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait
)
move /y "%s" "%s"
start "" "%s"
del "%%~f0"
`, os.Getpid(), os.Getpid(), stagedExe, execPath, execPath)

	if err := os.WriteFile(batPath, []byte(batContent), 0755); err != nil {
		return fmt.Errorf("创建 Windows 替换脚本失败: %w", err)
	}

	cmd := exec.Command("cmd.exe", "/c", batPath)
	detachProcess(cmd)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("拉起替换进程失败: %w", err)
	}

	go func() {
		time.Sleep(300 * time.Millisecond)
		os.Exit(0)
	}()

	return nil
}

// applyUpdateLinux Linux 热更新替换逻辑
func applyUpdateLinux(downloadedFilePath string) error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取运行路径失败: %w", err)
	}
	execPath, _ = filepath.EvalSymlinks(execPath)

	stagingDir := filepath.Join(config.GetSubDir("cache/updates"), "staged")
	_ = os.RemoveAll(stagingDir)
	_ = os.MkdirAll(stagingDir, 0755)

	out, err := exec.Command("tar", "-xzf", downloadedFilePath, "-C", stagingDir).CombinedOutput()
	if err != nil {
		return fmt.Errorf("解压 tar.gz 失败: %s: %w", string(out), err)
	}

	stagedBin := filepath.Join(stagingDir, "omniterminal")
	if _, err := os.Stat(stagedBin); err != nil {
		return fmt.Errorf("未在更新包中找到二进制文件 omniterminal")
	}

	shPath := filepath.Join(config.GetSubDir("cache/updates"), "update.sh")
	shContent := fmt.Sprintf(`#!/bin/sh
PID=%d
STAGED="%s"
TARGET="%s"
while kill -0 "$PID" 2>/dev/null; do
  sleep 0.2
done
cp -f "$STAGED" "$TARGET"
chmod +x "$TARGET"
"$TARGET" &
`, os.Getpid(), stagedBin, execPath)

	if err := os.WriteFile(shPath, []byte(shContent), 0755); err != nil {
		return fmt.Errorf("写入 Linux 替换脚本失败: %w", err)
	}

	cmd := exec.Command("/bin/sh", shPath)
	detachProcess(cmd)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("启动 Linux 替换脚本失败: %w", err)
	}

	go func() {
		time.Sleep(300 * time.Millisecond)
		os.Exit(0)
	}()

	return nil
}

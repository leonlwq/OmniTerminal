package app

import (
	"context"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"hash"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"omniterminal/internal/core"
	"omniterminal/internal/models"

	"github.com/pkg/sftp"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// resolveRemotePath 将相对路径、空路径或 ~/ 解析为远端规范绝对路径
func resolveRemotePath(info *core.SessionInfo, remotePath string) string {
	if info == nil || info.SftpClient == nil {
		return remotePath
	}
	clean := strings.TrimSpace(remotePath)
	if clean == "" || clean == "." {
		if real, err := info.SftpClient.RealPath("."); err == nil && real != "" {
			return real
		}
		if wd, err := info.SftpClient.Getwd(); err == nil && wd != "" {
			return wd
		}
		return "/"
	}
	// 如果以 ~/ 开头，解析为实际家目录
	if strings.HasPrefix(clean, "~/") || clean == "~" {
		home, err := info.SftpClient.RealPath(".")
		if err == nil && home != "" {
			if clean == "~" {
				return home
			}
			return filepath.ToSlash(filepath.Join(home, clean[2:]))
		}
	}
	// 如果不是以 / 开头（相对路径），使用 RealPath 解析
	if !strings.HasPrefix(clean, "/") {
		if real, err := info.SftpClient.RealPath(clean); err == nil && real != "" {
			return real
		}
	}
	return clean
}

// resolveRemotePathWithFallback 解析远端路径并在单层根目录不存在时自动回退探查用户家目录
func resolveRemotePathWithFallback(info *core.SessionInfo, remotePath string) (string, error) {
	if info == nil || info.SftpClient == nil {
		return remotePath, fmt.Errorf("SFTP 客户端未初始化")
	}
	targetPath := resolveRemotePath(info, remotePath)

	// 如果 Stat 成功，直接返回
	if _, err := info.SftpClient.Stat(targetPath); err == nil {
		return targetPath, nil
	}

	// 智能兜底：如果根目录下不存在形如 "/.bashrc" 的单层路径，探查用户家目录
	if strings.HasPrefix(targetPath, "/") && strings.Count(targetPath, "/") == 1 {
		if home, herr := info.SftpClient.RealPath("."); herr == nil && home != "" && home != "/" {
			altPath := filepath.ToSlash(filepath.Join(home, strings.TrimPrefix(targetPath, "/")))
			if _, aerr := info.SftpClient.Stat(altPath); aerr == nil {
				return altPath, nil
			}
		}
	}

	return targetPath, nil
}

// SftpGetwd 获取远程会话当前工作目录的真实绝对路径（如 /home/opc）
func (a *App) SftpGetwd(id string) (string, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return "", fmt.Errorf("该会话未启用 SFTP 服务")
	}

	// 优先使用 RealPath(".") 获取远端真实绝对路径
	realPath, err := info.SftpClient.RealPath(".")
	if err == nil && realPath != "" {
		return realPath, nil
	}

	wd, err := info.SftpClient.Getwd()
	if err == nil && wd != "" {
		return wd, nil
	}

	return "/", nil
}

// SftpRealPath 将指定路径（相对路径、符号链接等）解析为远端规范绝对路径
func (a *App) SftpRealPath(id string, remotePath string) (string, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return "", fmt.Errorf("该会话未启用 SFTP 服务")
	}

	resolved := resolveRemotePath(info, remotePath)
	return info.SftpClient.RealPath(resolved)
}

// SftpReadFile 读取远程 SFTP 文件内容（支持文本与图片 base64 自动转换，预览最大读取 4MB）
func (a *App) SftpReadFile(id string, remotePath string) (string, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return "", fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetPath := resolveRemotePath(info, remotePath)

	remoteFile, err := info.SftpClient.Open(targetPath)
	if err != nil {
		// 智能兜底：如果根目录下不存在形如 "/.bashrc" 的单层路径，探查用户家目录
		if strings.HasPrefix(targetPath, "/") && strings.Count(targetPath, "/") == 1 {
			if home, herr := info.SftpClient.RealPath("."); herr == nil && home != "" && home != "/" {
				altPath := filepath.ToSlash(filepath.Join(home, strings.TrimPrefix(targetPath, "/")))
				if altFile, aerr := info.SftpClient.Open(altPath); aerr == nil {
					remoteFile = altFile
					targetPath = altPath
					err = nil
				}
			}
		}
	}
	if err != nil {
		return "", err
	}
	defer remoteFile.Close()

	// 限制最大读取 4MB
	limitReader := io.LimitReader(remoteFile, 4*1024*1024)
	data, err := io.ReadAll(limitReader)
	if err != nil {
		return "", err
	}

	// 如果是图片后缀，返回 base64
	ext := strings.ToLower(filepath.Ext(targetPath))
	imageExts := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true, ".gif": true,
		".svg": true, ".webp": true, ".bmp": true, ".ico": true,
	}

	if imageExts[ext] {
		return base64.StdEncoding.EncodeToString(data), nil
	}

	return string(data), nil
}

func (a *App) SftpMkdir(id string, remotePath string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()
	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}
	return info.SftpClient.Mkdir(remotePath)
}

func (a *App) SftpRename(id string, oldPath string, newPath string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()
	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}
	return info.SftpClient.Rename(oldPath, newPath)
}

func (a *App) SftpChmod(id string, remotePath string, mode uint32) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()
	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}
	return info.SftpClient.Chmod(remotePath, os.FileMode(mode))
}

func (a *App) SftpListDir(id string, path string) ([]SftpFileInfo, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("未找到会话 %s", id)
	}

	if info.SftpClient == nil {
		return nil, fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetPath := resolveRemotePath(info, path)
	if targetPath == "" {
		targetPath = "."
	}

	files, err := info.SftpClient.ReadDir(targetPath)
	if err != nil {
		return nil, err
	}

	var fileInfos []SftpFileInfo
	for _, f := range files {
		fileInfos = append(fileInfos, SftpFileInfo{
			Name:    f.Name(),
			Size:    f.Size(),
			IsDir:   f.IsDir(),
			ModTime: f.ModTime().Format("2006-01-02 15:04:05"),
			Mode:    f.Mode().String(),
		})
	}
	return fileInfos, nil
}


var transferCancels sync.Map // map[string]context.CancelFunc

// contextReader 包装 io.Reader，支持通过 context.Context 实时中断读取流
type contextReader struct {
	ctx context.Context
	r   io.Reader
}

func (cr *contextReader) Read(p []byte) (int, error) {
	select {
	case <-cr.ctx.Done():
		return 0, cr.ctx.Err()
	default:
		return cr.r.Read(p)
	}
}

// CancelSftpTransfer 优雅终止正在运行的 SFTP 传输任务
func (a *App) CancelSftpTransfer(taskId string) error {
	if val, ok := transferCancels.Load(taskId); ok {
		if cancel, ok := val.(context.CancelFunc); ok {
			cancel()
		}
		transferCancels.Delete(taskId)
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
				"taskId": taskId,
				"status": "failed",
				"error":  "传输已被用户取消",
			})
		}
		return nil
	}
	return fmt.Errorf("任务不存在或已结束")
}

// SftpResumeCheckResult 断点续传探测结果模型
type SftpResumeCheckResult struct {
	Exists         bool   `json:"exists"`
	SrcSize        int64  `json:"srcSize"`
	DstSize        int64  `json:"dstSize"`
	CanResume      bool   `json:"canResume"`
	ResumableBytes int64  `json:"resumableBytes"`
	TargetName     string `json:"targetName"`
}

// SftpCheckFileResume 探测目标路径是否已存在部分数据以决定是否断点续传
func (a *App) SftpCheckFileResume(srcSessionId string, srcPath string, isSrcLocal bool, dstSessionId string, dstPath string, isDstLocal bool) (*SftpResumeCheckResult, error) {
	result := &SftpResumeCheckResult{
		TargetName: filepath.Base(dstPath),
	}

	// 1. 获取源端文件大小
	var srcSize int64
	if isSrcLocal {
		stat, err := os.Stat(srcPath)
		if err != nil {
			return nil, fmt.Errorf("无法读取本地源文件: %v", err)
		}
		srcSize = stat.Size()
	} else {
		a.sshManager.Mu.RLock()
		srcInfo, ok := a.sshManager.Sessions[srcSessionId]
		a.sshManager.Mu.RUnlock()
		if !ok || srcInfo.SftpClient == nil {
			return nil, fmt.Errorf("源会话 SFTP 服务未连接")
		}
		targetSrc, _ := resolveRemotePathWithFallback(srcInfo, srcPath)
		stat, err := srcInfo.SftpClient.Stat(targetSrc)
		if err != nil {
			return nil, fmt.Errorf("无法读取远程源文件: %v", err)
		}
		srcSize = stat.Size()
	}
	result.SrcSize = srcSize

	// 2. 获取目标端文件信息
	var dstSize int64
	var dstExists bool
	if isDstLocal {
		stat, err := os.Stat(dstPath)
		if err == nil && !stat.IsDir() {
			dstExists = true
			dstSize = stat.Size()
		}
	} else {
		a.sshManager.Mu.RLock()
		dstInfo, ok := a.sshManager.Sessions[dstSessionId]
		a.sshManager.Mu.RUnlock()
		if !ok || dstInfo.SftpClient == nil {
			return nil, fmt.Errorf("目标会话 SFTP 服务未连接")
		}
		targetDst, _ := resolveRemotePathWithFallback(dstInfo, dstPath)
		stat, err := dstInfo.SftpClient.Stat(targetDst)
		if err == nil && !stat.IsDir() {
			dstExists = true
			dstSize = stat.Size()
		}
	}

	result.Exists = dstExists
	result.DstSize = dstSize
	if dstExists && dstSize > 0 && dstSize < srcSize {
		result.CanResume = true
		result.ResumableBytes = dstSize
	}

	return result, nil
}

type progressTracker struct {
	io.Reader
	progress *ProgressStream
}

func (pt *progressTracker) Read(p []byte) (int, error) {
	n, err := pt.Reader.Read(p)
	if n > 0 {
		pt.progress.Write(p[:n])
	}
	return n, err
}

func (a *App) pushError(sessionId string, taskId string, filename string, err error) {
	runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
		"sessionId":  sessionId,
		"taskId":     taskId,
		"fileName":   filename,
		"total":      0,
		"current":    0,
		"percentage": 0,
		"speed":      "0 B/s",
		"status":     "failed",
		"error":      err.Error(),
	})
}

func (a *App) SftpUploadFile(id string, remoteDir string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}

	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	localPath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择要上传的文件",
	})
	if err != nil {
		return err
	}
	if localPath == "" {
		return nil
	}

	go func() {
		taskId := fmt.Sprintf("upload_%d", time.Now().UnixNano())
		filename := filepath.Base(localPath)
		remotePath := filepath.ToSlash(filepath.Join(remoteDir, filename))

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   filename,
			"total":      0,
			"current":    0,
			"percentage": 0,
			"speed":      "0 B/s",
			"status":     "started",
		})

		localFileInfo, err := os.Stat(localPath)
		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}
		totalSize := localFileInfo.Size()

		localFile, err := os.Open(localPath)
		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}
		defer localFile.Close()

		remoteFile, err := info.SftpClient.Create(remotePath)
		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}
		defer remoteFile.Close()

		// 对于大于 20MB 的大文件，自动开启多协程分片并发传输加速
		if totalSize > 20*1024*1024 {
			err = a.doChunkedUpload(id, taskId, filename, localFile, remoteFile, totalSize)
		} else {
			progress := &ProgressStream{
				SessionID: id,
				TaskID:    taskId,
				FileName:  filename,
				TotalSize: totalSize,
				LastTime:  time.Now(),
				App:       a,
			}
			_, err = io.Copy(remoteFile, &progressTracker{Reader: localFile, progress: progress})
		}

		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   filename,
			"total":      totalSize,
			"current":    totalSize,
			"percentage": 100,
			"speed":      "0 B/s",
			"status":     "completed",
		})
	}()

	return nil
}

func (a *App) doChunkedUpload(id string, taskId string, filename string, localFile *os.File, remoteFile *sftp.File, totalSize int64) error {
	const chunkSize = int64(2 * 1024 * 1024) // 2MB 分片
	const numWorkers = 4

	type chunkTask struct {
		offset int64
		size   int64
	}

	taskChan := make(chan chunkTask, (totalSize/chunkSize)+1)
	for offset := int64(0); offset < totalSize; offset += chunkSize {
		size := chunkSize
		if offset+size > totalSize {
			size = totalSize - offset
		}
		taskChan <- chunkTask{offset: offset, size: size}
	}
	close(taskChan)

	var transferred int64
	var errOnce sync.Once
	var workerErr error
	var wg sync.WaitGroup

	startTime := time.Now()
	lastReportTime := time.Now()

	reportProgress := func(current int64) {
		now := time.Now()
		elapsed := now.Sub(lastReportTime).Seconds()
		if elapsed >= 0.15 || current == totalSize {
			percentage := int(float64(current) / float64(totalSize) * 100)
			totalElapsed := now.Sub(startTime).Seconds()
			speed := "0 B/s"
			if totalElapsed > 0 {
				speed = formatSpeed(float64(current) / totalElapsed)
			}
			runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
				"sessionId":  id,
				"taskId":     taskId,
				"fileName":   filename,
				"total":      totalSize,
				"current":    current,
				"percentage": percentage,
				"speed":      speed,
				"status":     "transferring",
			})
			lastReportTime = now
		}
	}

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			buf := make([]byte, chunkSize)
			for task := range taskChan {
				if workerErr != nil {
					return
				}
				n, err := localFile.ReadAt(buf[:task.size], task.offset)
				if err != nil && err != io.EOF && int64(n) < task.size {
					errOnce.Do(func() { workerErr = err })
					return
				}
				_, err = remoteFile.WriteAt(buf[:n], task.offset)
				if err != nil {
					errOnce.Do(func() { workerErr = err })
					return
				}
				current := atomic.AddInt64(&transferred, int64(n))
				reportProgress(current)
			}
		}()
	}

	wg.Wait()
	return workerErr
}

func (a *App) SftpDownloadFile(id string, remotePath string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}

	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetRemote, _ := resolveRemotePathWithFallback(info, remotePath)

	remoteFileInfo, err := info.SftpClient.Stat(targetRemote)
	if err != nil {
		return fmt.Errorf("无法获取远程文件大小: %v", err)
	}
	totalSize := remoteFileInfo.Size()

	filename := filepath.Base(targetRemote)
	localPath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "选择下载保存的位置",
		DefaultFilename: filename,
	})
	if err != nil {
		return err
	}
	if localPath == "" {
		return nil
	}

	go func() {
		taskId := fmt.Sprintf("download_%d", time.Now().UnixNano())

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   filename,
			"total":      totalSize,
			"current":    0,
			"percentage": 0,
			"speed":      "0 B/s",
			"status":     "started",
		})

		remoteFile, err := info.SftpClient.Open(targetRemote)
		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}
		defer remoteFile.Close()

		localFile, err := os.Create(localPath)
		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}
		defer localFile.Close()

		// 对于大于 20MB 的大文件，自动开启多协程分片并发下载加速
		if totalSize > 20*1024*1024 {
			err = a.doChunkedDownload(id, taskId, filename, remoteFile, localFile, totalSize)
		} else {
			progress := &ProgressStream{
				SessionID: id,
				TaskID:    taskId,
				FileName:  filename,
				TotalSize: totalSize,
				LastTime:  time.Now(),
				App:       a,
			}
			_, err = io.Copy(io.MultiWriter(localFile, progress), remoteFile)
		}

		if err != nil {
			a.pushError(id, taskId, filename, err)
			return
		}

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   filename,
			"total":      totalSize,
			"current":    totalSize,
			"percentage": 100,
			"speed":      "0 B/s",
			"status":     "completed",
		})
	}()

	return nil
}

// SftpDownloadDirectory 弹出选择保存目录对话框并递归下载整个远程文件夹
func (a *App) SftpDownloadDirectory(id string, remotePath string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetRemote, _ := resolveRemotePathWithFallback(info, remotePath)
	dirName := filepath.Base(targetRemote)

	localDir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: fmt.Sprintf("选择文件夹 [%s] 保存的目标本地目录", dirName),
	})
	if err != nil {
		return err
	}
	if localDir == "" {
		return nil
	}

	go a.doRecursiveDownload(id, info, targetRemote, localDir, false)
	return nil
}

func (a *App) doChunkedDownload(id string, taskId string, filename string, remoteFile *sftp.File, localFile *os.File, totalSize int64) error {
	const chunkSize = int64(2 * 1024 * 1024)
	const numWorkers = 4

	type chunkTask struct {
		offset int64
		size   int64
	}

	taskChan := make(chan chunkTask, (totalSize/chunkSize)+1)
	for offset := int64(0); offset < totalSize; offset += chunkSize {
		size := chunkSize
		if offset+size > totalSize {
			size = totalSize - offset
		}
		taskChan <- chunkTask{offset: offset, size: size}
	}
	close(taskChan)

	var transferred int64
	var errOnce sync.Once
	var workerErr error
	var wg sync.WaitGroup

	startTime := time.Now()
	lastReportTime := time.Now()

	reportProgress := func(current int64) {
		now := time.Now()
		elapsed := now.Sub(lastReportTime).Seconds()
		if elapsed >= 0.15 || current == totalSize {
			percentage := int(float64(current) / float64(totalSize) * 100)
			totalElapsed := now.Sub(startTime).Seconds()
			speed := "0 B/s"
			if totalElapsed > 0 {
				speed = formatSpeed(float64(current) / totalElapsed)
			}
			runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
				"sessionId":  id,
				"taskId":     taskId,
				"fileName":   filename,
				"total":      totalSize,
				"current":    current,
				"percentage": percentage,
				"speed":      speed,
				"status":     "transferring",
			})
			lastReportTime = now
		}
	}

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			buf := make([]byte, chunkSize)
			for task := range taskChan {
				if workerErr != nil {
					return
				}
				n, err := remoteFile.ReadAt(buf[:task.size], task.offset)
				if err != nil && err != io.EOF && int64(n) < task.size {
					errOnce.Do(func() { workerErr = err })
					return
				}
				_, err = localFile.WriteAt(buf[:n], task.offset)
				if err != nil {
					errOnce.Do(func() { workerErr = err })
					return
				}
				current := atomic.AddInt64(&transferred, int64(n))
				reportProgress(current)
			}
		}()
	}

	wg.Wait()
	return workerErr
}

func (a *App) SftpDelete(id string, remotePath string, isDir bool) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}

	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetRemote, _ := resolveRemotePathWithFallback(info, remotePath)
	if isDir {
		return info.SftpClient.RemoveDirectory(targetRemote)
	}
	return info.SftpClient.Remove(targetRemote)
}

func (a *App) SftpUploadPaths(id string, localPaths []string, remoteDir string) error {
	return a.SftpUploadPathsWithResume(id, localPaths, remoteDir, false)
}

// SftpUploadPathsWithResume 支持断点续传的本地文件/目录批量上传
func (a *App) SftpUploadPathsWithResume(id string, localPaths []string, remoteDir string, resume bool) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	go func() {
		for _, localPath := range localPaths {
			a.doRecursiveUpload(id, info, localPath, remoteDir, resume)
		}
	}()
	return nil
}

func (a *App) doRecursiveUpload(id string, info *core.SessionInfo, localPath string, remoteBaseDir string, resume bool) {
	stat, err := os.Stat(localPath)
	if err != nil {
		return
	}

	taskId := fmt.Sprintf("upload_%d", time.Now().UnixNano())
	baseName := filepath.Base(localPath)
	targetRemotePath := filepath.ToSlash(filepath.Join(remoteBaseDir, baseName))

	if stat.IsDir() {
		info.SftpClient.MkdirAll(targetRemotePath)
		entries, err := os.ReadDir(localPath)
		if err == nil {
			for _, entry := range entries {
				a.doRecursiveUpload(id, info, filepath.Join(localPath, entry.Name()), targetRemotePath, resume)
			}
		}
	} else {
		// 断点续传探测
		var startOffset int64
		var isResuming bool
		if resume {
			remoteStat, rErr := info.SftpClient.Stat(targetRemotePath)
			if rErr == nil && !remoteStat.IsDir() && remoteStat.Size() > 0 && remoteStat.Size() < stat.Size() {
				startOffset = remoteStat.Size()
				isResuming = true
			}
		}

		ctx, cancel := context.WithCancel(context.Background())
		transferCancels.Store(taskId, cancel)
		defer func() {
			transferCancels.Delete(taskId)
			cancel()
		}()

		initialPercentage := 0
		if stat.Size() > 0 {
			initialPercentage = int(float64(startOffset) / float64(stat.Size()) * 100)
		}

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   baseName,
			"total":      stat.Size(),
			"current":    startOffset,
			"percentage": initialPercentage,
			"speed":      "0 B/s",
			"status":     "started",
		})

		srcFile, err := os.Open(localPath)
		if err != nil {
			a.pushError(id, taskId, baseName, err)
			return
		}
		defer srcFile.Close()

		var dstFile *sftp.File
		if isResuming {
			dstFile, err = info.SftpClient.OpenFile(targetRemotePath, os.O_WRONLY)
			if err != nil {
				a.pushError(id, taskId, baseName, err)
				return
			}
			if _, err = dstFile.Seek(startOffset, io.SeekStart); err != nil {
				dstFile.Close()
				a.pushError(id, taskId, baseName, err)
				return
			}
			if _, err = srcFile.Seek(startOffset, io.SeekStart); err != nil {
				dstFile.Close()
				a.pushError(id, taskId, baseName, err)
				return
			}
		} else {
			dstFile, err = info.SftpClient.Create(targetRemotePath)
			if err != nil {
				a.pushError(id, taskId, baseName, err)
				return
			}
		}
		defer dstFile.Close()

		progress := &ProgressStream{
			SessionID:  id,
			TaskID:     taskId,
			FileName:   baseName,
			TotalSize:  stat.Size(),
			Written:    startOffset,
			LastWriter: startOffset,
			LastTime:   time.Now(),
			App:        a,
		}

		cr := &contextReader{ctx: ctx, r: srcFile}
		_, err = io.Copy(dstFile, &progressTracker{Reader: cr, progress: progress})
		if ctx.Err() != nil {
			return
		}
		if err != nil {
			a.pushError(id, taskId, baseName, err)
			return
		}

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   baseName,
			"total":      stat.Size(),
			"current":    stat.Size(),
			"percentage": 100,
			"speed":      "0 B/s",
			"status":     "completed",
		})
	}
}

func (a *App) SftpDownloadPaths(id string, remotePaths []string, localDir string) error {
	return a.SftpDownloadPathsWithResume(id, remotePaths, localDir, false)
}

// SftpDownloadPathsWithResume 支持断点续传的远程文件/目录批量下载
func (a *App) SftpDownloadPathsWithResume(id string, remotePaths []string, localDir string, resume bool) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	go func() {
		for _, remotePath := range remotePaths {
			a.doRecursiveDownload(id, info, remotePath, localDir, resume)
		}
	}()
	return nil
}

func (a *App) doRecursiveDownload(id string, info *core.SessionInfo, remotePath string, localBaseDir string, resume bool) {
	targetRemote, _ := resolveRemotePathWithFallback(info, remotePath)
	baseName := filepath.Base(targetRemote)
	taskId := fmt.Sprintf("download_%d", time.Now().UnixNano())

	stat, err := info.SftpClient.Stat(targetRemote)
	if err != nil {
		a.pushError(id, taskId, baseName, fmt.Errorf("无法获取远端文件信息: %v", err))
		return
	}

	if localBaseDir == "" {
		localBaseDir = a.GetLocalHomeDir()
	}
	targetLocalPath := filepath.Join(localBaseDir, baseName)

	if stat.IsDir() {
		if err := os.MkdirAll(targetLocalPath, 0755); err != nil {
			a.pushError(id, taskId, baseName, fmt.Errorf("创建本地目录失败: %v", err))
			return
		}
		entries, err := info.SftpClient.ReadDir(targetRemote)
		if err == nil {
			for _, entry := range entries {
				a.doRecursiveDownload(id, info, filepath.ToSlash(filepath.Join(targetRemote, entry.Name())), targetLocalPath, resume)
			}
		}
	} else {
		// 确保本地目标所在父目录存在
		if err := os.MkdirAll(filepath.Dir(targetLocalPath), 0755); err != nil {
			a.pushError(id, taskId, baseName, fmt.Errorf("创建本地目标目录失败: %v", err))
			return
		}

		// 断点续传探测
		var startOffset int64
		var isResuming bool
		if resume {
			localStat, lErr := os.Stat(targetLocalPath)
			if lErr == nil && !localStat.IsDir() && localStat.Size() > 0 && localStat.Size() < stat.Size() {
				startOffset = localStat.Size()
				isResuming = true
			}
		}

		ctx, cancel := context.WithCancel(context.Background())
		transferCancels.Store(taskId, cancel)
		defer func() {
			transferCancels.Delete(taskId)
			cancel()
		}()

		initialPercentage := 0
		if stat.Size() > 0 {
			initialPercentage = int(float64(startOffset) / float64(stat.Size()) * 100)
		}

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   baseName,
			"total":      stat.Size(),
			"current":    startOffset,
			"percentage": initialPercentage,
			"speed":      "0 B/s",
			"status":     "started",
		})

		srcFile, err := info.SftpClient.Open(targetRemote)
		if err != nil {
			a.pushError(id, taskId, baseName, fmt.Errorf("打开远程文件失败: %v", err))
			return
		}
		defer srcFile.Close()

		var dstFile *os.File
		if isResuming {
			dstFile, err = os.OpenFile(targetLocalPath, os.O_WRONLY, 0644)
			if err != nil {
				a.pushError(id, taskId, baseName, fmt.Errorf("打开本地断点文件失败: %v", err))
				return
			}
			if _, err = dstFile.Seek(startOffset, io.SeekStart); err != nil {
				dstFile.Close()
				a.pushError(id, taskId, baseName, fmt.Errorf("本地文件寻址失败: %v", err))
				return
			}
			if _, err = srcFile.Seek(startOffset, io.SeekStart); err != nil {
				dstFile.Close()
				a.pushError(id, taskId, baseName, fmt.Errorf("远程文件寻址失败: %v", err))
				return
			}
		} else {
			dstFile, err = os.Create(targetLocalPath)
			if err != nil {
				a.pushError(id, taskId, baseName, fmt.Errorf("创建本地文件失败: %v", err))
				return
			}
		}
		defer dstFile.Close()

		progress := &ProgressStream{
			SessionID:  id,
			TaskID:     taskId,
			FileName:   baseName,
			TotalSize:  stat.Size(),
			Written:    startOffset,
			LastWriter: startOffset,
			LastTime:   time.Now(),
			App:        a,
		}

		cr := &contextReader{ctx: ctx, r: srcFile}
		_, err = io.Copy(io.MultiWriter(dstFile, progress), cr)
		if ctx.Err() != nil {
			return
		}
		if err != nil {
			a.pushError(id, taskId, baseName, fmt.Errorf("下载写入数据失败: %v", err))
			return
		}

		runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
			"sessionId":  id,
			"taskId":     taskId,
			"fileName":   baseName,
			"total":      stat.Size(),
			"current":    stat.Size(),
			"percentage": 100,
			"speed":      "0 B/s",
			"status":     "completed",
		})
	}
}

// SftpTransferBetweenSessions 服务端对传：两台在线远程主机之间通过内存 io.Pipe 零磁盘极速对传
func (a *App) SftpTransferBetweenSessions(srcSessionId string, srcPaths []string, dstSessionId string, dstRemoteDir string, resume bool) error {
	a.sshManager.Mu.RLock()
	srcInfo, okSrc := a.sshManager.Sessions[srcSessionId]
	dstInfo, okDst := a.sshManager.Sessions[dstSessionId]
	a.sshManager.Mu.RUnlock()

	if !okSrc || srcInfo.SftpClient == nil {
		return fmt.Errorf("源端会话 %s SFTP 服务未连接", srcSessionId)
	}
	if !okDst || dstInfo.SftpClient == nil {
		return fmt.Errorf("目标端会话 %s SFTP 服务未连接", dstSessionId)
	}

	go func() {
		targetDstDir, _ := resolveRemotePathWithFallback(dstInfo, dstRemoteDir)
		for _, srcPath := range srcPaths {
			a.doRecursiveSessionTransfer(srcSessionId, srcInfo, srcPath, dstSessionId, dstInfo, targetDstDir, resume)
		}
	}()
	return nil
}

func (a *App) doRecursiveSessionTransfer(
	srcSessionId string, srcInfo *core.SessionInfo, srcPath string,
	dstSessionId string, dstInfo *core.SessionInfo, dstRemoteDir string, resume bool,
) {
	resolvedSrc, _ := resolveRemotePathWithFallback(srcInfo, srcPath)
	stat, err := srcInfo.SftpClient.Stat(resolvedSrc)
	if err != nil {
		taskId := fmt.Sprintf("s2s_%d", time.Now().UnixNano())
		a.pushError(dstSessionId, taskId, filepath.Base(srcPath), fmt.Errorf("获取源端文件信息失败: %v", err))
		return
	}

	baseName := filepath.Base(resolvedSrc)
	targetDstPath := filepath.ToSlash(filepath.Join(dstRemoteDir, baseName))

	if stat.IsDir() {
		dstInfo.SftpClient.MkdirAll(targetDstPath)
		entries, err := srcInfo.SftpClient.ReadDir(resolvedSrc)
		if err == nil {
			for _, entry := range entries {
				childSrc := filepath.ToSlash(filepath.Join(resolvedSrc, entry.Name()))
				a.doRecursiveSessionTransfer(srcSessionId, srcInfo, childSrc, dstSessionId, dstInfo, targetDstPath, resume)
			}
		}
		return
	}

	taskId := fmt.Sprintf("s2s_%d", time.Now().UnixNano())
	displayName := fmt.Sprintf("[S2S] %s", baseName)

	// 断点续传探测
	var startOffset int64
	var isResuming bool
	if resume {
		dstStat, dstErr := dstInfo.SftpClient.Stat(targetDstPath)
		if dstErr == nil && !dstStat.IsDir() && dstStat.Size() > 0 && dstStat.Size() < stat.Size() {
			startOffset = dstStat.Size()
			isResuming = true
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	transferCancels.Store(taskId, cancel)
	defer func() {
		transferCancels.Delete(taskId)
		cancel()
	}()

	initialPercentage := 0
	if stat.Size() > 0 {
		initialPercentage = int(float64(startOffset) / float64(stat.Size()) * 100)
	}

	runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
		"sessionId":  dstSessionId,
		"taskId":     taskId,
		"fileName":   displayName,
		"total":      stat.Size(),
		"current":    startOffset,
		"percentage": initialPercentage,
		"speed":      "0 B/s",
		"status":     "started",
	})

	srcFile, err := srcInfo.SftpClient.Open(resolvedSrc)
	if err != nil {
		a.pushError(dstSessionId, taskId, displayName, fmt.Errorf("打开源端文件失败: %v", err))
		return
	}
	defer srcFile.Close()

	var dstFile *sftp.File
	if isResuming {
		dstFile, err = dstInfo.SftpClient.OpenFile(targetDstPath, os.O_WRONLY)
		if err != nil {
			a.pushError(dstSessionId, taskId, displayName, fmt.Errorf("打开目标端断点文件失败: %v", err))
			return
		}
		if _, err = dstFile.Seek(startOffset, io.SeekStart); err != nil {
			dstFile.Close()
			a.pushError(dstSessionId, taskId, displayName, fmt.Errorf("目标端文件寻址失败: %v", err))
			return
		}
		if _, err = srcFile.Seek(startOffset, io.SeekStart); err != nil {
			dstFile.Close()
			a.pushError(dstSessionId, taskId, displayName, fmt.Errorf("源端文件寻址失败: %v", err))
			return
		}
	} else {
		dstFile, err = dstInfo.SftpClient.Create(targetDstPath)
		if err != nil {
			a.pushError(dstSessionId, taskId, displayName, fmt.Errorf("创建目标端文件失败: %v", err))
			return
		}
	}
	defer dstFile.Close()

	// 零磁盘内存管道直传：通过 io.Pipe 连接源端与目标端流
	pr, pw := io.Pipe()

	// 读取协程：从 srcFile 读取，压入 pw，使用 256KB 高速缓冲
	go func() {
		buf := make([]byte, 256*1024)
		var streamErr error
		for {
			select {
			case <-ctx.Done():
				pw.CloseWithError(ctx.Err())
				return
			default:
			}
			n, rErr := srcFile.Read(buf)
			if n > 0 {
				if _, wErr := pw.Write(buf[:n]); wErr != nil {
					streamErr = wErr
					break
				}
			}
			if rErr != nil {
				if rErr != io.EOF {
					streamErr = rErr
				}
				break
			}
		}
		pw.CloseWithError(streamErr)
	}()

	progress := &ProgressStream{
		SessionID:  dstSessionId,
		TaskID:     taskId,
		FileName:   displayName,
		TotalSize:  stat.Size(),
		Written:    startOffset,
		LastWriter: startOffset,
		LastTime:   time.Now(),
		App:        a,
	}

	cr := &contextReader{ctx: ctx, r: pr}
	pt := &progressTracker{Reader: cr, progress: progress}
	_, err = io.Copy(dstFile, pt)
	pr.Close()

	if ctx.Err() != nil {
		return
	}
	if err != nil {
		a.pushError(dstSessionId, taskId, displayName, fmt.Errorf("对传数据中断: %v", err))
		return
	}

	runtime.EventsEmit(a.ctx, "sftp-progress", map[string]interface{}{
		"sessionId":  dstSessionId,
		"taskId":     taskId,
		"fileName":   displayName,
		"total":      stat.Size(),
		"current":    stat.Size(),
		"percentage": 100,
		"speed":      "0 B/s",
		"status":     "completed",
	})
}

// OpenRemoteFileWithEditor 下载远端文件到本地缓存，用外部编辑器打开并监听保存自动静默回传
func (a *App) OpenRemoteFileWithEditor(id string, remotePath string, customEditorPath string) error {
	if customEditorPath == "" {
		if settings, err := a.GetSettings(); err == nil {
			customEditorPath = settings.ExternalEditorPath
		}
	}

	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	cacheDir, err := core.GetCacheDirForSession(id)
	if err != nil {
		return err
	}

	targetRemote, _ := resolveRemotePathWithFallback(info, remotePath)
	baseName := filepath.Base(targetRemote)
	localCachePath := filepath.Join(cacheDir, baseName)

	// 先下载远程文件到本地缓存
	srcFile, err := info.SftpClient.Open(targetRemote)
	if err != nil {
		return fmt.Errorf("读取远端文件失败: %w", err)
	}
	defer srcFile.Close()

	dstFile, err := os.Create(localCachePath)
	if err != nil {
		return fmt.Errorf("创建本地缓存文件失败: %w", err)
	}
	_, err = io.Copy(dstFile, srcFile)
	dstFile.Close()
	if err != nil {
		return fmt.Errorf("下载文件内容失败: %w", err)
	}

	// 启动本地外部编辑器
	if err := core.LaunchExternalEditor(localCachePath, customEditorPath); err != nil {
		return fmt.Errorf("启动外部编辑器失败: %w", err)
	}

	// 注册文件修改监听与自动回传
	watchKey := fmt.Sprintf("%s:%s", id, remotePath)
	core.WatchFileChanges(watchKey, id, localCachePath, func() error {
		a.sshManager.Mu.RLock()
		activeInfo, activeOk := a.sshManager.Sessions[id]
		a.sshManager.Mu.RUnlock()

		if !activeOk || activeInfo.SftpClient == nil {
			return fmt.Errorf("会话已断开，无法自动回传")
		}

		localF, err := os.Open(localCachePath)
		if err != nil {
			return err
		}
		defer localF.Close()

		remoteF, err := activeInfo.SftpClient.Create(remotePath)
		if err != nil {
			return err
		}
		defer remoteF.Close()

		_, err = io.Copy(remoteF, localF)
		if err == nil {
			runtime.EventsEmit(a.ctx, "file-synced", map[string]interface{}{
				"sessionId":  id,
				"remotePath": remotePath,
				"fileName":   baseName,
				"syncedAt":   time.Now().Format("15:04:05"),
			})
		}
		return err
	})

	return nil
}

// SCPUploadFile 使用 SCP 协议上传单文件 (用于无 sftp-server 环境)
func (a *App) SCPUploadFile(id string, localPath string, remoteDir string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok || info.Client == nil {
		return fmt.Errorf("未找到有效 SSH 会话 %s", id)
	}

	scpClient := core.NewSCPClient(info.Client)
	return scpClient.Upload(localPath, remoteDir, nil)
}

// SCPDownloadFile 使用 SCP 协议下载单文件
func (a *App) SCPDownloadFile(id string, remotePath string, localDir string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok || info.Client == nil {
		return fmt.Errorf("未找到有效 SSH 会话 %s", id)
	}

	scpClient := core.NewSCPClient(info.Client)
	return scpClient.Download(remotePath, localDir, nil)
}

// CompareDirectories 递归比对本地与远端目录的差异
func (a *App) CompareDirectories(id string, remoteDir string, localDir string) (*models.DirDiffResult, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok || info.SftpClient == nil {
		return nil, fmt.Errorf("该会话未启用 SFTP 服务")
	}

	// 1. 读取本地目录
	localMap := make(map[string]os.FileInfo)
	_ = filepath.Walk(localDir, func(path string, f os.FileInfo, err error) error {
		if err == nil && path != localDir {
			rel, _ := filepath.Rel(localDir, path)
			localMap[filepath.ToSlash(rel)] = f
		}
		return nil
	})

	// 2. 读取远端目录
	remoteMap := make(map[string]os.FileInfo)
	walker := info.SftpClient.Walk(remoteDir)
	for walker.Step() {
		if walker.Err() == nil {
			path := walker.Path()
			if path != remoteDir {
				rel, err := filepath.Rel(remoteDir, path)
				if err == nil {
					remoteMap[filepath.ToSlash(rel)] = walker.Stat()
				}
			}
		}
	}

	// 3. 合并全量键并比对差异
	allKeys := make(map[string]bool)
	for k := range localMap {
		allKeys[k] = true
	}
	for k := range remoteMap {
		allKeys[k] = true
	}

	var items []models.DirDiffItem
	diffCount := 0

	for relPath := range allKeys {
		loc, hasLoc := localMap[relPath]
		rem, hasRem := remoteMap[relPath]

		item := models.DirDiffItem{
			RelativePath: relPath,
			Name:         filepath.Base(relPath),
		}

		if hasLoc && !hasRem {
			item.IsDir = loc.IsDir()
			item.Status = "only_local"
			item.LocalSize = loc.Size()
			item.LocalModTime = loc.ModTime().Format("2006-01-02 15:04:05")
			diffCount++
		} else if !hasLoc && hasRem {
			item.IsDir = rem.IsDir()
			item.Status = "only_remote"
			item.RemoteSize = rem.Size()
			item.RemoteModTime = rem.ModTime().Format("2006-01-02 15:04:05")
			diffCount++
		} else {
			item.IsDir = loc.IsDir()
			item.LocalSize = loc.Size()
			item.RemoteSize = rem.Size()
			item.LocalModTime = loc.ModTime().Format("2006-01-02 15:04:05")
			item.RemoteModTime = rem.ModTime().Format("2006-01-02 15:04:05")

			if loc.IsDir() && rem.IsDir() {
				item.Status = "same"
			} else if loc.Size() != rem.Size() {
				item.Status = "modified"
				diffCount++
			} else {
				item.Status = "same"
			}
		}

		items = append(items, item)
	}

	return &models.DirDiffResult{
		TotalFiles: len(items),
		DiffCount:  diffCount,
		Items:      items,
	}, nil
}

// SftpCompress 在远程服务器上执行压缩打包
func (a *App) SftpCompress(id string, remotePaths []string, targetArchive string, format string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok || info.Client == nil {
		return fmt.Errorf("未找到有效 SSH 会话 %s", id)
	}
	if len(remotePaths) == 0 {
		return fmt.Errorf("未指定要压缩的文件或目录")
	}

	parentDir := filepath.Dir(remotePaths[0])
	var escapedPaths []string
	for _, p := range remotePaths {
		rel, err := filepath.Rel(parentDir, p)
		if err == nil {
			escapedPaths = append(escapedPaths, fmt.Sprintf("%q", rel))
		} else {
			escapedPaths = append(escapedPaths, fmt.Sprintf("%q", p))
		}
	}
	itemsStr := strings.Join(escapedPaths, " ")

	var cmd string
	switch strings.ToLower(format) {
	case "tar.gz", "tgz":
		cmd = fmt.Sprintf("cd %q && tar -czvf %q %s", parentDir, targetArchive, itemsStr)
	case "tar.bz2", "tbz2":
		cmd = fmt.Sprintf("cd %q && tar -cjvf %q %s", parentDir, targetArchive, itemsStr)
	case "tar.xz", "txz":
		cmd = fmt.Sprintf("cd %q && tar -cJvf %q %s", parentDir, targetArchive, itemsStr)
	case "zip":
		cmd = fmt.Sprintf("cd %q && zip -r %q %s", parentDir, targetArchive, itemsStr)
	case "7z":
		cmd = fmt.Sprintf("cd %q && 7z a %q %s", parentDir, targetArchive, itemsStr)
	default:
		cmd = fmt.Sprintf("cd %q && tar -czvf %q %s", parentDir, targetArchive, itemsStr)
	}

	session, err := info.Client.NewSession()
	if err != nil {
		return fmt.Errorf("创建 SSH 执行通道失败: %v", err)
	}
	defer session.Close()

	out, err := session.CombinedOutput(cmd)
	if err != nil {
		return fmt.Errorf("压缩执行失败: %v, 输出: %s", err, string(out))
	}
	return nil
}

// SftpExtract 在远程服务器上执行在线解压
func (a *App) SftpExtract(id string, archivePath string, destDir string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok || info.Client == nil {
		return fmt.Errorf("未找到有效 SSH 会话 %s", id)
	}

	if destDir == "" {
		destDir = filepath.Dir(archivePath)
	}

	lower := strings.ToLower(archivePath)
	var cmd string
	if strings.HasSuffix(lower, ".tar.gz") || strings.HasSuffix(lower, ".tgz") {
		cmd = fmt.Sprintf("mkdir -p %q && tar -xzvf %q -C %q", destDir, archivePath, destDir)
	} else if strings.HasSuffix(lower, ".tar.bz2") || strings.HasSuffix(lower, ".tbz2") {
		cmd = fmt.Sprintf("mkdir -p %q && tar -xjvf %q -C %q", destDir, archivePath, destDir)
	} else if strings.HasSuffix(lower, ".tar.xz") || strings.HasSuffix(lower, ".txz") {
		cmd = fmt.Sprintf("mkdir -p %q && tar -xJvf %q -C %q", destDir, archivePath, destDir)
	} else if strings.HasSuffix(lower, ".tar") {
		cmd = fmt.Sprintf("mkdir -p %q && tar -xvf %q -C %q", destDir, archivePath, destDir)
	} else if strings.HasSuffix(lower, ".zip") {
		cmd = fmt.Sprintf("mkdir -p %q && unzip -o %q -d %q", destDir, archivePath, destDir)
	} else if strings.HasSuffix(lower, ".7z") {
		cmd = fmt.Sprintf("mkdir -p %q && 7z x %q -o%q -y", destDir, archivePath, destDir)
	} else if strings.HasSuffix(lower, ".rar") {
		cmd = fmt.Sprintf("mkdir -p %q && unrar x %q %q -y", destDir, archivePath, destDir)
	} else {
		cmd = fmt.Sprintf("mkdir -p %q && tar -xvf %q -C %q", destDir, archivePath, destDir)
	}

	session, err := info.Client.NewSession()
	if err != nil {
		return fmt.Errorf("创建 SSH 执行通道失败: %v", err)
	}
	defer session.Close()

	out, err := session.CombinedOutput(cmd)
	if err != nil {
		return fmt.Errorf("解压执行失败: %v, 输出: %s", err, string(out))
	}
	return nil
}

// SftpVerifyHash 计算与校验本地和远程文件的哈希完整性
func (a *App) SftpVerifyHash(id string, localPath string, remotePath string, algo string) (map[string]interface{}, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok || info.Client == nil {
		return nil, fmt.Errorf("未找到有效 SSH 会话 %s", id)
	}

	algo = strings.ToLower(strings.TrimSpace(algo))
	if algo == "" {
		algo = "sha256"
	}

	// 1. 本地哈希计算（如果提供了 localPath 且文件存在）
	var localHash string
	if localPath != "" {
		f, err := os.Open(localPath)
		if err == nil {
			defer f.Close()
			var h hash.Hash
			switch algo {
			case "md5":
				h = md5.New()
			case "sha1":
				h = sha1.New()
			default:
				h = sha256.New()
			}
			if _, err := io.Copy(h, f); err == nil {
				localHash = hex.EncodeToString(h.Sum(nil))
			}
		}
	}

	// 2. 远端哈希计算
	var remoteCmd string
	switch algo {
	case "md5":
		remoteCmd = fmt.Sprintf("md5sum %q 2>/dev/null || md5 -q %q", remotePath, remotePath)
	case "sha1":
		remoteCmd = fmt.Sprintf("sha1sum %q 2>/dev/null || shasum -a 1 %q", remotePath, remotePath)
	default:
		remoteCmd = fmt.Sprintf("sha256sum %q 2>/dev/null || shasum -a 256 %q", remotePath, remotePath)
	}

	session, err := info.Client.NewSession()
	if err != nil {
		return nil, fmt.Errorf("创建 SSH 执行通道失败: %v", err)
	}
	defer session.Close()

	out, err := session.CombinedOutput(remoteCmd)
	if err != nil {
		return nil, fmt.Errorf("远端计算哈希失败: %v, 输出: %s", err, string(out))
	}

	fields := strings.Fields(string(out))
	var remoteHash string
	if len(fields) > 0 {
		remoteHash = fields[0]
	}

	matched := false
	if localHash != "" && remoteHash != "" {
		matched = strings.EqualFold(localHash, remoteHash)
	}

	return map[string]interface{}{
		"algorithm":  algo,
		"localHash":  localHash,
		"remoteHash": remoteHash,
		"match":      matched,
		"localPath":  localPath,
		"remotePath": remotePath,
	}, nil
}

// SftpCalculateFolderSize 异步递归统计远端目录总大小、文件数与子目录数
func (a *App) SftpCalculateFolderSize(sessionId, path string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[sessionId]
	a.sshManager.Mu.RUnlock()

	if !ok || info.SftpClient == nil {
		return fmt.Errorf("未找到 SFTP 会话 %s", sessionId)
	}

	eventName := fmt.Sprintf("sftp-folder-size-progress:%s", sessionId)
	cancelEvent := fmt.Sprintf("sftp-folder-size-cancel:%s", sessionId)

	var isCancelled atomic.Bool
	runtime.EventsOnce(a.ctx, cancelEvent, func(optionalData ...interface{}) {
		isCancelled.Store(true)
	})

	go func() {
		walker := info.SftpClient.Walk(path)
		var totalSize int64
		var fileCount int64
		var dirCount int64
		lastEmit := time.Now()
		timeout := time.After(120 * time.Second)

		for walker.Step() {
			select {
			case <-timeout:
				runtime.EventsEmit(a.ctx, eventName, models.FolderSizeProgress{
					Path:      path,
					TotalSize: totalSize,
					FileCount: fileCount,
					DirCount:  dirCount,
					Done:      true,
					Error:     "统计超时 (已达到 120 秒上限)",
				})
				return
			default:
			}

			if isCancelled.Load() {
				return
			}

			if err := walker.Err(); err != nil {
				continue
			}

			stat := walker.Stat()
			if stat == nil {
				continue
			}

			if walker.Path() == path {
				continue
			}

			if stat.IsDir() {
				dirCount++
			} else {
				fileCount++
				totalSize += stat.Size()
			}

			if time.Since(lastEmit) > 150*time.Millisecond {
				lastEmit = time.Now()
				runtime.EventsEmit(a.ctx, eventName, models.FolderSizeProgress{
					Path:      path,
					TotalSize: totalSize,
					FileCount: fileCount,
					DirCount:  dirCount,
					Done:      false,
				})
			}
		}

		runtime.EventsEmit(a.ctx, eventName, models.FolderSizeProgress{
			Path:      path,
			TotalSize: totalSize,
			FileCount: fileCount,
			DirCount:  dirCount,
			Done:      true,
		})
	}()

	return nil
}

// SftpCancelFolderSize 取消正在进行的文件夹大小异步计算
func (a *App) SftpCancelFolderSize(sessionId string) error {
	runtime.EventsEmit(a.ctx, fmt.Sprintf("sftp-folder-size-cancel:%s", sessionId))
	return nil
}

// executeSessionCommand 在指定的会话（本地或 SSH）中执行一段简单命令并返回输出
func (a *App) executeSessionCommand(info *core.SessionInfo, command string) (string, error) {
	if info.IsLocal {
		cmd := exec.Command("sh", "-c", command)
		out, err := cmd.CombinedOutput()
		return string(out), err
	}
	if info.Client == nil {
		return "", fmt.Errorf("会话未连接")
	}
	session, err := info.Client.NewSession()
	if err != nil {
		return "", fmt.Errorf("创建通道失败: %v", err)
	}
	defer session.Close()
	out, err := session.CombinedOutput(command)
	return string(out), err
}

// SftpReadFileDetail 读取远程文件完整内容与文件元信息（用于富文本编辑器与并发锁）
func (a *App) SftpReadFileDetail(id string, remotePath string) (*models.SftpFileDetail, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return nil, fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetPath := resolveRemotePath(info, remotePath)

	stat, err := info.SftpClient.Stat(targetPath)
	if err != nil {
		// 智能兜底：如果根目录下不存在形如 "/.bashrc" 的单层路径，探查用户家目录
		if strings.HasPrefix(targetPath, "/") && strings.Count(targetPath, "/") == 1 {
			if home, herr := info.SftpClient.RealPath("."); herr == nil && home != "" && home != "/" {
				altPath := filepath.ToSlash(filepath.Join(home, strings.TrimPrefix(targetPath, "/")))
				if altStat, aerr := info.SftpClient.Stat(altPath); aerr == nil {
					targetPath = altPath
					stat = altStat
					err = nil
				}
			}
		}
	}
	if err != nil {
		return nil, fmt.Errorf("获取文件属性失败: %v", err)
	}

	remoteFile, err := info.SftpClient.Open(targetPath)
	if err != nil {
		return nil, err
	}
	defer remoteFile.Close()

	// 限制最大读取 10MB
	limitReader := io.LimitReader(remoteFile, 10*1024*1024)
	data, err := io.ReadAll(limitReader)
	if err != nil {
		return nil, err
	}

	ext := strings.ToLower(filepath.Ext(targetPath))
	imageExts := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true, ".gif": true,
		".svg": true, ".webp": true, ".bmp": true, ".ico": true,
	}

	isImage := imageExts[ext]
	var content string
	if isImage {
		content = base64.StdEncoding.EncodeToString(data)
	} else {
		content = string(data)
	}

	return &models.SftpFileDetail{
		Content: content,
		ModTime: stat.ModTime().UnixMilli(),
		Size:    stat.Size(),
		IsImage: isImage,
	}, nil
}

// SftpSaveFileWithOptimisticLock 保存远程文件内容，支持修改时间戳乐观并发锁检测
func (a *App) SftpSaveFileWithOptimisticLock(id string, remotePath string, content string, originalModTime int64) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}
	if info.SftpClient == nil {
		return fmt.Errorf("该会话未启用 SFTP 服务")
	}

	targetPath := resolveRemotePath(info, remotePath)

	// 如果传入的是形如 "/.bashrc" 且根目录下不存在，但家目录下存在，自动定位到家目录
	if strings.HasPrefix(targetPath, "/") && strings.Count(targetPath, "/") == 1 {
		if _, serr := info.SftpClient.Stat(targetPath); serr != nil {
			if home, herr := info.SftpClient.RealPath("."); herr == nil && home != "" && home != "/" {
				altPath := filepath.ToSlash(filepath.Join(home, strings.TrimPrefix(targetPath, "/")))
				if _, aerr := info.SftpClient.Stat(altPath); aerr == nil {
					targetPath = altPath
				}
			}
		}
	}

	// 如果传入了基准修改时间，进行乐观并发冲突检测
	if originalModTime > 0 {
		currentStat, err := info.SftpClient.Stat(targetPath)
		if err == nil {
			currMilli := currentStat.ModTime().UnixMilli()
			// 容忍 1000ms 内的时间精度误差（某些文件系统仅秒级精度）
			diff := currMilli - originalModTime
			if diff < 0 {
				diff = -diff
			}
			if diff > 1000 {
				return fmt.Errorf("FILE_CONFLICT: 远程文件已被修改 (远程当前: %s, 本地打开基准: %s)。请备份当前更改后重新拉取。",
					currentStat.ModTime().Format("2006-01-02 15:04:05"),
					time.UnixMilli(originalModTime).Format("2006-01-02 15:04:05"))
			}
		}
	}

	remoteFile, err := info.SftpClient.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC)
	if err != nil {
		return fmt.Errorf("打开远程文件写入失败: %v", err)
	}
	defer remoteFile.Close()

	if _, err := remoteFile.Write([]byte(content)); err != nil {
		return fmt.Errorf("写入远程文件失败: %v", err)
	}

	return nil
}

// SftpIsGitRepo 检查路径是否为 Git 工作区
func (a *App) SftpIsGitRepo(id string, remotePath string) (bool, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return false, fmt.Errorf("未找到会话 %s", id)
	}

	out, err := a.executeSessionCommand(info, fmt.Sprintf("git -C %q rev-parse --is-inside-work-tree 2>/dev/null", remotePath))
	if err == nil && strings.TrimSpace(out) == "true" {
		return true, nil
	}
	return false, nil
}

// SftpGitStatus 获取 Git 仓库中文件的状态列表
func (a *App) SftpGitStatus(id string, repoPath string) ([]models.GitFileStatus, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("未找到会话 %s", id)
	}

	out, err := a.executeSessionCommand(info, fmt.Sprintf("git -C %q status --porcelain=v1 -uall 2>/dev/null", repoPath))
	if err != nil {
		return nil, fmt.Errorf("获取 Git 状态失败: %v", err)
	}

	var results []models.GitFileStatus
	lines := strings.Split(out, "\n")
	for _, line := range lines {
		line = strings.TrimRight(line, "\r")
		if len(line) < 4 {
			continue
		}
		x := line[0]
		y := line[1]
		filePath := strings.TrimSpace(line[3:])

		// 处理重命名如 "old -> new"
		if strings.Contains(filePath, " -> ") {
			parts := strings.Split(filePath, " -> ")
			if len(parts) == 2 {
				filePath = parts[1]
			}
		}

		st := models.GitFileStatus{
			Path:      filePath,
			Status:    "modified",
			Staged:    false,
			Untracked: false,
		}

		if x == '?' && y == '?' {
			st.Status = "untracked"
			st.Untracked = true
		} else if x == 'A' || y == 'A' {
			st.Status = "added"
			st.Staged = (x == 'A')
		} else if x == 'D' || y == 'D' {
			st.Status = "deleted"
			st.Staged = (x == 'D')
		} else if x == 'R' || y == 'R' {
			st.Status = "renamed"
			st.Staged = (x == 'R')
		} else {
			st.Status = "modified"
			st.Staged = (x != ' ' && x != '?')
		}

		results = append(results, st)
	}

	return results, nil
}

// SftpGitDiff 获取指定文件 HEAD 版本与工作区版本的 Diff 对比内容
func (a *App) SftpGitDiff(id string, repoPath string, filePath string) (*models.GitDiffResult, error) {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("未找到会话 %s", id)
	}

	// 1. 获取 HEAD 版本内容
	origOut, _ := a.executeSessionCommand(info, fmt.Sprintf("git -C %q show HEAD:%q 2>/dev/null", repoPath, filePath))

	// 2. 获取当前工作区文件内容
	fullPath := filepath.Join(repoPath, filePath)
	var modOut string
	if info.SftpClient != nil {
		if rf, err := info.SftpClient.Open(fullPath); err == nil {
			if bytes, err := io.ReadAll(io.LimitReader(rf, 5*1024*1024)); err == nil {
				modOut = string(bytes)
			}
			rf.Close()
		}
	}
	if modOut == "" {
		modOut, _ = a.executeSessionCommand(info, fmt.Sprintf("cat %q 2>/dev/null", fullPath))
	}

	// 3. 获取 diff 文本
	diffOut, _ := a.executeSessionCommand(info, fmt.Sprintf("git -C %q diff HEAD -- %q 2>/dev/null", repoPath, filePath))

	return &models.GitDiffResult{
		Original: origOut,
		Modified: modOut,
		DiffText: diffOut,
		Path:     filePath,
	}, nil
}

// SftpGitAction 执行 Git 暂存、取消暂存或放弃修改
func (a *App) SftpGitAction(id string, repoPath string, action string, filePath string) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[id]
	a.sshManager.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}

	var cmd string
	switch action {
	case "stage":
		cmd = fmt.Sprintf("git -C %q add -- %q", repoPath, filePath)
	case "unstage":
		cmd = fmt.Sprintf("git -C %q restore --staged -- %q 2>/dev/null || git -C %q reset HEAD -- %q", repoPath, filePath, repoPath, filePath)
	case "discard":
		cmd = fmt.Sprintf("git -C %q checkout -- %q 2>/dev/null || git -C %q restore -- %q", repoPath, filePath, repoPath, filePath)
	default:
		return fmt.Errorf("未知操作: %s", action)
	}

	out, err := a.executeSessionCommand(info, cmd)
	if err != nil {
		return fmt.Errorf("执行失败: %v, 输出: %s", err, out)
	}
	return nil
}


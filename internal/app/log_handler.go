package app

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/config"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) ListLogFiles() ([]map[string]interface{}, error) {
	logDir := config.GetSubDir("logs")
	var files []map[string]interface{}

	err := filepath.Walk(logDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // ignore errors
		}
		if !info.IsDir() && (strings.HasSuffix(info.Name(), ".log") || strings.HasSuffix(info.Name(), ".csv") || strings.HasSuffix(info.Name(), ".html") || strings.Contains(info.Name(), ".log.")) {
			relPath, _ := filepath.Rel(logDir, path)
			files = append(files, map[string]interface{}{
				"name":    info.Name(),
				"path":    path,
				"relPath": relPath,
				"size":    info.Size(),
				"modTime": info.ModTime().Format(time.RFC3339),
			})
		}
		return nil
	})

	return files, err
}

func (a *App) ReadLogContent(path string) (string, error) {
	// For security, ensure the path is inside .omniterminal/logs
	logDir := config.GetSubDir("logs")
	if !strings.HasPrefix(filepath.Clean(path), filepath.Clean(logDir)) {
		return "", os.ErrPermission
	}

	// Read up to 2MB to prevent memory crash
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return "", err
	}

	size := stat.Size()
	maxSize := int64(2 * 1024 * 1024)

	if size > maxSize {
		_, _ = file.Seek(size-maxSize, 0)
	}

	buf := make([]byte, maxSize)
	n, _ := file.Read(buf)

	content := string(buf[:n])
	if size > maxSize {
		content = "[Warning: File is too large. Showing the last 2MB]\n" + content
	}

	return content, nil
}


var (
	activeLogTails   = make(map[string]chan struct{})
	activeLogTailsMu sync.Mutex
)

func (a *App) DeleteLogFile(path string) error {
	logDir := config.GetSubDir("logs")
	if !strings.HasPrefix(filepath.Clean(path), filepath.Clean(logDir)) {
		return os.ErrPermission
	}
	return os.Remove(path)
}

// StartRemoteLogTail 启动远程日志文件的实时流式 tail 追踪
func (a *App) StartRemoteLogTail(sessionId string, logPath string, initialLines int) error {
	a.sshManager.Mu.RLock()
	info, ok := a.sshManager.Sessions[sessionId]
	a.sshManager.Mu.RUnlock()

	if !ok || info.Client == nil {
		return fmt.Errorf("未找到有效 SSH 会话 %s", sessionId)
	}

	if initialLines <= 0 {
		initialLines = 100
	}
	if initialLines > 1000 {
		initialLines = 1000
	}

	tailKey := fmt.Sprintf("%s:%s", sessionId, logPath)
	activeLogTailsMu.Lock()
	if stopCh, exists := activeLogTails[tailKey]; exists {
		close(stopCh)
		delete(activeLogTails, tailKey)
	}
	stopCh := make(chan struct{})
	activeLogTails[tailKey] = stopCh
	activeLogTailsMu.Unlock()

	go func() {
		session, err := info.Client.NewSession()
		if err != nil {
			runtime.EventsEmit(a.ctx, "remote-log-tail-error", map[string]interface{}{
				"sessionId": sessionId,
				"logPath":   logPath,
				"error":     fmt.Sprintf("建立远程会话失败: %v", err),
			})
			return
		}
		defer session.Close()

		stdout, err := session.StdoutPipe()
		if err != nil {
			runtime.EventsEmit(a.ctx, "remote-log-tail-error", map[string]interface{}{
				"sessionId": sessionId,
				"logPath":   logPath,
				"error":     fmt.Sprintf("打开标准输出管道失败: %v", err),
			})
			return
		}

		cmd := fmt.Sprintf("tail -n %d -f %q", initialLines, logPath)
		if err := session.Start(cmd); err != nil {
			runtime.EventsEmit(a.ctx, "remote-log-tail-error", map[string]interface{}{
				"sessionId": sessionId,
				"logPath":   logPath,
				"error":     fmt.Sprintf("启动 tail 命令失败: %v", err),
			})
			return
		}

		// 监听停止信号
		go func() {
			select {
			case <-stopCh:
				_ = session.Close()
			case <-info.KeepAliveDone:
				_ = session.Close()
			}
		}()

		reader := bufio.NewReader(stdout)
		for {
			select {
			case <-stopCh:
				return
			default:
				line, err := reader.ReadString('\n')
				if len(line) > 0 {
					runtime.EventsEmit(a.ctx, "remote-log-tail-data", map[string]interface{}{
						"sessionId": sessionId,
						"logPath":   logPath,
						"line":      strings.TrimRight(line, "\r\n"),
					})
				}
				if err != nil {
					return
				}
			}
		}
	}()

	return nil
}

// StopRemoteLogTail 停止指定日志文件的实时追踪
func (a *App) StopRemoteLogTail(sessionId string, logPath string) error {
	tailKey := fmt.Sprintf("%s:%s", sessionId, logPath)
	activeLogTailsMu.Lock()
	defer activeLogTailsMu.Unlock()
	if stopCh, exists := activeLogTails[tailKey]; exists {
		close(stopCh)
		delete(activeLogTails, tailKey)
	}
	return nil
}


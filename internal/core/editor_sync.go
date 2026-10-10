package core

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"omniterminal/internal/config"
)

// ActiveEditorWatch 管理活动的编辑器文件同步监听器
type ActiveEditorWatch struct {
	SessionID string
	LocalPath string
	StopCh    chan struct{}
}

var (
	editorWatchesMu sync.Mutex
	editorWatches   = make(map[string]*ActiveEditorWatch)
)

// LaunchExternalEditor 调用本地编辑器打开指定文件
func LaunchExternalEditor(filePath string, customEditorPath string) error {
	if customEditorPath != "" {
		if runtime.GOOS == "darwin" {
			// 如果是常见编辑器别名，尝试通过 open -a 打开
			switch customEditorPath {
			case "code", "cursor", "subl", "atom", "zed":
				cmd := exec.Command("open", "-a", customEditorPath, filePath)
				if err := cmd.Start(); err == nil {
					return nil
				}
			}
		}
		cmd := exec.Command(customEditorPath, filePath)
		if err := cmd.Start(); err == nil {
			return nil
		}
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", filePath)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", filePath)
	default:
		cmd = exec.Command("xdg-open", filePath)
	}

	return cmd.Start()
}

// WatchFileChanges 监听本地缓存文件的修改，一旦保存自动执行 onSync 回调
func WatchFileChanges(
	watchKey string,
	sessionId string,
	localPath string,
	onSync func() error,
) {
	editorWatchesMu.Lock()
	if existing, ok := editorWatches[watchKey]; ok {
		close(existing.StopCh)
	}
	stopCh := make(chan struct{})
	editorWatches[watchKey] = &ActiveEditorWatch{
		SessionID: sessionId,
		LocalPath: localPath,
		StopCh:    stopCh,
	}
	editorWatchesMu.Unlock()

	go func() {
		defer func() {
			editorWatchesMu.Lock()
			delete(editorWatches, watchKey)
			editorWatchesMu.Unlock()
		}()

		stat, err := os.Stat(localPath)
		if err != nil {
			return
		}
		lastMod := stat.ModTime()

		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				currentStat, err := os.Stat(localPath)
				if err != nil {
					continue
				}
				if currentStat.ModTime().After(lastMod) {
					lastMod = currentStat.ModTime()
					// 触发自动回传
					if err := onSync(); err != nil {
						fmt.Printf("[EditorSync] 自动回传文件失败 %s: %v\n", localPath, err)
					}
				}
			}
		}
	}()
}

// StopEditorWatchesForSession 当会话关闭时清理该会话的所有监听器
func StopEditorWatchesForSession(sessionId string) {
	editorWatchesMu.Lock()
	defer editorWatchesMu.Unlock()
	for k, w := range editorWatches {
		if w.SessionID == sessionId {
			close(w.StopCh)
			delete(editorWatches, k)
		}
	}
}

// GetCacheDirForSession 获取指定会话的本地临时文件缓存目录
func GetCacheDirForSession(sessionId string) (string, error) {
	cacheDir := filepath.Join(config.GetSubDir("cache"), sessionId)
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return "", err
	}
	return cacheDir, nil
}

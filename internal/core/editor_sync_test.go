package core

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestGetCacheDirForSession(t *testing.T) {
	dir, err := GetCacheDirForSession("test_session_123")
	if err != nil {
		t.Fatalf("GetCacheDirForSession failed: %v", err)
	}
	if !filepath.IsAbs(dir) {
		t.Errorf("Expected absolute path, got %s", dir)
	}
	_ = os.RemoveAll(dir)
}

func TestWatchFileChanges(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "editor_sync_test")
	if err != nil {
		t.Fatalf("MkdirTemp failed: %v", err)
	}
	defer os.RemoveAll(tempDir)

	testFile := filepath.Join(tempDir, "sample.txt")
	if err := os.WriteFile(testFile, []byte("hello"), 0644); err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	synced := make(chan bool, 1)
	WatchFileChanges("watch_test_1", "sess_1", testFile, func() error {
		synced <- true
		return nil
	})

	// 等待一小会儿后模拟用户修改文件
	time.Sleep(100 * time.Millisecond)
	_ = os.WriteFile(testFile, []byte("hello world modified"), 0644)

	select {
	case ok := <-synced:
		if !ok {
			t.Error("Expected sync callback triggered")
		}
	case <-time.After(2500 * time.Millisecond):
		t.Fatal("Timeout waiting for file watcher sync callback")
	}

	StopEditorWatchesForSession("sess_1")
}

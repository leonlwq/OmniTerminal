package core

import (
	"bytes"
	"os/exec"
	"runtime"
	"testing"
	"time"
)

func TestLocalProcess_Unix(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("跳过 Unix 测试 (当前运行在 Windows)")
	}

	cmd := exec.Command("/bin/sh", "-c", "echo 'omniterminal_local_pty_test'")
	proc, err := StartLocalProcessUnix(cmd, 80, 24)
	if err != nil {
		t.Fatalf("StartLocalProcessUnix 失败: %v", err)
	}
	defer proc.Close()

	if proc.Pid() <= 0 {
		t.Errorf("期待合法的进程 PID, 实际为: %d", proc.Pid())
	}

	if err := proc.Resize(100, 30); err != nil {
		t.Errorf("Resize 失败: %v", err)
	}

	buf := make([]byte, 1024)
	done := make(chan struct{})
	var readBytes []byte
	go func() {
		for {
			n, err := proc.Read(buf)
			if n > 0 {
				readBytes = append(readBytes, buf[:n]...)
			}
			if err != nil {
				break
			}
		}
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("读取超时")
	}

	if !bytes.Contains(readBytes, []byte("omniterminal_local_pty_test")) {
		t.Errorf("输出未包含预期内容, 实际输出: %s", string(readBytes))
	}

	_ = proc.Wait()
}

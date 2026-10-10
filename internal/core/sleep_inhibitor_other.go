//go:build !darwin && !windows

package core

import (
	"context"
	"os/exec"
	"sync"
)

type linuxSleepInhibitor struct {
	mu     sync.Mutex
	cmd    *exec.Cmd
	cancel context.CancelFunc
}

func newSleepInhibitorPlatform() sleepInhibitorImpl {
	return &linuxSleepInhibitor{}
}

func (l *linuxSleepInhibitor) start() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.cmd != nil {
		return nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	// 尝试通过 systemd-inhibit 阻止系统挂起与空闲休眠
	cmd := exec.CommandContext(ctx, "systemd-inhibit", "--what=idle:sleep", "--who=OmniTerminal", "--why=Active terminal sessions", "sleep", "infinity")
	if err := cmd.Start(); err != nil {
		cancel()
		// 若无 systemd-inhibit 则不阻断正常运行
		return nil
	}

	l.cmd = cmd
	l.cancel = cancel
	go func() {
		_ = cmd.Wait()
	}()
	return nil
}

func (l *linuxSleepInhibitor) stop() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.cancel != nil {
		l.cancel()
		l.cancel = nil
	}
	if l.cmd != nil && l.cmd.Process != nil {
		_ = l.cmd.Process.Kill()
		l.cmd = nil
	}
	return nil
}

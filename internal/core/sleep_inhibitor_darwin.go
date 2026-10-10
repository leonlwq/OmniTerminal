//go:build darwin

package core

import (
	"context"
	"os/exec"
	"sync"
)

type darwinSleepInhibitor struct {
	mu     sync.Mutex
	cmd    *exec.Cmd
	cancel context.CancelFunc
}

func newSleepInhibitorPlatform() sleepInhibitorImpl {
	return &darwinSleepInhibitor{}
}

func (d *darwinSleepInhibitor) start() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.cmd != nil {
		return nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	// caffeinate 参数说明:
	// -d: 防止显示器休眠 (display sleep)
	// -i: 防止系统空闲休眠 (idle sleep)
	// -s: 防止外接供电下的系统休眠 (system sleep)
	cmd := exec.CommandContext(ctx, "caffeinate", "-d", "-i", "-s")
	if err := cmd.Start(); err != nil {
		cancel()
		return err
	}

	d.cmd = cmd
	d.cancel = cancel

	go func() {
		_ = cmd.Wait()
	}()

	return nil
}

func (d *darwinSleepInhibitor) stop() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.cancel != nil {
		d.cancel()
		d.cancel = nil
	}
	if d.cmd != nil && d.cmd.Process != nil {
		_ = d.cmd.Process.Kill()
		d.cmd = nil
	}
	return nil
}

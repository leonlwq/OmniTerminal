//go:build !windows

package core

import (
	"os/exec"
	"syscall"
)

// detachProcess 为非 Windows 平台（macOS / Linux）设置进程组脱离，确保父进程退出后子进程继续独立运行
func detachProcess(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.Setpgid = true
}

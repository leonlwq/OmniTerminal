//go:build windows

package core

import (
	"os/exec"
	"syscall"
)

// detachProcess 为 Windows 平台设置新进程组与脱离控制台标志，确保父进程退出后更新批处理脚本继续执行
func detachProcess(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	// CREATE_NEW_PROCESS_GROUP = 0x00000200, DETACHED_PROCESS = 0x00000008
	cmd.SysProcAttr.CreationFlags |= 0x00000200 | 0x00000008
}

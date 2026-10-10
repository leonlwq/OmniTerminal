//go:build windows

package core

import (
	"os/exec"
	"syscall"
)

// createNoWindow 为 Win32 进程创建标志 (CREATE_NO_WINDOW)，指示系统不要为控制台子系统应用分配新的控制台窗口
const createNoWindow = 0x08000000

// HideConsoleWindow 为 Windows 下的子进程配置静默运行属性，彻底杜绝弹出独立的 CMD / Windows Terminal 控制台黑框
func HideConsoleWindow(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	cmd.SysProcAttr.CreationFlags |= createNoWindow
}

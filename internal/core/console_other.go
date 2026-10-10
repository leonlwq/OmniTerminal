//go:build !windows

package core

import "os/exec"

// HideConsoleWindow 在非 Windows 环境下为空操作
func HideConsoleWindow(cmd *exec.Cmd) {}

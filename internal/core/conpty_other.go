//go:build !windows

package core

import (
	"errors"
)

var errNotWindows = errors.New("Windows ConPTY 在当前非 Windows 操作系统下不可用")

// StartLocalProcessWindows 在非 Windows 平台的空实现
func StartLocalProcessWindows(shell string, args []string, dir string, env []string, cols, rows int) (LocalProcess, error) {
	return nil, errNotWindows
}

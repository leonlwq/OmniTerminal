//go:build !windows

package core

import (
	"fmt"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
)

// UnixPtyProcess 封装 Unix 平台 (macOS/Linux) 的 PTY 伪终端进程
type UnixPtyProcess struct {
	cmd       *exec.Cmd
	ptmx      *os.File
	closeOnce sync.Once
}

// StartLocalProcessUnix 在 Unix 平台通过 creack/pty 启动交互式伪终端
func StartLocalProcessUnix(c *exec.Cmd, cols, rows int) (LocalProcess, error) {
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	ptmxFile, err := pty.StartWithSize(c, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
	if err != nil {
		return nil, fmt.Errorf("pty.StartWithSize 启动失败: %w", err)
	}

	return &UnixPtyProcess{
		cmd:  c,
		ptmx: ptmxFile,
	}, nil
}

func (u *UnixPtyProcess) Read(p []byte) (int, error) {
	return u.ptmx.Read(p)
}

func (u *UnixPtyProcess) Write(p []byte) (int, error) {
	return u.ptmx.Write(p)
}

func (u *UnixPtyProcess) Resize(cols, rows int) error {
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}
	return pty.Setsize(u.ptmx, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
}

func (u *UnixPtyProcess) Pid() int {
	if u.cmd != nil && u.cmd.Process != nil {
		return u.cmd.Process.Pid
	}
	return 0
}

func (u *UnixPtyProcess) Wait() error {
	if u.cmd != nil {
		return u.cmd.Wait()
	}
	return nil
}

func (u *UnixPtyProcess) Close() error {
	var err error
	u.closeOnce.Do(func() {
		if u.ptmx != nil {
			err = u.ptmx.Close()
		}
		if u.cmd != nil && u.cmd.Process != nil {
			_ = u.cmd.Process.Kill()
		}
	})
	return err
}

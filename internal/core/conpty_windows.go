//go:build windows

package core

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"sync/atomic"
	"unsafe"

	"golang.org/x/sys/windows"
)

// WindowsConPty 实现 LocalProcess 接口，基于 Windows 原生 ConPTY 虚拟终端
type WindowsConPty struct {
	hPC        windows.Handle
	inPipe     *os.File // 写入端：用户按键 -> inPipe -> ConPTY -> 子进程 stdin
	outPipe    *os.File // 读取端：子进程 stdout -> ConPTY -> outPipe -> 用户终端
	procHandle windows.Handle
	pid        int
	closeOnce  sync.Once
	closed     uint32
}

// StartWindowsConPty 启动原生 Windows ConPTY 会话
func StartWindowsConPty(shell string, args []string, dir string, env []string, cols, rows int) (*WindowsConPty, error) {
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	// 1. 创建输入管道 (inRead -> inWrite)
	var inRead, inWrite windows.Handle
	if err := windows.CreatePipe(&inRead, &inWrite, nil, 0); err != nil {
		return nil, fmt.Errorf("创建 ConPTY 输入管道失败: %w", err)
	}

	// 2. 创建输出管道 (outRead -> outWrite)
	var outRead, outWrite windows.Handle
	if err := windows.CreatePipe(&outRead, &outWrite, nil, 0); err != nil {
		_ = windows.CloseHandle(inRead)
		_ = windows.CloseHandle(inWrite)
		return nil, fmt.Errorf("创建 ConPTY 输出管道失败: %w", err)
	}

	// 3. 创建伪控制台 (HPCON)
	coord := windows.Coord{
		X: int16(cols),
		Y: int16(rows),
	}
	var hPC windows.Handle
	if err := windows.CreatePseudoConsole(coord, inRead, outWrite, 0, &hPC); err != nil {
		_ = windows.CloseHandle(inRead)
		_ = windows.CloseHandle(inWrite)
		_ = windows.CloseHandle(outRead)
		_ = windows.CloseHandle(outWrite)
		return nil, fmt.Errorf("调用 CreatePseudoConsole 失败: %w", err)
	}

	// 微软官方规范：CreatePseudoConsole 成功后，内核已复制并接管 inRead 与 outWrite。
	// 宿主程序必须立即关闭自己这边的 inRead 与 outWrite 句柄，
	// 保证当 ConPTY 关闭时管道引用计数归零，从而触发正常的 EOF。
	_ = windows.CloseHandle(inRead)
	_ = windows.CloseHandle(outWrite)

	inPipe := os.NewFile(uintptr(inWrite), "conpty_in")
	outPipe := os.NewFile(uintptr(outRead), "conpty_out")

	// 4. 配置进程属性列表，附加 PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE
	attrList, err := windows.NewProcThreadAttributeList(1)
	if err != nil {
		windows.ClosePseudoConsole(hPC)
		_ = inPipe.Close()
		_ = outPipe.Close()
		return nil, fmt.Errorf("分配进程属性列表失败: %w", err)
	}
	defer attrList.Delete()

	if err := attrList.Update(
		windows.PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,
		handleToPointer(hPC),
		unsafe.Sizeof(hPC),
	); err != nil {
		windows.ClosePseudoConsole(hPC)
		_ = inPipe.Close()
		_ = outPipe.Close()
		return nil, fmt.Errorf("设置伪控制台属性失败: %w", err)
	}

	si := new(windows.StartupInfoEx)
	si.Cb = uint32(unsafe.Sizeof(*si))
	si.ProcThreadAttributeList = attrList.List()

	// 5. 查找可执行程序并拼接命令行
	targetApp := shell
	if resolved, err := exec.LookPath(shell); err == nil {
		targetApp = resolved
	}

	fullCmd := windows.EscapeArg(targetApp)
	for _, a := range args {
		fullCmd += " " + windows.EscapeArg(a)
	}

	cmdLinePtr := windows.StringToUTF16Ptr(fullCmd)

	var dirPtr *uint16
	if dir != "" {
		dirPtr = windows.StringToUTF16Ptr(dir)
	}

	// 环境变量块处理
	creationFlags := uint32(windows.EXTENDED_STARTUPINFO_PRESENT)
	var envBlock *uint16
	if len(env) > 0 {
		var block []uint16
		for _, e := range env {
			block = append(block, windows.StringToUTF16(e)...)
		}
		block = append(block, 0)
		envBlock = &block[0]
		creationFlags |= windows.CREATE_UNICODE_ENVIRONMENT
	}

	// 6. 调用 CreateProcess 创建连接到 ConPTY 的进程
	pi := new(windows.ProcessInformation)
	if err := windows.CreateProcess(
		nil,
		cmdLinePtr,
		nil,
		nil,
		false,
		creationFlags,
		envBlock,
		dirPtr,
		&si.StartupInfo,
		pi,
	); err != nil {
		windows.ClosePseudoConsole(hPC)
		_ = inPipe.Close()
		_ = outPipe.Close()
		return nil, fmt.Errorf("创建控制台进程失败 (%s): %w", fullCmd, err)
	}

	// 立即关闭不需要的线程句柄
	_ = windows.CloseHandle(pi.Thread)

	return &WindowsConPty{
		hPC:        hPC,
		inPipe:     inPipe,
		outPipe:    outPipe,
		procHandle: pi.Process,
		pid:        int(pi.ProcessId),
	}, nil
}

func (c *WindowsConPty) Read(p []byte) (int, error) {
	return c.outPipe.Read(p)
}

func (c *WindowsConPty) Write(p []byte) (int, error) {
	return c.inPipe.Write(p)
}

func (c *WindowsConPty) Resize(cols, rows int) error {
	if atomic.LoadUint32(&c.closed) == 1 {
		return nil
	}
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}
	coord := windows.Coord{
		X: int16(cols),
		Y: int16(rows),
	}
	return windows.ResizePseudoConsole(c.hPC, coord)
}

func (c *WindowsConPty) Pid() int {
	return c.pid
}

func (c *WindowsConPty) Wait() error {
	if c.procHandle == 0 {
		return nil
	}
	_, err := windows.WaitForSingleObject(c.procHandle, windows.INFINITE)
	if err != nil {
		return err
	}
	var exitCode uint32
	if err := windows.GetExitCodeProcess(c.procHandle, &exitCode); err == nil {
		if exitCode != 0 {
			return fmt.Errorf("进程已退出 (代码: %d)", exitCode)
		}
	}
	return nil
}

func (c *WindowsConPty) Close() error {
	c.closeOnce.Do(func() {
		atomic.StoreUint32(&c.closed, 1)

		// 1. 关闭 ConPTY
		windows.ClosePseudoConsole(c.hPC)

		// 2. 关闭输入/输出管道
		if c.inPipe != nil {
			_ = c.inPipe.Close()
		}
		if c.outPipe != nil {
			_ = c.outPipe.Close()
		}

		// 3. 优雅等待进程退出，超时则强制终止
		if c.procHandle != 0 {
			event, _ := windows.WaitForSingleObject(c.procHandle, 1000)
			if event == uint32(windows.WAIT_TIMEOUT) {
				_ = windows.TerminateProcess(c.procHandle, 1)
			}
			_ = windows.CloseHandle(c.procHandle)
			c.procHandle = 0
		}
	})
	return nil
}

// WindowsFallbackProcess 降级模式：在不支持 ConPTY 的极老系统下通过管道执行
type WindowsFallbackProcess struct {
	cmd       *exec.Cmd
	stdin     io.WriteCloser
	stdout    io.ReadCloser
	closeOnce sync.Once
}

func StartWindowsFallbackPipe(shell string, args []string, dir string, env []string, cols, rows int) (LocalProcess, error) {
	c := exec.Command(shell, args...)
	if dir != "" {
		c.Dir = dir
	}
	if len(env) > 0 {
		c.Env = env
	}
	HideConsoleWindow(c)

	stdin, err := c.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("创建标准输入管道失败: %w", err)
	}
	stdout, err := c.StdoutPipe()
	if err != nil {
		_ = stdin.Close()
		return nil, fmt.Errorf("创建标准输出管道失败: %w", err)
	}
	c.Stderr = c.Stdout

	if err := c.Start(); err != nil {
		_ = stdin.Close()
		_ = stdout.Close()
		return nil, fmt.Errorf("启动进程失败: %w", err)
	}

	return &WindowsFallbackProcess{
		cmd:    c,
		stdin:  stdin,
		stdout: stdout,
	}, nil
}

func (w *WindowsFallbackProcess) Read(p []byte) (int, error) {
	return w.stdout.Read(p)
}

func (w *WindowsFallbackProcess) Write(p []byte) (int, error) {
	// 在普通管道回退模式下，将孤立的 '\r' 转换为 '\r\n' 以促使 cmd 识别行结束
	var translated []byte
	for i := 0; i < len(p); i++ {
		if p[i] == '\r' && (i+1 == len(p) || p[i+1] != '\n') {
			translated = append(translated, '\r', '\n')
		} else {
			translated = append(translated, p[i])
		}
	}
	return w.stdin.Write(translated)
}

func (w *WindowsFallbackProcess) Resize(cols, rows int) error {
	return nil // 匿名管道不支持 Resize
}

func (w *WindowsFallbackProcess) Pid() int {
	if w.cmd != nil && w.cmd.Process != nil {
		return w.cmd.Process.Pid
	}
	return 0
}

func (w *WindowsFallbackProcess) Wait() error {
	if w.cmd != nil {
		return w.cmd.Wait()
	}
	return nil
}

func (w *WindowsFallbackProcess) Close() error {
	var err error
	w.closeOnce.Do(func() {
		if w.stdin != nil {
			_ = w.stdin.Close()
		}
		if w.stdout != nil {
			_ = w.stdout.Close()
		}
		if w.cmd != nil && w.cmd.Process != nil {
			_ = w.cmd.Process.Kill()
			err = w.cmd.Wait()
		}
	})
	return err
}

// StartLocalProcessWindows 尝试使用原生 ConPTY 启动本地终端，失败时自动降级到管道模式
func StartLocalProcessWindows(shell string, args []string, dir string, env []string, cols, rows int) (LocalProcess, error) {
	conpty, err := StartWindowsConPty(shell, args, dir, env, cols, rows)
	if err == nil {
		DebugLocalLog("[StartLocalProcessWindows] ConPTY 虚拟终端启动成功 (pid=%d, cols=%d, rows=%d)", conpty.Pid(), cols, rows)
		return conpty, nil
	}
	DebugLocalLog("[StartLocalProcessWindows] ConPTY 启动失败 (%v)，降级使用管道模式", err)
	return StartWindowsFallbackPipe(shell, args, dir, env, cols, rows)
}

// StartLocalProcessUnix 在 Windows 下的桩函数（仅为编译期符号对齐）
func StartLocalProcessUnix(c *exec.Cmd, cols, rows int) (LocalProcess, error) {
	return nil, fmt.Errorf("StartLocalProcessUnix 在 Windows 平台不支持")
}

// handleToPointer 将 windows.Handle 转换为 unsafe.Pointer，同时保持 safe 内存规程
func handleToPointer(h windows.Handle) unsafe.Pointer {
	return *(*unsafe.Pointer)(unsafe.Pointer(&h))
}



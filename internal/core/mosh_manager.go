package core

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/creack/pty"
	"golang.org/x/crypto/ssh"
	"omniterminal/internal/models"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var moshConnectRegex = regexp.MustCompile(`MOSH\s+CONNECT\s+(\d+)\s+([A-Za-z0-9+/=]+)`)

// ParseMoshConnectOutput 从远端 mosh-server 的标准输出中提取 UDP 端口和 Base64 密钥
func ParseMoshConnectOutput(output string) (int, string, error) {
	matches := moshConnectRegex.FindStringSubmatch(output)
	if len(matches) < 3 {
		return 0, "", fmt.Errorf("未能从远端输出中解析 MOSH CONNECT 握手信息: %s", output)
	}

	port, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, "", fmt.Errorf("无效的 Mosh UDP 端口 %s: %w", matches[1], err)
	}

	key := matches[2]
	return port, key, nil
}

// FindMoshClient 探测本地操作系统中可用的 mosh-client 可执行程序绝对路径
func FindMoshClient() string {
	// 1. 优先检查 PATH 中的 mosh-client
	if p, err := exec.LookPath("mosh-client"); err == nil {
		return p
	}

	// 2. 检查常见安装路径 (macOS Homebrew / Linux / Windows)
	candidates := []string{
		"/opt/homebrew/bin/mosh-client",
		"/usr/local/bin/mosh-client",
		"/usr/bin/mosh-client",
		"/bin/mosh-client",
	}

	if runtime.GOOS == "windows" {
		candidates = append(candidates,
			`C:\Program Files\Mosh\mosh-client.exe`,
			`C:\ProgramData\chocolatey\bin\mosh-client.exe`,
		)
	}

	for _, cand := range candidates {
		if fi, err := os.Stat(cand); err == nil && !fi.IsDir() {
			return cand
		}
	}

	return ""
}

// ConnectMosh 建立 Mosh (Mobile Shell) 协议连接:
// 1. 通过 SSH 协议连接远程主机并在远端执行 mosh-server new -s -c 256
// 2. 获取并解析 MOSH CONNECT <port> <key> 握手行
// 3. 在本地通过 PTY 启动 mosh-client <host> <port>，注入 MOSH_KEY 环境变量
// 4. 将 PTY 读写流接入 xterm.js 终端
func (m *SSHManager) ConnectMosh(
	id string,
	name string,
	host string,
	port int,
	user string,
	password string,
	privateKey string,
	moshServerPath string,
	moshPortRange string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	// 1. 检查本地 mosh-client 工具
	moshClientPath := FindMoshClient()
	if moshClientPath == "" {
		return fmt.Errorf("本地环境未检测到 mosh-client 客户端。Mosh 协议需要本地客户端工具，请先在终端运行 'brew install mosh' (macOS) 或 'sudo apt install mosh' (Linux) 安装 Mosh。")
	}

	if port <= 0 {
		port = 22
	}
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}

	// 2. 建立 SSH 连接以在远端启动 mosh-server
	var authMethods []ssh.AuthMethod
	if privateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(privateKey))
		if err == nil {
			authMethods = append(authMethods, ssh.PublicKeys(signer))
		}
	}
	if password != "" {
		authMethods = append(authMethods, ssh.Password(password))
	}
	if len(authMethods) == 0 {
		authMethods = append(authMethods, ssh.Password(""))
	}

	sshConfig := &ssh.ClientConfig{
		User:            user,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         12 * time.Second,
	}

	sshAddr := fmt.Sprintf("%s:%d", host, port)
	sshClient, err := ssh.Dial("tcp", sshAddr, sshConfig)
	if err != nil {
		return fmt.Errorf("Mosh 初始 SSH 验证连接失败 (%s): %w", sshAddr, err)
	}
	defer sshClient.Close()

	session, err := sshClient.NewSession()
	if err != nil {
		return fmt.Errorf("无法创建 SSH 远端会话: %w", err)
	}
	defer session.Close()

	// 3. 构建 mosh-server 启动命令
	serverPath := moshServerPath
	if serverPath == "" {
		serverPath = "mosh-server"
	}
	serverCmd := fmt.Sprintf("%s new -s -c 256", serverPath)
	if moshPortRange != "" {
		serverCmd = fmt.Sprintf("%s -p %s", serverCmd, moshPortRange)
	}

	stdoutPipe, err := session.StdoutPipe()
	if err != nil {
		return fmt.Errorf("无法获取远端 stdout 流: %w", err)
	}

	stderrPipe, err := session.StderrPipe()
	if err != nil {
		return fmt.Errorf("无法获取远端 stderr 流: %w", err)
	}

	if err := session.Start(serverCmd); err != nil {
		return fmt.Errorf("远端启动 mosh-server 失败 (请确认远端是否已安装 mosh-server): %w", err)
	}

	// 4. 解析 MOSH CONNECT
	outputChan := make(chan string, 1)
	errChan := make(chan error, 1)

	go func() {
		scanner := bufio.NewScanner(io.MultiReader(stdoutPipe, stderrPipe))
		var capturedLines []string
		for scanner.Scan() {
			line := scanner.Text()
			capturedLines = append(capturedLines, line)
			if strings.Contains(line, "MOSH CONNECT") {
				outputChan <- line
				return
			}
		}
		errChan <- fmt.Errorf("未接收到 MOSH CONNECT 信号。远端输出: %s", strings.Join(capturedLines, "\n"))
	}()

	var connectLine string
	select {
	case connectLine = <-outputChan:
	case err := <-errChan:
		return err
	case <-time.After(10 * time.Second):
		return fmt.Errorf("等待远端 mosh-server 响应超时 (10s)")
	}

	udpPort, sessionKey, err := ParseMoshConnectOutput(connectLine)
	if err != nil {
		return err
	}

	// 5. 本地通过 PTY 启动 mosh-client
	cmd := exec.Command(moshClientPath, host, strconv.Itoa(udpPort))
	cmd.Env = append(os.Environ(), fmt.Sprintf("MOSH_KEY=%s", sessionKey))

	var ptmx io.ReadWriteCloser
	if runtime.GOOS == "windows" {
		stdin, err := cmd.StdinPipe()
		if err != nil {
			return fmt.Errorf("启动本地 mosh-client 失败 (stdin): %w", err)
		}
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return fmt.Errorf("启动本地 mosh-client 失败 (stdout): %w", err)
		}
		cmd.Stderr = cmd.Stdout
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("启动本地 mosh-client 失败: %w", err)
		}
		ptmx = &localPtyWrapper{
			cmd:    cmd,
			stdin:  stdin,
			stdout: stdout,
		}
	} else {
		ptmxFile, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
		if err != nil {
			return fmt.Errorf("通过 PTY 启动本地 mosh-client 失败: %w", err)
		}
		ptmx = ptmxFile
	}

	logger, _ := NewSessionLogger(logConfig, name, fmt.Sprintf("%s:%d (Mosh UDP:%d)", host, port, udpPort))

	info := &SessionInfo{
		ID:          id,
		Protocol:    "mosh",
		WriteCloser: ptmx,
		Ptmx:        ptmx,
		MoshPtmx:    ptmx,
		MoshCmd:     cmd,
		Encoding:    encoding,
		Logger:      logger,
		ConnectedAt: time.Now(),
	}

	m.Mu.Lock()
	m.Sessions[id] = info
	m.Mu.Unlock()

	wailsruntime.EventsEmit(m.Ctx, "terminal-ready", map[string]interface{}{
		"id":    id,
		"theme": overrideTheme,
		"font":  overrideFontSize,
	})

	go func() {
		m.readLoop(id, ptmx, info)
		wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
			"id":    id,
			"error": "Mosh 会话已断开",
		})
		m.Disconnect(id)
	}()

	return nil
}

// Ensure localPtyWrapper satisfies io.ReadWriteCloser
var _ = bytes.MinRead

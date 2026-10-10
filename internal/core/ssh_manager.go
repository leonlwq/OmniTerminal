package core

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"golang.org/x/crypto/ssh/knownhosts"
	appconfig "omniterminal/internal/config"
	"omniterminal/internal/models"
	"golang.org/x/crypto/ssh/agent"
	"golang.org/x/net/proxy"
	"net/url"
	"net/http"
	"strconv"
	"bufio"
	"os"
	"regexp"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/pkg/sftp"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
	"golang.org/x/text/encoding"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/encoding/korean"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/transform"
)

type SessionInfo struct {
	ID             string
	Name           string
	Protocol       string // "ssh" | "serial" | "telnet" | "rlogin" | "mosh" | "raw_tcp" | "local"
	Client         *ssh.Client
	Session        *ssh.Session
	WriteCloser    io.WriteCloser
	SftpClient     *sftp.Client
	CloseOnce      sync.Once
	LoginScripts   []models.ExpectInteractive
	Triggers       []models.TriggerRule
	TriggeredState []bool
	Logger         *SessionLogger
	Listeners      []io.Closer
	KeepAliveDone  chan struct{} // 用于停止心跳保活协程
	ConnectedAt    time.Time    // 连接建立时间
	Encoding       string       // 连接的目标字符集编码
	IsLocal        bool
	LocalCmd       *exec.Cmd
	LocalProc      LocalProcess
	Ptmx           io.ReadWriteCloser

	// Phase 2 扩展
	SerialWrapper *SerialPortWrapper
	TelnetClient  *TelnetClient
	RloginClient  *RloginClient
	RawTCPClient  *RawTCPClient

	// Phase 6 Mosh 扩展
	MoshCmd  *exec.Cmd
	MoshPtmx io.ReadWriteCloser

	// Phase 4 扩展: 端口转发隧道追踪
	ActiveTunnels   []models.SSHTunnel
	TunnelListeners map[string]net.Listener

	// Phase 7 / 24.1: SSH 连接复用
	IsPooled bool
	PoolKey  string
	sshMgr   *SSHManager
}


// localPtyWrapper 包装本地进程的输入输出
type localPtyWrapper struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
}

func (w *localPtyWrapper) Read(p []byte) (n int, err error) {
	return w.stdout.Read(p)
}

func (w *localPtyWrapper) Write(p []byte) (n int, err error) {
	return w.stdin.Write(p)
}

func (w *localPtyWrapper) Close() error {
	w.stdin.Close()
	w.stdout.Close()
	if w.cmd.Process != nil {
		w.cmd.Process.Kill()
	}
	return w.cmd.Wait()
}

type SSHManager struct {
	Ctx             context.Context
	Mu              sync.RWMutex
	Sessions        map[string]*SessionInfo
	Pool            *SSHConnectionPool
	DataListenersMu sync.RWMutex
	DataListeners   map[string]map[string]func(b64Data string)
}

func NewSSHManager() *SSHManager {
	return &SSHManager{
		Sessions:      make(map[string]*SessionInfo),
		Pool:          NewSSHConnectionPool(50, 300*time.Second),
		DataListeners: make(map[string]map[string]func(b64Data string)),
	}
}

// RegisterDataListener 注册外部数据流监听器 (例如用于 WebSocket 会话共享)
func (m *SSHManager) RegisterDataListener(id string, listenerID string, listener func(b64Data string)) {
	m.DataListenersMu.Lock()
	defer m.DataListenersMu.Unlock()
	if m.DataListeners == nil {
		m.DataListeners = make(map[string]map[string]func(b64Data string))
	}
	if m.DataListeners[id] == nil {
		m.DataListeners[id] = make(map[string]func(b64Data string))
	}
	m.DataListeners[id][listenerID] = listener
}

// UnregisterDataListener 注销外部数据流监听器
func (m *SSHManager) UnregisterDataListener(id string, listenerID string) {
	m.DataListenersMu.Lock()
	defer m.DataListenersMu.Unlock()
	if m.DataListeners != nil && m.DataListeners[id] != nil {
		delete(m.DataListeners[id], listenerID)
		if len(m.DataListeners[id]) == 0 {
			delete(m.DataListeners, id)
		}
	}
}

// BroadcastData 向所有注册的监听器广播数据
func (m *SSHManager) BroadcastData(id string, b64Str string) {
	m.DataListenersMu.RLock()
	var listeners []func(b64Data string)
	if m.DataListeners != nil && m.DataListeners[id] != nil {
		for _, l := range m.DataListeners[id] {
			listeners = append(listeners, l)
		}
	}
	m.DataListenersMu.RUnlock()

	for _, l := range listeners {
		l(b64Str)
	}
}

func (m *SSHManager) SetContext(ctx context.Context) {
	m.Ctx = ctx
}

// DebugLocalLog 仅在开发者显式配置 OMNI_DEBUG=1 时向标准输出打印调试信息，彻底废除磁盘文件写入
func DebugLocalLog(format string, args ...interface{}) {
	if os.Getenv("OMNI_DEBUG") == "1" {
		msg := fmt.Sprintf(format, args...)
		fmt.Printf("[%s][DEBUG] %s\n", time.Now().Format("15:04:05.000"), msg)
	}
}

// Connect 建立 SSH 连接并启动 Shell 会话
func (m *SSHManager) Connect(
	id string, 
	name string, 
	host string, 
	port int, 
	user string, 
	password string, 
	privateKey string, 
	cols int, 
	rows int, 
	loginScripts []models.ExpectInteractive, 
	overrideTheme string, 
	overrideFontSize int, 
	logConfig models.LogConfig,
	tunnels []models.SSHTunnel,
	encoding string,
	jumpHost string,
	jumpPort int,
	jumpUser string,
	jumpPassword string,
	jumpPrivateKey string,
	termType string,
	isLocal bool,
	proxyType string,
	proxyHost string,
	proxyPort int,
	proxyUser string,
	proxyPassword string,
	ciphers []string,
	macs []string,
	sessionMode string,
	enableAgentForwarding bool,
	enableX11Forwarding bool,
	x11Display string,
	triggers []models.TriggerRule,
) error {
	m.Mu.Lock()
	if existing, ok := m.Sessions[id]; ok {
		existing.Close()
		delete(m.Sessions, id)
	}
	m.Mu.Unlock()

	if isLocal {
		return m.ConnectLocalShell(id, name, "", "", cols, rows, overrideTheme, overrideFontSize, logConfig, encoding)
	}

	var authMethods []ssh.AuthMethod

	if privateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(privateKey))
		if err != nil {
			return fmt.Errorf("解析私钥失败: %v", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	} else if password != "" {
		authMethods = append(authMethods, ssh.Password(password))
	} else {
		// If neither is provided, rely entirely on KeyboardInteractive
		// Or we can just include KeyboardInteractive in all cases as a fallback
	}

	// Always append KeyboardInteractive
	authMethods = append(authMethods, ssh.KeyboardInteractive(func(user, instruction string, questions []string, echos []bool) (answers []string, err error) {
		if len(questions) == 0 {
			return nil, nil
		}
		
		// Create a channel to wait for user input from frontend
		type promptResult struct {
			answers []string
			err     error
		}
		resultCh := make(chan promptResult, 1)

		// Define the event handler for receiving the answer
		eventName := fmt.Sprintf("ki-answer-%s", id)
		wailsruntime.EventsOnce(m.Ctx, eventName, func(optionalData ...interface{}) {
			if len(optionalData) > 0 {
				if answerArray, ok := optionalData[0].([]interface{}); ok {
					var ans []string
					for _, a := range answerArray {
						ans = append(ans, fmt.Sprintf("%v", a))
					}
					resultCh <- promptResult{answers: ans, err: nil}
					return
				}
			}
			resultCh <- promptResult{answers: nil, err: fmt.Errorf("用户取消了键盘交互认证")}
		})

		// Send challenge to frontend
		wailsruntime.EventsEmit(m.Ctx, "keyboard-interactive-challenge", map[string]interface{}{
			"sessionId":   id,
			"user":        user,
			"instruction": instruction,
			"questions":   questions,
			"echos":       echos,
		})

		// Wait for response with timeout
		select {
		case res := <-resultCh:
			return res.answers, res.err
		case <-time.After(2 * time.Minute):
			return nil, fmt.Errorf("键盘交互认证超时")
		}
	}))

	hostKeyCallback := ssh.InsecureIgnoreHostKey()
	// Check known_hosts
	knownHostsPath := appconfig.GetFilePath("known_hosts")
	if _, err := os.Stat(knownHostsPath); os.IsNotExist(err) {
		_ = os.WriteFile(knownHostsPath, []byte(""), 0600)
	}

	hostKeyCallback = func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			checker, err := knownhosts.New(knownHostsPath)
			if err != nil {
				return err
			}
			err = checker(hostname, remote, key)
			if err != nil {
				if keyErr, ok := err.(*knownhosts.KeyError); ok {
					if len(keyErr.Want) > 0 {
						// Host key mismatch! Extremely dangerous.
						return fmt.Errorf("主机指纹不匹配！这可能是一次中间人攻击。")
					}
					// Key is unknown. Prompt user to accept it.
					fingerprint := ssh.FingerprintSHA256(key)
					
					resultCh := make(chan bool, 1)
					eventName := fmt.Sprintf("hk-answer-%s", id)
					wailsruntime.EventsOnce(m.Ctx, eventName, func(optionalData ...interface{}) {
						if len(optionalData) > 0 {
							if accepted, ok := optionalData[0].(bool); ok {
								resultCh <- accepted
								return
							}
						}
						resultCh <- false
					})

					wailsruntime.EventsEmit(m.Ctx, "host-key-verify", map[string]interface{}{
						"sessionId":   id,
						"hostname":    hostname,
						"fingerprint": fingerprint,
						"keyType":     key.Type(),
					})

					select {
					case accepted := <-resultCh:
						if accepted {
							// Append to known_hosts
							f, err := os.OpenFile(knownHostsPath, os.O_APPEND|os.O_WRONLY, 0600)
							if err == nil {
								line := knownhosts.Line([]string{hostname}, key)
								f.WriteString(line + "\n")
								f.Close()
							}
							return nil
						}
						return fmt.Errorf("用户拒绝了未知的主机指纹")
					case <-time.After(2 * time.Minute):
						return fmt.Errorf("主机指纹确认超时")
					}
				}
				return err
			}
			return nil
		}

	config := &ssh.ClientConfig{
		User:            user,
		Auth:            authMethods,
		HostKeyCallback: hostKeyCallback,
		Timeout:         10 * time.Second,
	}

	if len(ciphers) > 0 || len(macs) > 0 {
		config.Config = ssh.Config{}
		if len(ciphers) > 0 {
			config.Config.Ciphers = ciphers
		}
		if len(macs) > 0 {
			config.Config.MACs = macs
		}
	}

	var client *ssh.Client
		var jumpClient *ssh.Client
	targetAddr := fmt.Sprintf("%s:%d", host, port)

	dialSSH := func(network, addr string, config *ssh.ClientConfig) (*ssh.Client, error) {
		if proxyType == "socks5" && proxyHost != "" {
			proxyAddr := fmt.Sprintf("%s:%d", proxyHost, proxyPort)
			var auth *proxy.Auth
			if proxyUser != "" || proxyPassword != "" {
				auth = &proxy.Auth{User: proxyUser, Password: proxyPassword}
			}
			dialer, err := proxy.SOCKS5("tcp", proxyAddr, auth, proxy.Direct)
			if err != nil {
				return nil, fmt.Errorf("无法创建 SOCKS5 代理拨号器: %v", err)
			}
			conn, err := dialer.Dial(network, addr)
			if err != nil {
				return nil, fmt.Errorf("SOCKS5 代理连接失败: %v", err)
			}
			c, chans, reqs, err := ssh.NewClientConn(conn, addr, config)
			if err != nil {
				conn.Close()
				return nil, err
			}
			return ssh.NewClient(c, chans, reqs), nil
		} else if proxyType == "http" && proxyHost != "" {
			proxyAddr := net.JoinHostPort(proxyHost, strconv.Itoa(proxyPort))
			conn, err := net.DialTimeout("tcp", proxyAddr, config.Timeout)
			if err != nil {
				return nil, fmt.Errorf("无法连接 HTTP 代理: %v", err)
			}
			
			reqURL, _ := url.Parse("http://" + addr)
			req := &http.Request{
				Method: "CONNECT",
				URL:    reqURL,
				Host:   addr,
				Header: make(http.Header),
			}
			if proxyUser != "" || proxyPassword != "" {
				auth := proxyUser + ":" + proxyPassword
				basicAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
				req.Header.Add("Proxy-Authorization", basicAuth)
			}
			
			err = req.Write(conn)
			if err != nil {
				conn.Close()
				return nil, fmt.Errorf("写入 HTTP 代理请求失败: %v", err)
			}
			
			resp, err := http.ReadResponse(bufio.NewReader(conn), req)
			if err != nil {
				conn.Close()
				return nil, fmt.Errorf("读取 HTTP 代理响应失败: %v", err)
			}
			if resp.StatusCode != 200 {
				conn.Close()
				return nil, fmt.Errorf("HTTP 代理拒绝连接: %s", resp.Status)
			}
			
			c, chans, reqs, err := ssh.NewClientConn(conn, addr, config)
			if err != nil {
				conn.Close()
				return nil, err
			}
			return ssh.NewClient(c, chans, reqs), nil
		}
		
		// Direct Dial
		return ssh.Dial(network, addr, config)
	}

	dialTarget := func() (*ssh.Client, error) {
		if jumpHost != "" {
			var jumpAuths []ssh.AuthMethod
			if jumpPrivateKey != "" {
				signer, err := ssh.ParsePrivateKey([]byte(jumpPrivateKey))
				if err != nil {
					return nil, fmt.Errorf("解析跳板机私钥失败: %v", err)
				}
				jumpAuths = append(jumpAuths, ssh.PublicKeys(signer))
			} else if jumpPassword != "" {
				jumpAuths = append(jumpAuths, ssh.Password(jumpPassword))
			} else {
				return nil, fmt.Errorf("跳板机配置必须提供密码或私钥")
			}

			jumpConfig := &ssh.ClientConfig{
				User:            jumpUser,
				Auth:            jumpAuths,
				HostKeyCallback: ssh.InsecureIgnoreHostKey(),
				Timeout:         10 * time.Second,
			}

			jumpAddr := fmt.Sprintf("%s:%d", jumpHost, jumpPort)
			jClient, err := dialSSH("tcp", jumpAddr, jumpConfig)
			if err != nil {
				return nil, fmt.Errorf("连接跳板机失败: %v", err)
			}
			jumpClient = jClient

			conn, err := jClient.Dial("tcp", targetAddr)
			if err != nil {
				jClient.Close()
				return nil, fmt.Errorf("穿透跳板机连接目标主机失败: %v", err)
			}

			ncc, chans, reqs, err := ssh.NewClientConn(conn, targetAddr, config)
			if err != nil {
				conn.Close()
				jClient.Close()
				return nil, fmt.Errorf("在跳板机通道内与目标主机握手失败: %v", err)
			}

			return ssh.NewClient(ncc, chans, reqs), nil
		}

		return dialSSH("tcp", targetAddr, config)
	}

	poolKey := fmt.Sprintf("%s@%s:%d", user, host, port)
	if jumpHost != "" {
		poolKey = fmt.Sprintf("%s@%s:%d|jump=%s@%s:%d", user, host, port, jumpUser, jumpHost, jumpPort)
	}

	isPooled := false
	if m.Pool != nil {
		c, _, err := m.Pool.GetOrCreate(poolKey, host, port, user, dialTarget)
		if err != nil {
			return fmt.Errorf("连接服务器失败: %v", err)
		}
		client = c
		isPooled = true
	} else {
		c, err := dialTarget()
		if err != nil {
			return fmt.Errorf("连接服务器失败: %v", err)
		}
		client = c
	}

	cleanupClient := func() {
		if isPooled && m.Pool != nil {
			m.Pool.Release(poolKey)
		} else if client != nil {
			client.Close()
		}
	}

	session, err := client.NewSession()
	if err != nil {
		cleanupClient()
		return fmt.Errorf("创建会话失败: %v", err)
	}

	if enableAgentForwarding {
		authSock := os.Getenv("SSH_AUTH_SOCK")
		if authSock != "" {
			agentConn, err := net.Dial("unix", authSock)
			if err == nil {
				ag := agent.NewClient(agentConn)
				agent.ForwardToAgent(client, ag)
				agent.RequestAgentForwarding(session)
			}
		}
	}

	if enableX11Forwarding {
		// Basic X11 setup
		payload := []byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
		ok, err := session.SendRequest("x11-req", true, payload)
		if err == nil && ok {
			go func() {
				x11Chans := client.HandleChannelOpen("x11")
				for newCh := range x11Chans {
					ch, reqs, err := newCh.Accept()
					if err != nil {
						continue
					}
					go ssh.DiscardRequests(reqs)
					display := x11Display
					if display == "" {
						display = "localhost:6000"
					}
					x11Conn, err := net.Dial("tcp", display)
					if err != nil {
						ch.Close()
						continue
					}
					go func() {
						io.Copy(x11Conn, ch)
						x11Conn.Close()
					}()
					go func() {
						io.Copy(ch, x11Conn)
						ch.Close()
					}()
				}
			}()
		}
	}

	var stdin io.WriteCloser
	var stdout, stderr io.Reader

	if sessionMode != "sftp-only" {
		modes := ssh.TerminalModes{
			ssh.ECHO:          1,
			ssh.TTY_OP_ISPEED: 14400,
			ssh.TTY_OP_OSPEED: 14400,
		}

		if termType == "" {
			termType = "xterm-256color"
		}
		if err := session.RequestPty(termType, rows, cols, modes); err != nil {
			session.Close()
			cleanupClient()
			return fmt.Errorf("请求 PTY 失败: %v", err)
		}

		stdin, err = session.StdinPipe()
		if err != nil {
			session.Close()
			cleanupClient()
			return fmt.Errorf("获取输入管道失败: %v", err)
		}

		stdout, err = session.StdoutPipe()
		if err != nil {
			session.Close()
			cleanupClient()
			return fmt.Errorf("获取输出管道失败: %v", err)
		}

		stderr, err = session.StderrPipe()
		if err != nil {
			session.Close()
			cleanupClient()
			return fmt.Errorf("获取错误管道失败: %v", err)
		}

		if err := session.Shell(); err != nil {
			session.Close()
			cleanupClient()
			return fmt.Errorf("启动 Shell 失败: %v", err)
		}
	}

	sftpClient, err := sftp.NewClient(client)
	if err != nil {
		fmt.Printf("建立 SFTP 客户端失败: %v\n", err)
	}

	triggeredState := make([]bool, len(loginScripts))

	// 创建审计日志文件
	logger, _ := NewSessionLogger(logConfig, name, targetAddr)

	info := &SessionInfo{
		ID:             id,
		Name:           name,
		Protocol:       "ssh",
		Client:         client,
		Session:        session,
		WriteCloser:    stdin,
		SftpClient:     sftpClient,
		LoginScripts:   loginScripts,
		Triggers:       triggers,
		TriggeredState: triggeredState,
		Logger:         logger,
		Listeners:      []io.Closer{},
		KeepAliveDone:  make(chan struct{}),
		ConnectedAt:    time.Now(),
		Encoding:       encoding,
		IsPooled:       isPooled,
		PoolKey:        poolKey,
		sshMgr:         m,
	}

	if jumpClient != nil {
		info.Listeners = append(info.Listeners, jumpClient)
	}

	// 启动所有配置的端口转发隧道
	for _, tunnel := range tunnels {
		if tunnel.LocalAddr == "" {
			continue
		}
		switch strings.ToLower(tunnel.Type) {
		case "local":
			m.startLocalTunnel(info, tunnel)
		case "remote":
			m.startRemoteTunnel(info, tunnel)
		case "dynamic":
			m.startDynamicTunnel(info, tunnel)
		}
	}

	m.Mu.Lock()
	m.Sessions[id] = info
	m.Mu.Unlock()

	if stdout != nil {
		go m.readLoop(id, stdout, info)
	}
	if stderr != nil {
		go m.readLoop(id, stderr, info)
	}

	// 启动心跳保活协程 —— 每 30 秒发送 Keep-Alive 信标包
	go m.keepAliveLoop(id, info)

	go func() {
		err := session.Wait()
		if err != nil {
			wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
				"id":    id,
				"error": err.Error(),
			})
		} else {
			wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
				"id":    id,
				"error": "",
			})
		}
		m.Disconnect(id)
	}()

	return nil
}

// readLoop 读取数据，推送到前端，并在登录初期匹配 Expect 自动脚本
func (m *SSHManager) readLoop(id string, reader io.Reader, info *SessionInfo) {
	buf := make([]byte, 32768)
	history := ""

	outCh := make(chan []byte, 1024)
	defer close(outCh)
	go func() {
		var pending []byte
		ticker := time.NewTicker(10 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case data, ok := <-outCh:
				if !ok {
					if len(pending) > 0 {
						utf8Bytes, transErr := decodeToUTF8(pending, info.Encoding)
						var b64Str string
						if transErr == nil {
							b64Str = base64.StdEncoding.EncodeToString(utf8Bytes)
						} else {
							b64Str = base64.StdEncoding.EncodeToString(pending)
						}
						wailsruntime.EventsEmit(m.Ctx, fmt.Sprintf("ssh-data:%s", id), b64Str)
						m.BroadcastData(id, b64Str)
					}
					return
				}
				pending = append(pending, data...)
			case <-ticker.C:
				if len(pending) > 0 {
					utf8Bytes, transErr := decodeToUTF8(pending, info.Encoding)
					var b64Str string
					if transErr == nil {
						b64Str = base64.StdEncoding.EncodeToString(utf8Bytes)
					} else {
						b64Str = base64.StdEncoding.EncodeToString(pending)
					}
					wailsruntime.EventsEmit(m.Ctx, fmt.Sprintf("ssh-data:%s", id), b64Str)
					m.BroadcastData(id, b64Str)
					pending = nil
				}
			}
		}
	}()

	for {
		n, err := reader.Read(buf)
		if n > 0 {
			if info.Logger != nil {
				_, _ = info.Logger.Write(buf[:n])
			}

			dataCopy := make([]byte, n)
			copy(dataCopy, buf[:n])
			outCh <- dataCopy

			if len(info.LoginScripts) > 0 {
				history += string(buf[:n])
				if len(history) > 2048 {
					history = history[len(history)-2048:]
				}

				for idx, script := range info.LoginScripts {
					if !info.TriggeredState[idx] && script.Expect != "" {
						matched := false
						reg, err := regexp.Compile("(?i)" + script.Expect)
						if err == nil {
							matched = reg.MatchString(history)
						} else {
							matched = strings.Contains(strings.ToLower(history), strings.ToLower(script.Expect))
						}

						if matched {
							info.TriggeredState[idx] = true
							_, _ = info.WriteCloser.Write([]byte(script.Send + "\n"))
							history = ""
						}
					}
				}
			}
			
			// Trigger matches
			if len(info.Triggers) > 0 {
			    if len(history) == 0 {
			        history += string(buf[:n])
			        if len(history) > 2048 {
			            history = history[len(history)-2048:]
			        }
			    }
			    for _, trigger := range info.Triggers {
			        if trigger.Expect != "" {
			            matched := false
			            if trigger.IsRegex {
			                reg, err := regexp.Compile(trigger.Expect)
			                if err == nil {
			                    matched = reg.MatchString(history)
			                }
			            } else {
			                matched = strings.Contains(history, trigger.Expect)
			            }
			            if matched {
			                _, _ = info.WriteCloser.Write([]byte(trigger.Send + "\n"))
			                history = ""
			            }
			        }
			    }
			}
		}
		if err != nil {
			break
		}
	}
}

func (m *SSHManager) startLocalTunnel(info *SessionInfo, tunnel models.SSHTunnel) {
	listener, err := net.Listen("tcp", tunnel.LocalAddr)
	if err != nil {
		fmt.Printf("[%s] 本地隧道监听失败 %s: %v\n", info.ID, tunnel.LocalAddr, err)
		return
	}
	info.Listeners = append(info.Listeners, listener)
	if info.TunnelListeners == nil {
		info.TunnelListeners = make(map[string]net.Listener)
	}
	info.TunnelListeners[tunnel.LocalAddr] = listener
	info.ActiveTunnels = append(info.ActiveTunnels, tunnel)

	go func() {
		for {
			localConn, err := listener.Accept()
			if err != nil {
				break
			}
			go func() {
				defer localConn.Close()
				remoteConn, err := info.Client.Dial("tcp", tunnel.RemoteAddr)
				if err != nil {
					fmt.Printf("[%s] 拨号远程隧道失败 %s: %v\n", info.ID, tunnel.RemoteAddr, err)
					return
				}
				defer remoteConn.Close()

				chDone := make(chan bool, 2)
				go func() {
					_, _ = io.Copy(remoteConn, localConn)
					chDone <- true
				}()
				go func() {
					_, _ = io.Copy(localConn, remoteConn)
					chDone <- true
				}()
				<-chDone
			}()
		}
	}()
}

func (m *SSHManager) startRemoteTunnel(info *SessionInfo, tunnel models.SSHTunnel) {
	listener, err := info.Client.Listen("tcp", tunnel.RemoteAddr)
	if err != nil {
		fmt.Printf("[%s] 远程隧道监听失败 %s: %v\n", info.ID, tunnel.RemoteAddr, err)
		return
	}
	info.Listeners = append(info.Listeners, listener)
	if info.TunnelListeners == nil {
		info.TunnelListeners = make(map[string]net.Listener)
	}
	info.TunnelListeners[tunnel.RemoteAddr] = listener
	info.ActiveTunnels = append(info.ActiveTunnels, tunnel)

	go func() {
		for {
			remoteConn, err := listener.Accept()
			if err != nil {
				break
			}
			go func() {
				defer remoteConn.Close()
				localConn, err := net.Dial("tcp", tunnel.LocalAddr)
				if err != nil {
					fmt.Printf("[%s] 拨号本地隧道目标失败 %s: %v\n", info.ID, tunnel.LocalAddr, err)
					return
				}
				defer localConn.Close()

				chDone := make(chan bool, 2)
				go func() {
					_, _ = io.Copy(localConn, remoteConn)
					chDone <- true
				}()
				go func() {
					_, _ = io.Copy(remoteConn, localConn)
					chDone <- true
				}()
				<-chDone
			}()
		}
	}()
}

func (m *SSHManager) startDynamicTunnel(info *SessionInfo, tunnel models.SSHTunnel) {
	listener, err := net.Listen("tcp", tunnel.LocalAddr)
	if err != nil {
		fmt.Printf("[%s] 动态代理监听失败 %s: %v\n", info.ID, tunnel.LocalAddr, err)
		return
	}
	info.Listeners = append(info.Listeners, listener)
	if info.TunnelListeners == nil {
		info.TunnelListeners = make(map[string]net.Listener)
	}
	info.TunnelListeners[tunnel.LocalAddr] = listener
	info.ActiveTunnels = append(info.ActiveTunnels, tunnel)

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				break
			}
			go m.handleSocks5(info, conn)
		}
	}()
}

func (m *SSHManager) handleSocks5(info *SessionInfo, conn net.Conn) {
	defer conn.Close()

	buf := make([]byte, 262)
	if _, err := io.ReadFull(conn, buf[:2]); err != nil {
		return
	}
	version := buf[0]
	nmethods := buf[1]
	if version != 0x05 {
		return
	}
	if _, err := io.ReadFull(conn, buf[:nmethods]); err != nil {
		return
	}
	_, _ = conn.Write([]byte{0x05, 0x00})

	if _, err := io.ReadFull(conn, buf[:4]); err != nil {
		return
	}
	cmd := buf[1]
	atyp := buf[3]

	if cmd != 0x01 {
		return
	}

	var destAddr string
	switch atyp {
	case 0x01:
		addrBytes := make([]byte, 4)
		if _, err := io.ReadFull(conn, addrBytes); err != nil {
			return
		}
		destAddr = fmt.Sprintf("%d.%d.%d.%d", addrBytes[0], addrBytes[1], addrBytes[2], addrBytes[3])
	case 0x03:
		lenByte := make([]byte, 1)
		if _, err := io.ReadFull(conn, lenByte); err != nil {
			return
		}
		domainLen := int(lenByte[0])
		domainBytes := make([]byte, domainLen)
		if _, err := io.ReadFull(conn, domainBytes); err != nil {
			return
		}
		destAddr = string(domainBytes)
	case 0x04:
		addrBytes := make([]byte, 16)
		if _, err := io.ReadFull(conn, addrBytes); err != nil {
			return
		}
		destAddr = fmt.Sprintf("[%x:%x:%x:%x:%x:%x:%x:%x]",
			addrBytes[0:2], addrBytes[2:4], addrBytes[4:6], addrBytes[6:8],
			addrBytes[8:10], addrBytes[10:12], addrBytes[12:14], addrBytes[14:16])
	default:
		return
	}

	portBytes := make([]byte, 2)
	if _, err := io.ReadFull(conn, portBytes); err != nil {
		return
	}
	destPort := (int(portBytes[0]) << 8) | int(portBytes[1])
	target := fmt.Sprintf("%s:%d", destAddr, destPort)

	remoteConn, err := info.Client.Dial("tcp", target)
	if err != nil {
		_, _ = conn.Write([]byte{0x05, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})
		return
	}
	defer remoteConn.Close()

	_, _ = conn.Write([]byte{0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})

	chDone := make(chan bool, 2)
	go func() {
		_, _ = io.Copy(remoteConn, conn)
		chDone <- true
	}()
	go func() {
		_, _ = io.Copy(conn, remoteConn)
		chDone <- true
	}()
	<-chDone
}

// GetActiveTunnels 获取当前所有活动会话中运行的端口转发隧道列表
func (m *SSHManager) GetActiveTunnels() []models.TunnelStatusInfo {
	m.Mu.RLock()
	defer m.Mu.RUnlock()

	var results []models.TunnelStatusInfo
	for sessID, info := range m.Sessions {
		if info.TunnelListeners == nil {
			continue
		}
		for localAddr := range info.TunnelListeners {
			// 查找对应的配置
			for _, t := range info.ActiveTunnels {
				if t.LocalAddr == localAddr || t.RemoteAddr == localAddr {
					results = append(results, models.TunnelStatusInfo{
						ID:          fmt.Sprintf("%s_%s", sessID, localAddr),
						SessionID:   sessID,
						SessionName: info.Name,
						Type:        t.Type,
						LocalAddr:   t.LocalAddr,
						RemoteAddr:  t.RemoteAddr,
						Status:      "active",
						ActiveConns: 1,
						CreatedAt:   info.ConnectedAt.Format("15:04:05"),
					})
				}
			}
		}
	}
	return results
}

// StopTunnel 单独关闭某个活动会话的指定端口转发隧道
func (m *SSHManager) StopTunnel(sessionId string, localAddr string) error {
	m.Mu.RLock()
	info, ok := m.Sessions[sessionId]
	m.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", sessionId)
	}

	if info.TunnelListeners == nil {
		return fmt.Errorf("该会话无活动隧道")
	}

	listener, exists := info.TunnelListeners[localAddr]
	if !exists {
		return fmt.Errorf("未找到地址为 %s 的隧道", localAddr)
	}

	err := listener.Close()
	delete(info.TunnelListeners, localAddr)
	return err
}

// StartDynamicTunnel 运行时动态向活动 SSH 会话添加端口转发隧道
func (m *SSHManager) StartDynamicTunnel(sessionId string, tunnelType string, localAddr string, remoteAddr string) error {
	m.Mu.RLock()
	info, ok := m.Sessions[sessionId]
	m.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到活动会话 %s", sessionId)
	}

	if info.Client == nil {
		return fmt.Errorf("会话 %s 未建立 SSH 连接", sessionId)
	}

	tunnel := models.SSHTunnel{
		Type:       tunnelType,
		LocalAddr:  localAddr,
		RemoteAddr: remoteAddr,
	}

	switch tunnelType {
	case "local":
		m.startLocalTunnel(info, tunnel)
	case "remote":
		m.startRemoteTunnel(info, tunnel)
	case "dynamic":
		m.startDynamicTunnel(info, tunnel)
	default:
		return fmt.Errorf("不支持的隧道类型: %s", tunnelType)
	}

	return nil
}

// Write 发送按键输入
func (m *SSHManager) Write(id string, base64Data string) error {
	m.Mu.RLock()
	info, ok := m.Sessions[id]
	m.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}

	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("解码数据失败: %v", err)
	}

	encodedBytes, transErr := encodeFromUTF8(string(data), info.Encoding)
	if transErr == nil {
		_, err = info.WriteCloser.Write(encodedBytes)
	} else {
		_, err = info.WriteCloser.Write(data)
	}
	return err
}

// Resize 更改大小
func (m *SSHManager) Resize(id string, cols int, rows int) error {
	m.Mu.RLock()
	info, ok := m.Sessions[id]
	m.Mu.RUnlock()

	if !ok {
		return fmt.Errorf("未找到会话 %s", id)
	}

	if info.TelnetClient != nil {
		info.TelnetClient.Resize(cols, rows)
		return nil
	}

	if info.RloginClient != nil {
		return info.RloginClient.Resize(cols, rows)
	}

	if info.MoshPtmx != nil {
		if runtime.GOOS != "windows" {
			if f, ok := info.MoshPtmx.(*os.File); ok {
				return pty.Setsize(f, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
			}
		}
		return nil
	}

	if info.IsLocal {
		if info.LocalProc != nil {
			return info.LocalProc.Resize(cols, rows)
		}
		if runtime.GOOS != "windows" {
			if f, ok := info.Ptmx.(*os.File); ok {
				return pty.Setsize(f, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
			}
		}
		return nil
	}

	if info.Session != nil {
		return info.Session.WindowChange(rows, cols)
	}
	return nil
}

// Disconnect 断开
func (m *SSHManager) Disconnect(id string) error {
	m.Mu.Lock()
	info, ok := m.Sessions[id]
	if ok {
		delete(m.Sessions, id)
	}
	m.Mu.Unlock()

	m.DataListenersMu.Lock()
	delete(m.DataListeners, id)
	m.DataListenersMu.Unlock()

	if ok {
		info.Close()
	}
	ClearHostMonitorSession(id)
	return nil
}

// CloseAll 关闭并断开全部活动会话
func (m *SSHManager) CloseAll() error {
	m.Mu.Lock()
	sessionsToClose := make([]*SessionInfo, 0, len(m.Sessions))
	for id, info := range m.Sessions {
		sessionsToClose = append(sessionsToClose, info)
		delete(m.Sessions, id)
	}
	m.Mu.Unlock()

	m.DataListenersMu.Lock()
	m.DataListeners = make(map[string]map[string]func(b64Data string))
	m.DataListenersMu.Unlock()

	for _, info := range sessionsToClose {
		info.Close()
	}
	return nil
}

// Close 关闭
func (s *SessionInfo) Close() {
	s.CloseOnce.Do(func() {
		// 通知心跳保活协程退出
		if s.KeepAliveDone != nil {
			close(s.KeepAliveDone)
		}

		for _, listener := range s.Listeners {
			if listener != nil {
				_ = listener.Close()
			}
		}
		if s.Logger != nil {
			_ = s.Logger.Sync()
			_ = s.Logger.Close()
		}
		if s.SftpClient != nil {
			s.SftpClient.Close()
		}
		if s.WriteCloser != nil {
			s.WriteCloser.Close()
		}
		if s.Session != nil {
			s.Session.Close()
		}
		if s.Client != nil {
			if s.IsPooled && s.PoolKey != "" && s.sshMgr != nil && s.sshMgr.Pool != nil {
				s.sshMgr.Pool.Release(s.PoolKey)
			} else {
				s.Client.Close()
			}
		}
		if s.SerialWrapper != nil {
			s.SerialWrapper.Close()
		}
		if s.TelnetClient != nil {
			s.TelnetClient.Close()
		}
		if s.RloginClient != nil {
			s.RloginClient.Close()
		}
		if s.RawTCPClient != nil {
			s.RawTCPClient.Close()
		}
		if s.MoshPtmx != nil {
			s.MoshPtmx.Close()
		}
		if s.MoshCmd != nil && s.MoshCmd.Process != nil {
			_ = s.MoshCmd.Process.Kill()
		}
		if s.IsLocal {
			if s.LocalProc != nil {
				_ = s.LocalProc.Close()
			} else {
				if s.Ptmx != nil {
					_ = s.Ptmx.Close()
				}
				if s.LocalCmd != nil && s.LocalCmd.Process != nil {
					_ = s.LocalCmd.Process.Kill()
				}
			}
		}
	})
}

// keepAliveLoop 每 30 秒向 SSH 服务端发送心跳保活信标包
func (m *SSHManager) keepAliveLoop(id string, info *SessionInfo) {
	if info.IsLocal || info.Client == nil {
		return
	}
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	failCount := 0
	for {
		select {
		case <-info.KeepAliveDone:
			return
		case <-ticker.C:
			_, _, err := info.Client.SendRequest("keepalive@openssh.com", true, nil)
			if err != nil {
				failCount++
				fmt.Printf("[%s] Keep-Alive 失败 #%d: %v\n", id, failCount, err)
				if failCount >= 3 {
					wailsruntime.EventsEmit(m.Ctx, "ssh-disconnected", map[string]interface{}{
						"id":    id,
						"error": fmt.Sprintf("心跳保活连续失败 %d 次，连接已断开", failCount),
					})
					return
				}
			} else {
				failCount = 0
			}
		}
	}
}

// GetSessionUptime 获取会话在线时长（秒）
func (m *SSHManager) GetSessionUptime(id string) int64 {
	m.Mu.RLock()
	info, ok := m.Sessions[id]
	m.Mu.RUnlock()
	if !ok {
		return 0
	}
	return int64(time.Since(info.ConnectedAt).Seconds())
}

func getEncoding(encName string) encoding.Encoding {
	switch strings.ToLower(encName) {
	case "gbk":
		return simplifiedchinese.GBK
	case "gb18030":
		return simplifiedchinese.GB18030
	case "euc-kr":
		return korean.EUCKR
	case "euc-jp":
		return japanese.EUCJP
	case "iso-8859-1":
		return charmap.ISO8859_1
	default:
		return nil
	}
}

func decodeToUTF8(data []byte, encName string) ([]byte, error) {
	enc := getEncoding(encName)
	if enc == nil {
		return data, nil
	}
	reader := transform.NewReader(strings.NewReader(string(data)), enc.NewDecoder())
	return io.ReadAll(reader)
}

func encodeFromUTF8(utf8Str string, encName string) ([]byte, error) {
	enc := getEncoding(encName)
	if enc == nil {
		return []byte(utf8Str), nil
	}
	var buf strings.Builder
	writer := transform.NewWriter(&buf, enc.NewEncoder())
	_, err := writer.Write([]byte(utf8Str))
	if err != nil {
		return nil, err
	}
	writer.Close()
	return []byte(buf.String()), nil
}




func detectSystemLocale() string {
	for _, envKey := range []string{"LC_ALL", "LC_CTYPE", "LANG"} {
		if val := os.Getenv(envKey); val != "" && !strings.EqualFold(val, "C") && !strings.EqualFold(val, "POSIX") {
			if strings.Contains(strings.ToLower(val), "utf") {
				return val
			}
			return val + ".UTF-8"
		}
	}

	if runtime.GOOS == "darwin" {
		out, err := exec.Command("defaults", "read", "-g", "AppleLocale").Output()
		if err == nil {
			loc := strings.TrimSpace(string(out))
			if idx := strings.Index(loc, "@"); idx != -1 {
				loc = loc[:idx]
			}
			loc = strings.ReplaceAll(loc, "-", "_")
			if loc != "" {
				return loc + ".UTF-8"
			}
		}
		outLang, errLang := exec.Command("defaults", "read", "-g", "AppleLanguages").Output()
		if errLang == nil && strings.Contains(string(outLang), "zh") {
			return "zh_CN.UTF-8"
		}
	}

	return "zh_CN.UTF-8"
}

func getLocalShellEnv(customEncoding string) []string {
	envMap := make(map[string]string)
	for _, env := range os.Environ() {
		parts := strings.SplitN(env, "=", 2)
		if len(parts) == 2 {
			envMap[parts[0]] = parts[1]
		}
	}

	// 补全基础终端环境变量
	envMap["TERM"] = "xterm-256color"
	envMap["COLORTERM"] = "truecolor"

	// 补齐 macOS GUI 应用缺失的常用 PATH
	if runtime.GOOS == "darwin" {
		curPath := envMap["PATH"]
		extraPaths := []string{
			"/opt/homebrew/bin",
			"/opt/homebrew/sbin",
			"/usr/local/bin",
			"/usr/bin",
			"/bin",
			"/usr/sbin",
			"/sbin",
		}
		for _, p := range extraPaths {
			if !strings.Contains(":"+curPath+":", ":"+p+":") {
				if curPath == "" {
					curPath = p
				} else {
					curPath = curPath + ":" + p
				}
			}
		}
		envMap["PATH"] = curPath
	}

	// 确保 UTF-8 语言环境 (解决 macOS/Linux 终端下中文文件名等被判定为不可打印字符而显示为 ? 问号乱码的问题)
	targetLocale := "zh_CN.UTF-8"
	if customEncoding != "" && !strings.EqualFold(customEncoding, "utf-8") && !strings.EqualFold(customEncoding, "utf8") {
		if strings.EqualFold(customEncoding, "gbk") || strings.EqualFold(customEncoding, "gb2312") || strings.EqualFold(customEncoding, "gb18030") {
			targetLocale = "zh_CN.GB18030"
		} else {
			targetLocale = customEncoding
		}
	} else {
		targetLocale = detectSystemLocale()
	}

	envMap["LANG"] = targetLocale
	envMap["LC_CTYPE"] = targetLocale
	envMap["LC_ALL"] = targetLocale

	res := make([]string, 0, len(envMap))
	for k, v := range envMap {
		res = append(res, fmt.Sprintf("%s=%s", k, v))
	}
	return res
}

func (m *SSHManager) ConnectLocalShell(
	id string, 
	name string, 
	shellPath string,
	wslDistro string,
	cols int, 
	rows int, 
	overrideTheme string, 
	overrideFontSize int, 
	logConfig models.LogConfig,
	encoding string,
) error {
	var shell string
	var shellArgs []string

	if runtime.GOOS == "windows" {
		if wslDistro != "" {
			shell = "wsl.exe"
			shellArgs = []string{"-d", wslDistro}
		} else if shellPath != "" {
			shell = shellPath
		} else if comspec := os.Getenv("COMSPEC"); comspec != "" {
			shell = comspec
		} else {
			shell = "cmd.exe"
		}
	} else {
		if shellPath != "" {
			shell = shellPath
		} else if userShell := os.Getenv("SHELL"); userShell != "" {
			shell = userShell
		} else if runtime.GOOS == "darwin" {
			shell = "/bin/zsh"
		} else {
			shell = "/bin/bash"
		}
		// 使用登录 Shell (-l) 以确保完整加载环境配置并启动交互式终端
		shellArgs = append(shellArgs, "-l")
	}

	if rows <= 0 {
		rows = 24
	}
	if cols <= 0 {
		cols = 80
	}

	var workDir string
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		workDir = home
	} else if home := os.Getenv("HOME"); home != "" {
		workDir = home
	} else if profile := os.Getenv("USERPROFILE"); profile != "" {
		workDir = profile
	}
	env := getLocalShellEnv(encoding)

	DebugLocalLog("[ConnectLocalShell] shell=%s, args=%v, rows=%d, cols=%d, dir=%s", shell, shellArgs, rows, cols, workDir)

	var localProc LocalProcess
	var c *exec.Cmd

	if runtime.GOOS == "windows" {
		proc, err := StartLocalProcessWindows(shell, shellArgs, workDir, env, cols, rows)
		if err != nil {
			return fmt.Errorf("启动本地终端失败: %w", err)
		}
		localProc = proc
	} else {
		c = exec.Command(shell, shellArgs...)
		c.Dir = workDir
		c.Env = env
		HideConsoleWindow(c)

		proc, err := StartLocalProcessUnix(c, cols, rows)
		if err != nil {
			DebugLocalLog("[ConnectLocalShell] StartLocalProcessUnix failed: %v", err)
			return fmt.Errorf("启动本地终端失败: %w", err)
		}
		localProc = proc
		DebugLocalLog("[ConnectLocalShell] pty started successfully: pid=%d", proc.Pid())
	}

	logger, _ := NewSessionLogger(logConfig, name, "local")

	m.Mu.Lock()
	if existing, ok := m.Sessions[id]; ok {
		existing.Close()
		delete(m.Sessions, id)
	}
	m.Sessions[id] = &SessionInfo{
		ID:          id,
		Protocol:    "local",
		Client:      nil, // no ssh client
		Session:     nil,
		WriteCloser: localProc,
		Ptmx:        localProc,
		LocalProc:   localProc,
		IsLocal:     true,
		LocalCmd:    c,
		Encoding:    encoding,
		Logger:      logger,
		ConnectedAt: time.Now(),
	}
	m.Mu.Unlock()

	wailsruntime.EventsEmit(m.Ctx, "terminal-ready", map[string]interface{}{
		"id":    id,
		"theme": overrideTheme,
		"font":  overrideFontSize,
	})

	// 启动数据读取
	DebugLocalLog("[ConnectLocalShell] launching readLoop for %s", id)
	go m.readLoop(id, localProc, m.Sessions[id])

	// 启动子 Goroutine 监听本地进程退出并清理会话
	go func() {
		var waitErr error
		if localProc != nil {
			waitErr = localProc.Wait()
		} else if c != nil {
			waitErr = c.Wait()
		}
		if waitErr != nil {
			DebugLocalLog("[ConnectLocalShell] process %s exited with err: %v", id, waitErr)
			wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
				"id":    id,
				"error": waitErr.Error(),
			})
		} else {
			DebugLocalLog("[ConnectLocalShell] process %s exited cleanly", id)
			wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
				"id":    id,
				"error": "",
			})
		}
		m.Disconnect(id)
	}()

	return nil
}

// ConnectSerial 建立串口连接并启动数据读写
func (m *SSHManager) ConnectSerial(
	id string,
	name string,
	cfg models.SerialConfig,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	serialPort, err := OpenSerialPort(cfg)
	if err != nil {
		return err
	}

	logger, _ := NewSessionLogger(logConfig, name, cfg.Port)

	info := &SessionInfo{
		ID:            id,
		Protocol:      "serial",
		WriteCloser:   serialPort,
		SerialWrapper: serialPort,
		Encoding:      encoding,
		Logger:        logger,
		ConnectedAt:   time.Now(),
	}

	m.Mu.Lock()
	m.Sessions[id] = info
	m.Mu.Unlock()

	wailsruntime.EventsEmit(m.Ctx, "terminal-ready", map[string]interface{}{
		"id":    id,
		"theme": overrideTheme,
		"font":  overrideFontSize,
	})

	// 发送串口当前状态事件
	wailsruntime.EventsEmit(m.Ctx, fmt.Sprintf("serial-status:%s", id), map[string]interface{}{
		"port":     cfg.Port,
		"baudRate": cfg.BaudRate,
		"dtr":      cfg.DTR,
		"rts":      cfg.RTS,
	})

	go func() {
		m.readLoop(id, serialPort, info)
		wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
			"id":    id,
			"error": "串口连接已关闭",
		})
		m.Disconnect(id)
	}()

	return nil
}

// ConnectTelnet 建立 Telnet 会话连接
func (m *SSHManager) ConnectTelnet(
	id string,
	name string,
	host string,
	port int,
	termType string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	telnetClient, err := DialTelnet(host, port, termType, cols, rows, 10*time.Second)
	if err != nil {
		return err
	}

	logger, _ := NewSessionLogger(logConfig, name, fmt.Sprintf("%s:%d", host, port))

	info := &SessionInfo{
		ID:           id,
		Protocol:     "telnet",
		WriteCloser:  telnetClient,
		TelnetClient: telnetClient,
		Encoding:     encoding,
		Logger:       logger,
		ConnectedAt:  time.Now(),
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
		m.readLoop(id, telnetClient, info)
		wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
			"id":    id,
			"error": "Telnet 连接已关闭",
		})
		m.Disconnect(id)
	}()

	return nil
}

// ConnectRawTCP 建立 Raw TCP Socket 原始调试连接
func (m *SSHManager) ConnectRawTCP(
	id string,
	name string,
	host string,
	port int,
	lineEnding string,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	rawClient, err := DialRawTCP(host, port, lineEnding, 10*time.Second)
	if err != nil {
		return err
	}

	logger, _ := NewSessionLogger(logConfig, name, fmt.Sprintf("%s:%d", host, port))

	info := &SessionInfo{
		ID:           id,
		Protocol:     "raw_tcp",
		WriteCloser:  rawClient,
		RawTCPClient: rawClient,
		Encoding:     encoding,
		Logger:       logger,
		ConnectedAt:  time.Now(),
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
		m.readLoop(id, rawClient, info)
		wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
			"id":    id,
			"error": "TCP 连接已断开",
		})
		m.Disconnect(id)
	}()

	return nil
}

// ConnectRlogin 建立 Rlogin (RFC 1282) 会话连接
func (m *SSHManager) ConnectRlogin(
	id string,
	name string,
	host string,
	port int,
	clientUser string,
	serverUser string,
	termType string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	rloginClient, err := DialRlogin(host, port, clientUser, serverUser, termType, cols, rows, 10*time.Second)
	if err != nil {
		return err
	}

	logger, _ := NewSessionLogger(logConfig, name, fmt.Sprintf("%s:%d", host, port))

	info := &SessionInfo{
		ID:           id,
		Protocol:     "rlogin",
		WriteCloser:  rloginClient,
		RloginClient: rloginClient,
		Encoding:     encoding,
		Logger:       logger,
		ConnectedAt:  time.Now(),
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
		m.readLoop(id, rloginClient, info)
		wailsruntime.EventsEmit(m.Ctx, "ssh-closed", map[string]interface{}{
			"id":    id,
			"error": "Rlogin 连接已关闭",
		})
		m.Disconnect(id)
	}()

	return nil
}

// SetSerialDTR 控制串口 DTR 引脚电平
func (m *SSHManager) SetSerialDTR(id string, state bool) error {
	m.Mu.RLock()
	info, ok := m.Sessions[id]
	m.Mu.RUnlock()

	if !ok || info.SerialWrapper == nil {
		return fmt.Errorf("串口会话未处于活动状态: %s", id)
	}
	return info.SerialWrapper.SetDTR(state)
}

// SetSerialRTS 控制串口 RTS 引脚电平
func (m *SSHManager) SetSerialRTS(id string, state bool) error {
	m.Mu.RLock()
	info, ok := m.Sessions[id]
	m.Mu.RUnlock()

	if !ok || info.SerialWrapper == nil {
		return fmt.Errorf("串口会话未处于活动状态: %s", id)
	}
	return info.SerialWrapper.SetRTS(state)
}

// SendSerialBreak 发送串口 Break 信号
func (m *SSHManager) SendSerialBreak(id string) error {
	m.Mu.RLock()
	info, ok := m.Sessions[id]
	m.Mu.RUnlock()

	if !ok || info.SerialWrapper == nil {
		return fmt.Errorf("串口会话未处于活动状态: %s", id)
	}
	return info.SerialWrapper.SendBreak(250 * time.Millisecond)
}

// GetSSHClient 获取指定会话的底层 SSH Client
func (m *SSHManager) GetSSHClient(id string) (*ssh.Client, error) {
	m.Mu.RLock()
	defer m.Mu.RUnlock()

	info, ok := m.Sessions[id]
	if !ok || info == nil {
		return nil, fmt.Errorf("会话不存在: %s", id)
	}
	if info.Client == nil {
		return nil, fmt.Errorf("会话未建立 SSH 连接或协议非 SSH: %s", id)
	}
	return info.Client, nil
}


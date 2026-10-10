package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/models"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// activeShareServer 代表一个正在共享的终端实例服务
type activeShareServer struct {
	SessionID  string
	Token      string
	Mode       string // "readonly" | "readwrite"
	Password   string
	MaxViewers int
	TimeoutMin int
	Port       int
	StartTime  time.Time
	ExpireTime time.Time
	Listener   net.Listener
	HttpServer *http.Server
	ViewersMu  sync.RWMutex
	Viewers    map[string]*websocket.Conn
	CancelFunc context.CancelFunc
}

var (
	shareServersMu sync.RWMutex
	shareServers   = make(map[string]*activeShareServer) // sessionId -> activeShareServer
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许局域网内任意终端或浏览器跨域直连
	},
}

// getLocalLANIP 获取首选局域网非回环 IPv4 地址
func getLocalLANIP() string {
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
				if ip4 := ipNet.IP.To4(); ip4 != nil {
					// 优先使用 192.168.x.x 或 10.x.x.x
					ipStr := ip4.String()
					if strings.HasPrefix(ipStr, "192.168.") || strings.HasPrefix(ipStr, "10.") || strings.HasPrefix(ipStr, "172.") {
						return ipStr
					}
				}
			}
		}
	}
	return "127.0.0.1"
}

// StartShareSession 启动一个会话的实时 Web 协同共享服务
func (a *App) StartShareSession(sessionId string, mode string, password string, maxViewers int, timeoutMin int) (*models.ShareSessionStatus, error) {
	if sessionId == "" {
		return nil, errors.New("会话 ID 不能为空")
	}

	a.sshManager.Mu.RLock()
	sessionInfo, ok := a.sshManager.Sessions[sessionId]
	a.sshManager.Mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("会话 %s 尚未连接，无法开启共享", sessionId)
	}

	if mode != "readwrite" {
		mode = "readonly"
	}
	if maxViewers <= 0 {
		maxViewers = 5
	}
	if timeoutMin <= 0 {
		timeoutMin = 30
	}

	// 如果已有正在运行的共享服务，先优雅停止
	_ = a.StopShareSession(sessionId)

	// 监听动态空闲端口 (8990 起测)
	var listener net.Listener
	var port int
	var listenErr error
	for p := 8990; p <= 9050; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%d", p))
		if err == nil {
			listener = ln
			port = p
			break
		}
	}
	if listener == nil {
		// 回退到系统任意端口
		listener, listenErr = net.Listen("tcp", "0.0.0.0:0")
		if listenErr != nil {
			return nil, fmt.Errorf("绑定共享网络端口失败: %w", listenErr)
		}
		port = listener.Addr().(*net.TCPAddr).Port
	}

	token := uuid.New().String()
	now := time.Now()
	expireAt := now.Add(time.Duration(timeoutMin) * time.Minute)
	ctx, cancel := context.WithCancel(context.Background())

	server := &activeShareServer{
		SessionID:  sessionId,
		Token:      token,
		Mode:       mode,
		Password:   password,
		MaxViewers: maxViewers,
		TimeoutMin: timeoutMin,
		Port:       port,
		StartTime:  now,
		ExpireTime: expireAt,
		Listener:   listener,
		Viewers:    make(map[string]*websocket.Conn),
		CancelFunc: cancel,
	}

	mux := http.NewServeMux()

	// 1. Web 页面路由: /share/{token}
	mux.HandleFunc(fmt.Sprintf("/share/%s", token), func(w http.ResponseWriter, r *http.Request) {
		a.handleShareWebPage(w, r, server, sessionInfo.Name)
	})

	// 2. WebSocket 路由: /ws/share/{token}
	mux.HandleFunc(fmt.Sprintf("/ws/share/%s", token), func(w http.ResponseWriter, r *http.Request) {
		a.handleShareWebSocket(w, r, server)
	})

	httpSrv := &http.Server{
		Handler: mux,
	}
	server.HttpServer = httpSrv

	shareServersMu.Lock()
	shareServers[sessionId] = server
	shareServersMu.Unlock()

	// 启动 HTTP 服务
	go func() {
		_ = httpSrv.Serve(listener)
	}()

	// 注册会话输出监听器: 当 SSH 输出数据时，广播给当前共享服务的所有 WebSocket 观众
	listenerKey := fmt.Sprintf("share_%s", token)
	a.sshManager.RegisterDataListener(sessionId, listenerKey, func(b64Data string) {
		server.broadcastOutput(b64Data)
	})

	// 超时自动停止
	go func() {
		select {
		case <-ctx.Done():
			return
		case <-time.After(time.Duration(timeoutMin) * time.Minute):
			_ = a.StopShareSession(sessionId)
		}
	}()

	lanIP := getLocalLANIP()
	status := &models.ShareSessionStatus{
		SessionID:     sessionId,
		IsSharing:     true,
		Token:         token,
		Mode:          mode,
		ShareURL:      fmt.Sprintf("http://%s:%d/share/%s", lanIP, port, token),
		LocalURL:      fmt.Sprintf("http://127.0.0.1:%d/share/%s", port, token),
		HasPassword:   password != "",
		ViewerCount:   0,
		MaxViewers:    maxViewers,
		StartTime:     now.Unix(),
		ExpireTime:    expireAt.Unix(),
		RemainingSecs: timeoutMin * 60,
	}

	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, fmt.Sprintf("share-status-changed:%s", sessionId), status)
	}

	return status, nil
}

// broadcastOutput 广播终端输出给该共享房间内所有已认证的 WebSocket 连接
func (s *activeShareServer) broadcastOutput(b64Data string) {
	s.ViewersMu.RLock()
	conns := make([]*websocket.Conn, 0, len(s.Viewers))
	for _, c := range s.Viewers {
		conns = append(conns, c)
	}
	s.ViewersMu.RUnlock()

	msg := map[string]interface{}{
		"type": "output",
		"data": b64Data,
	}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for _, conn := range conns {
		_ = conn.WriteMessage(websocket.TextMessage, msgBytes)
	}
}

// handleShareWebSocket 处理外部观众的 WebSocket 连接
func (a *App) handleShareWebSocket(w http.ResponseWriter, r *http.Request, s *activeShareServer) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// 校验观看人数上限
	s.ViewersMu.Lock()
	if len(s.Viewers) >= s.MaxViewers {
		s.ViewersMu.Unlock()
		_ = conn.WriteJSON(map[string]interface{}{
			"type":    "error",
			"message": fmt.Sprintf("观看人数已达到上限 (%d 人)", s.MaxViewers),
		})
		return
	}
	viewerID := uuid.New().String()
	s.Viewers[viewerID] = conn
	count := len(s.Viewers)
	s.ViewersMu.Unlock()

	// 通知 OmniTerminal 前端更新观看人数
	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, fmt.Sprintf("share-viewers-changed:%s", s.SessionID), map[string]interface{}{
			"sessionId":   s.SessionID,
			"viewerCount": count,
		})
	}

	// 发送握手成功与初始状态
	_ = conn.WriteJSON(map[string]interface{}{
		"type":        "init",
		"mode":        s.Mode,
		"hasPassword": s.Password != "",
		"viewerCount": count,
		"maxViewers":  s.MaxViewers,
	})

	// 循环监听客户端消息（鉴权 / 读写模式输入）
	authenticated := (s.Password == "")
	queryPwd := r.URL.Query().Get("pwd")
	if queryPwd != "" && queryPwd == s.Password {
		authenticated = true
	}

	for {
		_, msgData, readErr := conn.ReadMessage()
		if readErr != nil {
			break
		}

		var payload struct {
			Type     string `json:"type"`
			Password string `json:"password"`
			Data     string `json:"data"` // base64 input
		}
		if json.Unmarshal(msgData, &payload) != nil {
			continue
		}

		if payload.Type == "auth" {
			if payload.Password == s.Password {
				authenticated = true
				_ = conn.WriteJSON(map[string]interface{}{"type": "auth_ok"})
			} else {
				_ = conn.WriteJSON(map[string]interface{}{"type": "auth_failed", "message": "密码错误"})
			}
			continue
		}

		if !authenticated {
			_ = conn.WriteJSON(map[string]interface{}{"type": "error", "message": "尚未通过密码认证"})
			continue
		}

		// 如果处于可控协作模式，且接收到按键输入，写入 SSH 终端通道
		if payload.Type == "input" && s.Mode == "readwrite" && payload.Data != "" {
			_ = a.sshManager.Write(s.SessionID, payload.Data)
		}
	}

	// 客户端断开连接处理
	s.ViewersMu.Lock()
	delete(s.Viewers, viewerID)
	curCount := len(s.Viewers)
	s.ViewersMu.Unlock()

	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, fmt.Sprintf("share-viewers-changed:%s", s.SessionID), map[string]interface{}{
			"sessionId":   s.SessionID,
			"viewerCount": curCount,
		})
	}
}

// handleShareWebPage 渲染开箱即用的轻量自包含 Web 观察终端
func (a *App) handleShareWebPage(w http.ResponseWriter, r *http.Request, s *activeShareServer, sessionName string) {
	tmpl := `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniTerminal 会话共享 - {{.SessionName}}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0d10;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      background: #16191f;
      border-bottom: 1px solid #262b35;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 14px;
      color: #f8fafc;
    }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 500;
    }
    .badge-live {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
    }
    .badge-mode {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .terminal-container {
      flex: 1;
      padding: 8px 12px;
      background: #0b0d10;
      overflow: hidden;
      position: relative;
    }
    #terminal { width: 100%; height: 100%; }
    .auth-overlay {
      position: absolute;
      inset: 0;
      background: rgba(11, 13, 16, 0.92);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
    .auth-card {
      background: #16191f;
      border: 1px solid #262b35;
      border-radius: 12px;
      padding: 24px;
      width: 340px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      text-align: center;
    }
    .auth-card h3 { font-size: 16px; margin-bottom: 8px; color: #f1f5f9; }
    .auth-card p { font-size: 12px; color: #94a3b8; margin-bottom: 16px; }
    .auth-card input {
      width: 100%;
      background: #0f1115;
      border: 1px solid #262b35;
      border-radius: 6px;
      padding: 10px 12px;
      color: #fff;
      font-size: 14px;
      margin-bottom: 14px;
      outline: none;
    }
    .auth-card input:focus { border-color: #3b82f6; }
    .auth-card button {
      width: 100%;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .auth-card button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span>OmniTerminal 实时协同</span>
      <span style="color: #64748b;">·</span>
      <span style="color: #94a3b8;">{{.SessionName}}</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <span class="badge badge-live"><span class="pulse-dot"></span> LIVE 共享中</span>
      <span class="badge badge-mode">{{if eq .Mode "readwrite"}}可读写协作{{else}}只读观察{{end}}</span>
      <span id="viewer-count-badge" class="badge" style="background:#1e232d; color:#94a3b8;">👁️ 1 人</span>
    </div>
  </div>

  <div class="terminal-container">
    <div id="auth-modal" class="auth-overlay" style="display: {{if .HasPassword}}flex{{else}}none{{end}};">
      <div class="auth-card">
        <h3>请输入访问密码</h3>
        <p>该共享会话已受密码保护</p>
        <input type="password" id="auth-pwd" placeholder="访问口令..." />
        <button onclick="submitAuth()">验证并进入</button>
        <div id="auth-err" style="color: #ef4444; font-size: 12px; margin-top: 10px; display: none;"></div>
      </div>
    </div>
    <div id="terminal"></div>
  </div>

  <script>
    const token = "{{.Token}}";
    const mode = "{{.Mode}}";
    const hasPassword = {{.HasPassword}};
    const loc = window.location;
    const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = wsProto + '//' + loc.host + '/ws/share/' + token;

    let term = null;
    let fitAddon = null;
    let ws = null;

    function initTerminal() {
      term = new Terminal({
        cursorBlink: mode === 'readwrite',
        disableStdin: mode !== 'readwrite',
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0b0d10',
          foreground: '#d1d5db',
          cursor: mode === 'readwrite' ? '#3b82f6' : 'transparent',
          black: '#1e232d',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc'
        }
      });
      fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);
      term.open(document.getElementById('terminal'));
      fitAddon.fit();
      window.addEventListener('resize', () => fitAddon.fit());

      if (mode === 'readwrite') {
        term.onData(data => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            const b64 = btoa(unescape(encodeURIComponent(data)));
            ws.send(JSON.stringify({ type: 'input', data: b64 }));
          }
        });
      }
    }

    function connectWebSocket(pwd = '') {
      const urlWithPwd = pwd ? wsUrl + '?pwd=' + encodeURIComponent(pwd) : wsUrl;
      ws = new WebSocket(urlWithPwd);

      ws.onopen = () => {
        if (pwd) {
          ws.send(JSON.stringify({ type: 'auth', password: pwd }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output' && msg.data) {
            const raw = decodeURIComponent(escape(atob(msg.data)));
            term.write(raw);
          } else if (msg.type === 'auth_ok') {
            document.getElementById('auth-modal').style.display = 'none';
          } else if (msg.type === 'auth_failed') {
            const errEl = document.getElementById('auth-err');
            errEl.textContent = msg.message || '密码错误';
            errEl.style.display = 'block';
          } else if (msg.type === 'init') {
            if (msg.viewerCount) {
              document.getElementById('viewer-count-badge').textContent = '👁️ ' + msg.viewerCount + ' 人';
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        if (term) term.writeln('\r\n\x1b[33m[协同共享已断开]\x1b[0m');
      };
    }

    function submitAuth() {
      const pwd = document.getElementById('auth-pwd').value;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'auth', password: pwd }));
      } else {
        connectWebSocket(pwd);
      }
    }

    window.onload = () => {
      initTerminal();
      if (!hasPassword) {
        connectWebSocket();
      }
    };
  </script>
</body>
</html>`

	t, err := template.New("share").Parse(tmpl)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	data := struct {
		SessionName string
		Token       string
		Mode        string
		HasPassword bool
	}{
		SessionName: sessionName,
		Token:       s.Token,
		Mode:        s.Mode,
		HasPassword: s.Password != "",
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = t.Execute(w, data)
}

// StopShareSession 停止某会话正在运行的终端共享服务
func (a *App) StopShareSession(sessionId string) error {
	shareServersMu.Lock()
	server, exists := shareServers[sessionId]
	if exists {
		delete(shareServers, sessionId)
	}
	shareServersMu.Unlock()

	if !exists || server == nil {
		return nil
	}

	// 触发取消并注销数据监听器
	server.CancelFunc()
	listenerKey := fmt.Sprintf("share_%s", server.Token)
	a.sshManager.UnregisterDataListener(sessionId, listenerKey)

	// 关闭所有观众连接
	server.ViewersMu.Lock()
	for _, conn := range server.Viewers {
		_ = conn.Close()
	}
	server.Viewers = make(map[string]*websocket.Conn)
	server.ViewersMu.Unlock()

	// 关闭 HTTP 监听
	if server.HttpServer != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.HttpServer.Shutdown(ctx)
	}
	if server.Listener != nil {
		_ = server.Listener.Close()
	}

	status := &models.ShareSessionStatus{
		SessionID: sessionId,
		IsSharing: false,
	}

	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, fmt.Sprintf("share-status-changed:%s", sessionId), status)
	}

	return nil
}

// GetShareSessionStatus 获取某会话当前的共享服务状态
func (a *App) GetShareSessionStatus(sessionId string) (*models.ShareSessionStatus, error) {
	shareServersMu.RLock()
	server, exists := shareServers[sessionId]
	shareServersMu.RUnlock()

	if !exists || server == nil {
		return &models.ShareSessionStatus{
			SessionID: sessionId,
			IsSharing: false,
		}, nil
	}

	server.ViewersMu.RLock()
	viewerCount := len(server.Viewers)
	server.ViewersMu.RUnlock()

	now := time.Now()
	remSecs := int(server.ExpireTime.Sub(now).Seconds())
	if remSecs < 0 {
		remSecs = 0
	}

	lanIP := getLocalLANIP()
	return &models.ShareSessionStatus{
		SessionID:     sessionId,
		IsSharing:     true,
		Token:         server.Token,
		Mode:          server.Mode,
		ShareURL:      fmt.Sprintf("http://%s:%d/share/%s", lanIP, server.Port, server.Token),
		LocalURL:      fmt.Sprintf("http://127.0.0.1:%d/share/%s", server.Port, server.Token),
		HasPassword:   server.Password != "",
		ViewerCount:   viewerCount,
		MaxViewers:    server.MaxViewers,
		StartTime:     server.StartTime.Unix(),
		ExpireTime:    server.ExpireTime.Unix(),
		RemainingSecs: remSecs,
	}, nil
}

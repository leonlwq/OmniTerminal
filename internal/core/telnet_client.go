package core

import (
	"bytes"
	"fmt"
	"io"
	"net"
	"strconv"
	"sync"
	"time"
)

// Telnet 命令常量 (RFC 854)
const (
	IAC  = 255 // Interpret As Command
	DONT = 254
	DO   = 253
	WONT = 252
	WILL = 251
	SB   = 250 // Subnegotiation Begin
	SE   = 240 // Subnegotiation End

	// 常用 Telnet 选项 (Options)
	OPT_ECHO      = 1  // Echo
	OPT_SGA       = 3  // Suppress Go Ahead
	OPT_TERMTYPE  = 24 // Terminal Type
	OPT_NAWS      = 31 // Negotiate About Window Size
	OPT_LINEMODE  = 34 // Line Mode
	OPT_NEW_ENV   = 39 // New Environment
)

// TelnetClient 封装 Telnet 协议客户端
type TelnetClient struct {
	Conn       net.Conn
	TermType   string
	Cols       int
	Rows       int
	mu         sync.Mutex
	closed     bool
	subNegBuf  []byte
	inSubNeg   bool
}

// DialTelnet 建立 Telnet 连接并初始化客户端
func DialTelnet(host string, port int, termType string, cols, rows int, timeout time.Duration) (*TelnetClient, error) {
	if port <= 0 {
		port = 23 // 默认 Telnet 端口
	}
	if termType == "" {
		termType = "xterm-256color"
	}
	if cols <= 0 {
		cols = 80
	}
	if rows <= 0 {
		rows = 24
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	addr := net.JoinHostPort(host, strconv.Itoa(port))
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return nil, fmt.Errorf("Telnet 连接 %s 失败: %w", addr, err)
	}

	client := &TelnetClient{
		Conn:     conn,
		TermType: termType,
		Cols:     cols,
		Rows:     rows,
	}

	return client, nil
}

// Read 从 Telnet 连接读取数据并处理/剥离 IAC 命令
func (t *TelnetClient) Read(p []byte) (n int, err error) {
	for {
		buf := make([]byte, len(p))
		rawN, err := t.Conn.Read(buf)
		if err != nil {
			return 0, err
		}

		out := bytes.NewBuffer(make([]byte, 0, rawN))
		i := 0
		for i < rawN {
			b := buf[i]
			if t.inSubNeg {
				if b == IAC && i+1 < rawN && buf[i+1] == SE {
					// 子协商结束
					t.handleSubNegotiation(t.subNegBuf)
					t.subNegBuf = nil
					t.inSubNeg = false
					i += 2
					continue
				}
				t.subNegBuf = append(t.subNegBuf, b)
				i++
				continue
			}

			if b == IAC {
				if i+1 >= rawN {
					// 截断的 IAC，暂存或忽略
					break
				}
				cmd := buf[i+1]
				switch cmd {
				case IAC:
					// 转义的 255 字符
					out.WriteByte(IAC)
					i += 2
				case WILL:
					if i+2 < rawN {
						opt := buf[i+2]
						t.handleWill(opt)
						i += 3
					} else {
						i += 2
					}
				case WONT:
					if i+2 < rawN {
						opt := buf[i+2]
						t.handleWont(opt)
						i += 3
					} else {
						i += 2
					}
				case DO:
					if i+2 < rawN {
						opt := buf[i+2]
						t.handleDo(opt)
						i += 3
					} else {
						i += 2
					}
				case DONT:
					if i+2 < rawN {
						opt := buf[i+2]
						t.handleDont(opt)
						i += 3
					} else {
						i += 2
					}
				case SB:
					t.inSubNeg = true
					t.subNegBuf = make([]byte, 0, 32)
					i += 2
				default:
					// 其他控制命令 (如 NOP, AYT 等)
					i += 2
				}
			} else {
				out.WriteByte(b)
				i++
			}
		}

		if out.Len() > 0 {
			copied := copy(p, out.Bytes())
			return copied, nil
		}
	}
}

func (t *TelnetClient) handleDo(opt byte) {
	switch opt {
	case OPT_TERMTYPE:
		// 同意发送终端类型
		t.sendCmd(WILL, OPT_TERMTYPE)
	case OPT_NAWS:
		// 同意发送窗口大小
		t.sendCmd(WILL, OPT_NAWS)
		t.sendWindowSize(t.Cols, t.Rows)
	case OPT_SGA, OPT_ECHO:
		t.sendCmd(WILL, opt)
	default:
		// 拒绝未知选项
		t.sendCmd(WONT, opt)
	}
}

func (t *TelnetClient) handleDont(opt byte) {
	t.sendCmd(WONT, opt)
}

func (t *TelnetClient) handleWill(opt byte) {
	switch opt {
	case OPT_ECHO, OPT_SGA:
		t.sendCmd(DO, opt)
	default:
		t.sendCmd(DONT, opt)
	}
}

func (t *TelnetClient) handleWont(opt byte) {
	t.sendCmd(DONT, opt)
}

func (t *TelnetClient) handleSubNegotiation(data []byte) {
	if len(data) == 0 {
		return
	}
	opt := data[0]
	if opt == OPT_TERMTYPE && len(data) >= 2 && data[1] == 1 { // 1 = SEND
		// 回复 IAC SB TERMTYPE IS "xterm-256color" IAC SE
		resp := []byte{IAC, SB, OPT_TERMTYPE, 0} // 0 = IS
		resp = append(resp, []byte(t.TermType)...)
		resp = append(resp, IAC, SE)
		_, _ = t.Conn.Write(resp)
	}
}

func (t *TelnetClient) sendCmd(cmd, opt byte) {
	_, _ = t.Conn.Write([]byte{IAC, cmd, opt})
}

// sendWindowSize 发送 NAWS (RFC 1073) 窗口大小
func (t *TelnetClient) sendWindowSize(cols, rows int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.Cols = cols
	t.Rows = rows
	payload := []byte{
		IAC, SB, OPT_NAWS,
		byte(cols >> 8), byte(cols & 0xff),
		byte(rows >> 8), byte(rows & 0xff),
		IAC, SE,
	}
	_, _ = t.Conn.Write(payload)
}

// Resize 更改终端窗口尺寸
func (t *TelnetClient) Resize(cols, rows int) {
	t.sendWindowSize(cols, rows)
}

// Write 向 Telnet 连接写入数据
func (t *TelnetClient) Write(p []byte) (n int, err error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.Conn.Write(p)
}

// Close 关闭连接
func (t *TelnetClient) Close() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.closed {
		return nil
	}
	t.closed = true
	return t.Conn.Close()
}

// Ensure TelnetClient satisfies io.ReadWriteCloser
var _ io.ReadWriteCloser = (*TelnetClient)(nil)

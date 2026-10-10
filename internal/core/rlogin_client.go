package core

import (
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"strconv"
	"sync"
	"time"
)

// RloginClient 封装 RFC 1282 BSD Rlogin 协议客户端
type RloginClient struct {
	Conn       net.Conn
	ClientUser string
	ServerUser string
	TermType   string
	Cols       int
	Rows       int

	mu     sync.Mutex
	closed bool
}

// DialRlogin 建立 Rlogin TCP 连接并完成 RFC 1282 握手
func DialRlogin(host string, port int, clientUser, serverUser, termType string, cols, rows int, timeout time.Duration) (*RloginClient, error) {
	if port <= 0 {
		port = 513 // RFC 1282 标准 Rlogin 端口
	}
	if clientUser == "" {
		clientUser = "root"
	}
	if serverUser == "" {
		serverUser = clientUser
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
		return nil, fmt.Errorf("Rlogin 连接 %s 失败: %w", addr, err)
	}

	client := &RloginClient{
		Conn:       conn,
		ClientUser: clientUser,
		ServerUser: serverUser,
		TermType:   termType,
		Cols:       cols,
		Rows:       rows,
	}

	// 执行 RFC 1282 握手
	if err := client.handshake(timeout); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("Rlogin 握手失败: %w", err)
	}

	// 握手成功后发送初始终端窗口大小
	_ = client.Resize(cols, rows)

	return client, nil
}

// handshake 实现 RFC 1282 握手逻辑:
// 1. 发送 0x00
// 2. 发送 client_username + 0x00
// 3. 发送 server_username + 0x00
// 4. 发送 terminal_type/speed + 0x00
// 5. 等待接收服务端返回的 0x00 确认字节
func (r *RloginClient) handshake(timeout time.Duration) error {
	_ = r.Conn.SetDeadline(time.Now().Add(timeout))
	defer r.Conn.SetDeadline(time.Time{})

	// 组装握手包
	var pkt []byte
	pkt = append(pkt, 0)
	pkt = append(pkt, []byte(r.ClientUser)...)
	pkt = append(pkt, 0)
	pkt = append(pkt, []byte(r.ServerUser)...)
	pkt = append(pkt, 0)
	termAndSpeed := fmt.Sprintf("%s/38400", r.TermType)
	pkt = append(pkt, []byte(termAndSpeed)...)
	pkt = append(pkt, 0)

	if _, err := r.Conn.Write(pkt); err != nil {
		return fmt.Errorf("发送握手报文失败: %w", err)
	}

	// 接收确认字节
	ack := make([]byte, 1)
	if _, err := io.ReadFull(r.Conn, ack); err != nil {
		return fmt.Errorf("读取服务端握手确认失败: %w", err)
	}

	if ack[0] != 0 {
		// 服务端拒绝或发送错误信息
		errMsg := make([]byte, 256)
		n, _ := r.Conn.Read(errMsg)
		return fmt.Errorf("服务端拒绝连接 (代码 0x%02x): %s", ack[0], string(errMsg[:n]))
	}

	return nil
}

// Read 从底层 TCP 连接读取终端数据
func (r *RloginClient) Read(p []byte) (n int, err error) {
	return r.Conn.Read(p)
}

// Write 将用户输入的文字写入底层 TCP 连接
func (r *RloginClient) Write(p []byte) (n int, err error) {
	return r.Conn.Write(p)
}

// Resize 向服务端发送 RFC 1282 Out-of-band 窗口尺寸更新报文:
// 0xFF 0xFF 0x73 0x73 + rows(2B) + cols(2B) + xpixel(2B) + ypixel(2B)
func (r *RloginClient) Resize(cols, rows int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed || r.Conn == nil {
		return nil
	}

	r.Cols = cols
	r.Rows = rows

	buf := make([]byte, 12)
	buf[0] = 0xFF
	buf[1] = 0xFF
	buf[2] = 0x73 // 's'
	buf[3] = 0x73 // 's'
	binary.BigEndian.PutUint16(buf[4:6], uint16(rows))
	binary.BigEndian.PutUint16(buf[6:8], uint16(cols))
	binary.BigEndian.PutUint16(buf[8:10], 0) // xpixel
	binary.BigEndian.PutUint16(buf[10:12], 0) // ypixel

	_, err := r.Conn.Write(buf)
	return err
}

// Close 关闭 Rlogin 连接
func (r *RloginClient) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.closed {
		return nil
	}
	r.closed = true
	if r.Conn != nil {
		return r.Conn.Close()
	}
	return nil
}

// 确保 RloginClient 满足 io.ReadWriteCloser
var _ io.ReadWriteCloser = (*RloginClient)(nil)

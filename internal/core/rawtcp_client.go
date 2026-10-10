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

// RawTCPClient 原始 TCP Socket 客户端
type RawTCPClient struct {
	Conn       net.Conn
	LineEnding string // "CRLF", "CR", "LF", "NONE"
	mu         sync.Mutex
	closed     bool
}

// DialRawTCP 建立原始 TCP 连接
func DialRawTCP(host string, port int, lineEnding string, timeout time.Duration) (*RawTCPClient, error) {
	if port <= 0 {
		return nil, fmt.Errorf("无效的端口号: %d", port)
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	if lineEnding == "" {
		lineEnding = "CRLF"
	}

	addr := net.JoinHostPort(host, strconv.Itoa(port))
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return nil, fmt.Errorf("TCP 连接 %s 失败: %w", addr, err)
	}

	return &RawTCPClient{
		Conn:       conn,
		LineEnding: lineEnding,
	}, nil
}

func (r *RawTCPClient) Read(p []byte) (n int, err error) {
	return r.Conn.Read(p)
}

func (r *RawTCPClient) Write(p []byte) (n int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	data := p
	if r.LineEnding != "NONE" && bytes.Contains(p, []byte("\r")) || bytes.Contains(p, []byte("\n")) {
		// 规范化行结尾
		data = r.formatLineEndings(p)
	}

	return r.Conn.Write(data)
}

func (r *RawTCPClient) formatLineEndings(in []byte) []byte {
	// 先统一将 CRLF 和 CR 归一化为 LF
	normalized := bytes.ReplaceAll(in, []byte("\r\n"), []byte("\n"))
	normalized = bytes.ReplaceAll(normalized, []byte("\r"), []byte("\n"))

	switch r.LineEnding {
	case "CRLF":
		return bytes.ReplaceAll(normalized, []byte("\n"), []byte("\r\n"))
	case "CR":
		return bytes.ReplaceAll(normalized, []byte("\n"), []byte("\r"))
	case "LF":
		return normalized
	default:
		return in
	}
}

func (r *RawTCPClient) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return nil
	}
	r.closed = true
	return r.Conn.Close()
}

// Ensure RawTCPClient satisfies io.ReadWriteCloser
var _ io.ReadWriteCloser = (*RawTCPClient)(nil)

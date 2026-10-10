package core

import (
	"bytes"
	"net"
	"testing"
	"time"
)

// TestTelnetNegotiation 测试 Telnet IAC 协议协商状态机
func TestTelnetNegotiation(t *testing.T) {
	// 启动一个 mock Telnet server
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to listen: %v", err)
	}
	defer listener.Close()

	serverAddr := listener.Addr().String()

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()

		// Server 发送 DO TERMTYPE, DO NAWS, WILL ECHO
		conn.Write([]byte{IAC, DO, OPT_TERMTYPE, IAC, DO, OPT_NAWS, IAC, WILL, OPT_ECHO})
		
		// Server 发送子协商要求发送终端类型
		conn.Write([]byte{IAC, SB, OPT_TERMTYPE, 1, IAC, SE})

		// 发送一些测试文本
		conn.Write([]byte("Welcome to Mock Telnet Server!\r\n"))
	}()

	_, portStr, _ := net.SplitHostPort(serverAddr)
	var port int
	for _, c := range portStr {
		port = port*10 + int(c-'0')
	}

	client, err := DialTelnet("127.0.0.1", port, "xterm-256color", 100, 40, 2*time.Second)
	if err != nil {
		t.Fatalf("DialTelnet failed: %v", err)
	}
	defer client.Close()

	buf := make([]byte, 1024)
	n, err := client.Read(buf)
	if err != nil {
		t.Fatalf("Client read failed: %v", err)
	}

	output := string(buf[:n])
	if !bytes.Contains([]byte(output), []byte("Welcome to Mock Telnet Server!")) {
		t.Errorf("Expected welcome message, got: %q", output)
	}
}

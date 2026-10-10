package core

import (
	"bytes"
	"net"
	"testing"
	"time"
)

// TestRawTCPLineEnding 测试 Raw TCP 的各种换行符转换
func TestRawTCPLineEnding(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to listen: %v", err)
	}
	defer listener.Close()

	var receivedData []byte
	done := make(chan struct{})

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()

		buf := make([]byte, 1024)
		n, _ := conn.Read(buf)
		receivedData = make([]byte, n)
		copy(receivedData, buf[:n])
		close(done)
	}()

	_, portStr, _ := net.SplitHostPort(listener.Addr().String())
	var port int
	for _, c := range portStr {
		port = port*10 + int(c-'0')
	}

	client, err := DialRawTCP("127.0.0.1", port, "CRLF", 2*time.Second)
	if err != nil {
		t.Fatalf("DialRawTCP failed: %v", err)
	}
	defer client.Close()

	// 发送包含 LF 的文本，期望被格式化为 CRLF
	input := []byte("HELLO\nWORLD\n")
	_, err = client.Write(input)
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	select {
	case <-done:
		expected := []byte("HELLO\r\nWORLD\r\n")
		if !bytes.Equal(receivedData, expected) {
			t.Errorf("Expected %q, got %q", expected, receivedData)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Timeout waiting for server to receive data")
	}
}

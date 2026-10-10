package core

import (
	"bytes"
	"encoding/binary"
	"io"
	"net"
	"testing"
	"time"
)

// TestRloginHandshakeAndIO 测试 RFC 1282 Rlogin 协议三次握手、数据读写及窗口改变
func TestRloginHandshakeAndIO(t *testing.T) {
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

		// 读取客户端发送的握手报文: 0x00 + client_user + 0x00 + server_user + 0x00 + term/speed + 0x00
		handshakeBuf := make([]byte, 256)
		n, err := conn.Read(handshakeBuf)
		if err != nil {
			return
		}

		if n < 5 || handshakeBuf[0] != 0 {
			conn.Write([]byte{1}) // 拒绝
			return
		}

		// 发送握手成功确认 0x00
		conn.Write([]byte{0})

		// 检查是否有 initial window resize: 0xFF 0xFF 0x73 0x73
		resizeBuf := make([]byte, 12)
		if _, err := io.ReadFull(conn, resizeBuf); err == nil {
			if resizeBuf[0] == 0xFF && resizeBuf[1] == 0xFF && resizeBuf[2] == 0x73 && resizeBuf[3] == 0x73 {
				rows := binary.BigEndian.Uint16(resizeBuf[4:6])
				cols := binary.BigEndian.Uint16(resizeBuf[6:8])
				if rows != 30 || cols != 120 {
					t.Errorf("Expected resize 120x30, got cols=%d rows=%d", cols, rows)
				}
			}
		}

		// 发送欢迎消息
		conn.Write([]byte("OmniTerminal Rlogin Session Ready\r\n"))

		// 回显测试
		echoBuf := make([]byte, 64)
		en, err := conn.Read(echoBuf)
		if err == nil && en > 0 {
			conn.Write(append([]byte("ACK:"), echoBuf[:en]...))
		}
	}()

	_, portStr, _ := net.SplitHostPort(serverAddr)
	var port int
	for _, c := range portStr {
		port = port*10 + int(c-'0')
	}

	client, err := DialRlogin("127.0.0.1", port, "alice", "root", "xterm-256color", 120, 30, 2*time.Second)
	if err != nil {
		t.Fatalf("DialRlogin failed: %v", err)
	}
	defer client.Close()

	buf := make([]byte, 512)
	n, err := client.Read(buf)
	if err != nil {
		t.Fatalf("Client read failed: %v", err)
	}

	if !bytes.Contains(buf[:n], []byte("OmniTerminal Rlogin Session Ready")) {
		t.Errorf("Expected welcome message, got: %q", string(buf[:n]))
	}

	// 测试写入与回显
	testMsg := []byte("hello rlogin\n")
	if _, err := client.Write(testMsg); err != nil {
		t.Fatalf("Client write failed: %v", err)
	}

	n, err = client.Read(buf)
	if err != nil {
		t.Fatalf("Client read echo failed: %v", err)
	}
	if !bytes.Contains(buf[:n], []byte("ACK:hello rlogin\n")) {
		t.Errorf("Expected ACK echo, got: %q", string(buf[:n]))
	}

	// 测试 Resize
	if err := client.Resize(140, 45); err != nil {
		t.Errorf("Resize failed: %v", err)
	}
}

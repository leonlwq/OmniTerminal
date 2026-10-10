package core

import (
	"net"
	"testing"
	"time"
)

func TestProbeHost(t *testing.T) {
	// 启动一个本地临时 TCP listener 用于测试
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start test listener: %v", err)
	}
	defer listener.Close()

	port := listener.Addr().(*net.TCPAddr).Port

	// 1. 测试成功连接
	online, latency, err := ProbeHost("127.0.0.1", port, 1*time.Second)
	if err != nil || !online {
		t.Fatalf("Expected host to be online, got online=%v, err=%v", online, err)
	}
	if latency < 0 {
		t.Fatalf("Expected non-negative latency, got %d", latency)
	}

	// 2. 测试无效或未开放端口
	online, _, _ = ProbeHost("127.0.0.1", 59999, 100*time.Millisecond)
	if online {
		t.Fatalf("Expected closed port to be offline")
	}

	// 3. 测试空主机
	_, _, err = ProbeHost("", 22, 100*time.Millisecond)
	if err == nil {
		t.Fatalf("Expected error for empty host")
	}
}

func TestBatchProbeHosts(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to start test listener: %v", err)
	}
	defer listener.Close()

	port := listener.Addr().(*net.TCPAddr).Port

	targets := map[string]struct {
		Host string
		Port int
	}{
		"sess_1": {Host: "127.0.0.1", Port: port},
		"sess_2": {Host: "127.0.0.1", Port: 59998},
	}

	results := BatchProbeHosts(targets, 500*time.Millisecond)
	if len(results) != 2 {
		t.Fatalf("Expected 2 results, got %d", len(results))
	}

	if !results["sess_1"].Online {
		t.Fatalf("Expected sess_1 to be online")
	}
	if results["sess_2"].Online {
		t.Fatalf("Expected sess_2 to be offline")
	}
}

package core

import (
	"testing"
	"time"
)

func TestSSHConnectionPoolBasic(t *testing.T) {
	pool := NewSSHConnectionPool(10, 100*time.Millisecond)

	if pool == nil {
		t.Fatal("Expected non-nil pool")
	}

	stats := pool.GetStats()
	if len(stats) != 0 {
		t.Fatalf("Expected empty pool, got %d", len(stats))
	}

	pool.CloseAll()
}

func TestSSHConnectionPoolLimits(t *testing.T) {
	pool := NewSSHConnectionPool(2, 50*time.Millisecond)
	if pool.MaxSize != 2 {
		t.Errorf("Expected MaxSize 2, got %d", pool.MaxSize)
	}
	if pool.IdleTimeout != 50*time.Millisecond {
		t.Errorf("Expected IdleTimeout 50ms, got %v", pool.IdleTimeout)
	}
}

func TestSSHConnectionPoolChannelAccounting(t *testing.T) {
	pool := NewSSHConnectionPool(10, 100*time.Millisecond)
	key := "root@192.168.1.100:22"

	client := pool.SetPooledClient(key, "192.168.1.100", 22, "root", nil)
	if client == nil {
		t.Fatal("Expected non-nil pooled client")
	}

	// 初始状态
	if client.GetTotalChannels() != 1 { // RefCount = 1 兜底
		t.Errorf("Expected total channels 1, got %d", client.GetTotalChannels())
	}

	// 增加 PTY 通道
	pool.AddChannel(key, "pty")
	pool.AddChannel(key, "sftp")
	pool.AddChannel(key, "tunnel")

	breakdown := client.GetChannelsBreakdown()
	if breakdown["pty"] != 1 || breakdown["sftp"] != 1 || breakdown["tunnel"] != 1 {
		t.Errorf("Unexpected breakdown: %+v", breakdown)
	}
	if client.GetTotalChannels() != 3 {
		t.Errorf("Expected total channels 3, got %d", client.GetTotalChannels())
	}

	// 获取统计信息
	stats := pool.GetStats()
	if len(stats) != 1 {
		t.Fatalf("Expected 1 stat, got %d", len(stats))
	}
	if stats[0].ActiveChannelsCount != 3 {
		t.Errorf("Expected 3 active channels in stat, got %d", stats[0].ActiveChannelsCount)
	}

	// 移除一个通道
	pool.RemoveChannel(key, "tunnel")
	if client.GetTotalChannels() != 2 {
		t.Errorf("Expected total channels 2 after remove, got %d", client.GetTotalChannels())
	}
}


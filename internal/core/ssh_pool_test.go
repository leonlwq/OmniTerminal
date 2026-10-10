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

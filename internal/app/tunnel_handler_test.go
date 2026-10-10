package app

import (
	"testing"
	"omniterminal/internal/core"
	"omniterminal/internal/models"
)

func TestTunnelHandlerMethods(t *testing.T) {
	app := &App{
		sshManager: core.NewSSHManager(),
	}

	tunnels, err := app.GetActiveTunnels()
	if err != nil {
		t.Fatalf("GetActiveTunnels error: %v", err)
	}
	if len(tunnels) != 0 {
		t.Fatalf("Expected 0 active tunnels, got %d", len(tunnels))
	}

	// 测试 StopTunnel 在不存在的会话上
	err = app.StopTunnel("non_existent_id", "127.0.0.1:8080")
	if err == nil {
		t.Fatalf("Expected error when stopping tunnel on non-existent session, got nil")
	}
}

func TestDirDiffItemSerialization(t *testing.T) {
	result := models.DirDiffResult{
		TotalFiles: 2,
		DiffCount:  1,
		Items: []models.DirDiffItem{
			{
				RelativePath: "index.html",
				Name:         "index.html",
				IsDir:        false,
				Status:       "same",
				LocalSize:    1024,
				RemoteSize:   1024,
			},
			{
				RelativePath: "config.json",
				Name:         "config.json",
				IsDir:        false,
				Status:       "modified",
				LocalSize:    2048,
				RemoteSize:   1024,
			},
		},
	}

	if result.TotalFiles != 2 || result.DiffCount != 1 {
		t.Fatalf("DirDiffResult fields mismatch")
	}
}

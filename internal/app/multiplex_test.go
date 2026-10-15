package app

import (
	"testing"
	"time"

	"omniterminal/internal/core"
)

func TestGetSessionMultiplexInfoNonExisting(t *testing.T) {
	app := NewApp()
	_, err := app.GetSessionMultiplexInfo("non-existing-session-id")
	if err == nil {
		t.Fatal("Expected error for non-existing session, got nil")
	}
}

func TestGetSessionMultiplexInfoLocal(t *testing.T) {
	app := NewApp()
	sessionId := "test-local-sess-001"

	// 注册一个模拟本地会话
	app.sshManager.Mu.Lock()
	app.sshManager.Sessions[sessionId] = &core.SessionInfo{
		ID:          sessionId,
		Name:        "Local Terminal",
		Protocol:    "local",
		IsLocal:     true,
		ConnectedAt: time.Now(),
	}
	app.sshManager.Mu.Unlock()

	info, err := app.GetSessionMultiplexInfo(sessionId)
	if err != nil {
		t.Fatalf("Unexpected error for local session: %v", err)
	}

	if info.SessionID != sessionId {
		t.Errorf("Expected sessionId %s, got %s", sessionId, info.SessionID)
	}
	if info.ActiveChannelsCount != 1 {
		t.Errorf("Expected active channels 1, got %d", info.ActiveChannelsCount)
	}
	if len(info.ChannelDetails) != 1 || info.ChannelDetails[0].Type != "pty" {
		t.Errorf("Expected 1 PTY channel detail, got %+v", info.ChannelDetails)
	}
}

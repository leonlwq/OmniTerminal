package core

import (
	"context"
	"testing"
	"omniterminal/internal/models"
)

func TestNewSSHManager(t *testing.T) {
	manager := NewSSHManager()
	if manager == nil {
		t.Fatalf("Expected SSHManager, got nil")
	}
	if manager.Sessions == nil {
		t.Errorf("Expected Sessions map to be initialized")
	}
}

func TestSetContext(t *testing.T) {
	manager := NewSSHManager()
	ctx := context.Background()
	manager.SetContext(ctx)

	if manager.Ctx != ctx {
		t.Errorf("Expected Context to be set")
	}
}

func TestConnectInvalidHost(t *testing.T) {
	manager := NewSSHManager()
	manager.SetContext(context.Background())

	err := manager.Connect(
		"test_id",
		"Test Session",
		"invalid.host.local",
		22,
		"user",
		"password",
		"",
		80,
		24,
		[]models.ExpectInteractive{},
		"",
		0,
		models.LogConfig{},
		[]models.SSHTunnel{},
		"utf-8",
		"",
		22,
		"",
		"",
		"",
		"xterm-256color",
		false,
		"none",
		"",
		0,
		"",
		"",
		[]string{}, // ciphers
		[]string{}, // macs
		"shell",    // sessionMode
		false,      // enableAgentForwarding
		false,      // enableX11Forwarding
		"",         // x11Display
		[]models.TriggerRule{},
	)

	if err == nil {
		t.Errorf("Expected connection to invalid host to fail")
	}
}

func TestDetectSystemLocale(t *testing.T) {
	loc := detectSystemLocale()
	if loc == "" {
		t.Errorf("Expected non-empty system locale")
	}
}

func TestGetLocalShellEnv(t *testing.T) {
	env := getLocalShellEnv("utf-8")
	var hasLang, hasTerm, hasColorterm bool
	for _, e := range env {
		if e == "TERM=xterm-256color" {
			hasTerm = true
		}
		if e == "COLORTERM=truecolor" {
			hasColorterm = true
		}
		if len(e) >= 5 && e[:5] == "LANG=" {
			hasLang = true
		}
	}
	if !hasTerm {
		t.Errorf("Expected TERM=xterm-256color in env")
	}
	if !hasColorterm {
		t.Errorf("Expected COLORTERM=truecolor in env")
	}
	if !hasLang {
		t.Errorf("Expected LANG to be set in env")
	}
}



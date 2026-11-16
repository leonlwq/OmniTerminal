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
		t.Fatalf("Expected non-empty system locale")
	}
	if !isValidSystemLocale(loc) {
		t.Errorf("Expected detectSystemLocale() to return a valid system locale, got %q", loc)
	}

	// 验证 macOS 混合地区标识 (如 en_CN, zh-Hans-CN, 裸 UTF-8) 能够正确归一化为真实存在的有效 UTF-8 locale
	if got := resolveValidUTF8Locale("en_CN"); got != "en_US.UTF-8" {
		t.Errorf("Expected resolveValidUTF8Locale(\"en_CN\") = \"en_US.UTF-8\", got %q", got)
	}
	if got := resolveValidUTF8Locale("zh-Hans-CN"); got != "zh_CN.UTF-8" {
		t.Errorf("Expected resolveValidUTF8Locale(\"zh-Hans-CN\") = \"zh_CN.UTF-8\", got %q", got)
	}
	if got := resolveValidUTF8Locale("UTF-8"); got != "" {
		t.Errorf("Expected resolveValidUTF8Locale(\"UTF-8\") = \"\", got %q", got)
	}
}

func TestGetLocalShellEnv(t *testing.T) {
	env := getLocalShellEnv("utf-8")
	var hasLang, hasTerm, hasColorterm bool
	var langVal string
	for _, e := range env {
		if e == "TERM=xterm-256color" {
			hasTerm = true
		}
		if e == "COLORTERM=truecolor" {
			hasColorterm = true
		}
		if len(e) >= 5 && e[:5] == "LANG=" {
			hasLang = true
			langVal = e[5:]
		}
		if len(e) >= 7 && e[:7] == "LC_ALL=" {
			t.Errorf("Expected LC_ALL not to be forcibly injected in default UTF-8 mode, got %s", e)
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
	if !isValidSystemLocale(langVal) {
		t.Errorf("Expected LANG=%q to be a valid system locale", langVal)
	}
}



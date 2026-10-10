package app

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExportToSSHConfig(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "omniterminal_ssh_config_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	app := &App{
		isUnlocked: true,
	}

	configDir := filepath.Join(tmpDir, ".omniterminal")
	_ = os.MkdirAll(configDir, 0755)

	sshConfig, err := app.ExportToSSHConfig()
	if err != nil {
		t.Fatalf("ExportToSSHConfig failed: %v", err)
	}
	if !strings.Contains(sshConfig, "OmniTerminal Exported OpenSSH Configuration") {
		t.Errorf("expected header in sshConfig, got %s", sshConfig)
	}
}

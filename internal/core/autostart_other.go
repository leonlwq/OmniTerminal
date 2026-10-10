//go:build !darwin && !windows

package core

import (
	"fmt"
	"os"
	"path/filepath"
)

type linuxAutoStart struct{}

func newAutoStartPlatform() autoStartImpl {
	return &linuxAutoStart{}
}

func (l *linuxAutoStart) getDesktopPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".config", "autostart", "omniterminal.desktop")
}

func (l *linuxAutoStart) isEnabled() bool {
	path := l.getDesktopPath()
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

func (l *linuxAutoStart) enable() error {
	path := l.getDesktopPath()
	if path == "" {
		return fmt.Errorf("无法获取 autostart 路径")
	}

	execPath, err := os.Executable()
	if err != nil {
		return err
	}

	_ = os.MkdirAll(filepath.Dir(path), 0755)

	content := fmt.Sprintf(`[Desktop Entry]
Type=Application
Version=1.0
Name=OmniTerminal
Comment=Modern SSH/SFTP Client
Exec=%s
StartupNotify=false
Terminal=false
`, execPath)

	return os.WriteFile(path, []byte(content), 0644)
}

func (l *linuxAutoStart) disable() error {
	path := l.getDesktopPath()
	if path == "" {
		return nil
	}
	_ = os.Remove(path)
	return nil
}

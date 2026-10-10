//go:build darwin

package core

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const darwinLaunchAgentLabel = "com.omniterminal.app"

type darwinAutoStart struct{}

func newAutoStartPlatform() autoStartImpl {
	return &darwinAutoStart{}
}

func (d *darwinAutoStart) getPlistPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, "Library", "LaunchAgents", darwinLaunchAgentLabel+".plist")
}

func (d *darwinAutoStart) isEnabled() bool {
	path := d.getPlistPath()
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

func (d *darwinAutoStart) getExecutablePath() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", err
	}
	evalPath, err := filepath.EvalSymlinks(execPath)
	if err == nil {
		execPath = evalPath
	}
	return execPath, nil
}

func (d *darwinAutoStart) enable() error {
	plistPath := d.getPlistPath()
	if plistPath == "" {
		return fmt.Errorf("无法定位 LaunchAgents 目录")
	}

	execPath, err := d.getExecutablePath()
	if err != nil {
		return err
	}

	dir := filepath.Dir(plistPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	var programArgs string
	if strings.Contains(execPath, ".app/Contents/MacOS/") {
		idx := strings.Index(execPath, ".app/Contents/MacOS/")
		appBundle := execPath[:idx+4]
		programArgs = fmt.Sprintf("\t\t<string>/usr/bin/open</string>\n\t\t<string>-a</string>\n\t\t<string>%s</string>", appBundle)
	} else {
		programArgs = fmt.Sprintf("\t\t<string>%s</string>", execPath)
	}

	content := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>%s</string>
	<key>ProgramArguments</key>
	<array>
%s
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>ProcessType</key>
	<string>Interactive</string>
</dict>
</plist>
`, darwinLaunchAgentLabel, programArgs)

	return os.WriteFile(plistPath, []byte(content), 0644)
}

func (d *darwinAutoStart) disable() error {
	plistPath := d.getPlistPath()
	if plistPath == "" {
		return nil
	}
	_ = os.Remove(plistPath)
	return nil
}

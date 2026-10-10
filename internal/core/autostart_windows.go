//go:build windows

package core

import (
	"os"
	"path/filepath"

	"golang.org/x/sys/windows/registry"
)

const winRunKey = `Software\Microsoft\Windows\CurrentVersion\Run`
const winAppName = `OmniTerminal`

type windowsAutoStart struct{}

func newAutoStartPlatform() autoStartImpl {
	return &windowsAutoStart{}
}

func (w *windowsAutoStart) isEnabled() bool {
	k, err := registry.OpenKey(registry.CURRENT_USER, winRunKey, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer k.Close()

	val, _, err := k.GetStringValue(winAppName)
	return err == nil && val != ""
}

func (w *windowsAutoStart) enable() error {
	execPath, err := os.Executable()
	if err != nil {
		return err
	}
	evalPath, err := filepath.EvalSymlinks(execPath)
	if err == nil {
		execPath = evalPath
	}

	k, _, err := registry.CreateKey(registry.CURRENT_USER, winRunKey, registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer k.Close()

	return k.SetStringValue(winAppName, `"`+execPath+`"`)
}

func (w *windowsAutoStart) disable() error {
	k, err := registry.OpenKey(registry.CURRENT_USER, winRunKey, registry.SET_VALUE)
	if err != nil {
		return nil
	}
	defer k.Close()

	_ = k.DeleteValue(winAppName)
	return nil
}

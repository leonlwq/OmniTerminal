package app

import (
	"testing"

	"omniterminal/internal/config"
	"omniterminal/internal/core"
)

func TestGetAppVersion(t *testing.T) {
	app := &App{
		updateManager: core.NewUpdateManager(),
	}

	ver := app.GetAppVersion()
	if ver != config.AppVersion {
		t.Errorf("GetAppVersion() = %s, expected %s", ver, config.AppVersion)
	}
}

func TestCheckAppUpdateUninitialized(t *testing.T) {
	app := &App{}
	_, err := app.CheckAppUpdate()
	if err == nil {
		t.Errorf("expected error when updateManager is nil")
	}
}

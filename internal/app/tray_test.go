package app

import (
	"testing"
)

func TestOSIntegrationSettings(t *testing.T) {
	app := NewApp()

	settings, err := app.GetSettings()
	if err != nil {
		t.Fatalf("Failed to get settings: %v", err)
	}

	if settings.QuakeHeightPercent <= 0 {
		t.Errorf("Expected QuakeHeightPercent to be greater than 0, got %d", settings.QuakeHeightPercent)
	}

	// 测试修改并保存
	settings.MinimizeToTrayOnClose = true
	settings.EnableQuakeMode = true
	settings.QuakeHotkey = "F12"
	settings.QuakeHeightPercent = 60

	err = app.SaveSettings(settings)
	if err != nil {
		t.Fatalf("Failed to save settings: %v", err)
	}

	reloaded, err := app.GetSettings()
	if err != nil {
		t.Fatalf("Failed to reload settings: %v", err)
	}

	if !reloaded.MinimizeToTrayOnClose || !reloaded.EnableQuakeMode || reloaded.QuakeHotkey != "F12" || reloaded.QuakeHeightPercent != 60 {
		t.Errorf("Settings mismatch after reload: %+v", reloaded)
	}
}

func TestDisconnectAllSessionsNilSafety(t *testing.T) {
	app := NewApp()
	err := app.DisconnectAllSessions()
	if err != nil {
		t.Fatalf("DisconnectAllSessions failed: %v", err)
	}
}

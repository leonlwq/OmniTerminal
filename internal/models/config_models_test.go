package models

import (
	"encoding/json"
	"testing"
)



func TestAppSettingsJSON(t *testing.T) {
	settings := AppSettings{
		ThemeName: "dracula",
		FontSize:  14,
		StatusBarConfig: StatusBarConfig{
			ShowConnectionState: true,
		},
	}

	bytes, err := json.Marshal(settings)
	if err != nil {
		t.Fatalf("Failed to marshal AppSettings: %v", err)
	}

	var decoded AppSettings
	err = json.Unmarshal(bytes, &decoded)
	if err != nil {
		t.Fatalf("Failed to unmarshal AppSettings: %v", err)
	}

	if decoded.ThemeName != settings.ThemeName || decoded.FontSize != settings.FontSize || decoded.StatusBarConfig.ShowConnectionState != settings.StatusBarConfig.ShowConnectionState {
		t.Errorf("Decoded settings does not match original: %+v", decoded)
	}
}

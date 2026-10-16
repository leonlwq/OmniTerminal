package core

import (
	"testing"
)

func TestIsNewerVersion(t *testing.T) {
	tests := []struct {
		latest   string
		current  string
		expected bool
	}{
		{"v1.0.1", "v1.0.0", true},
		{"v1.0.0", "v1.0.0", false},
		{"v1.0.0", "v1.0.1", false},
		{"v1.1.0", "v1.0.9", true},
		{"v2.0.0", "v1.99.99", true},
		{"1.0.2", "v1.0.1", true},
		{"v1.0.10", "v1.0.9", true},
		{"v1.0.9", "v1.0.10", false},
	}

	for _, tt := range tests {
		got := isNewerVersion(tt.latest, tt.current)
		if got != tt.expected {
			t.Errorf("isNewerVersion(%q, %q) = %v, expected %v", tt.latest, tt.current, got, tt.expected)
		}
	}
}

func TestMatchTargetAsset(t *testing.T) {
	assets := []githubAsset{
		{Name: "OmniTerminal-linux-amd64.tar.gz", BrowserDownloadURL: "https://example.com/linux"},
		{Name: "OmniTerminal-macos-arm64.dmg", BrowserDownloadURL: "https://example.com/dmg-arm64"},
		{Name: "OmniTerminal-macos-arm64.zip", BrowserDownloadURL: "https://example.com/zip-arm64"},
		{Name: "OmniTerminal-macos-intel.dmg", BrowserDownloadURL: "https://example.com/dmg-intel"},
		{Name: "OmniTerminal-macos-intel.zip", BrowserDownloadURL: "https://example.com/zip-intel"},
		{Name: "OmniTerminal-windows-amd64.zip", BrowserDownloadURL: "https://example.com/win-amd64"},
		{Name: "OmniTerminal-windows-arm64.zip", BrowserDownloadURL: "https://example.com/win-arm64"},
	}

	// Darwin ARM64 should prefer zip
	m1 := matchTargetAsset(assets, "darwin", "arm64")
	if m1 == nil || m1.Name != "OmniTerminal-macos-arm64.zip" {
		t.Fatalf("expected macos-arm64.zip, got %+v", m1)
	}

	// Darwin Intel should prefer zip
	m2 := matchTargetAsset(assets, "darwin", "amd64")
	if m2 == nil || m2.Name != "OmniTerminal-macos-intel.zip" {
		t.Fatalf("expected macos-intel.zip, got %+v", m2)
	}

	// Windows AMD64
	m3 := matchTargetAsset(assets, "windows", "amd64")
	if m3 == nil || m3.Name != "OmniTerminal-windows-amd64.zip" {
		t.Fatalf("expected windows-amd64.zip, got %+v", m3)
	}

	// Linux AMD64
	m4 := matchTargetAsset(assets, "linux", "amd64")
	if m4 == nil || m4.Name != "OmniTerminal-linux-amd64.tar.gz" {
		t.Fatalf("expected linux-amd64.tar.gz, got %+v", m4)
	}
}

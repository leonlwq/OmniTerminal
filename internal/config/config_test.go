package config

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestGetConfigDir(t *testing.T) {
	dir := GetConfigDir()
	if dir == "" {
		t.Fatalf("expected non-empty config dir")
	}
	if filepath.Base(dir) != DirName {
		t.Fatalf("expected base name %s, got %s", DirName, filepath.Base(dir))
	}
	if info, err := os.Stat(dir); err != nil || !info.IsDir() {
		t.Fatalf("expected config dir to exist on disk as a directory")
	}

	sessionsPath := GetFilePath("sessions.json")
	if filepath.Base(sessionsPath) != "sessions.json" {
		t.Fatalf("expected sessions.json path, got %s", sessionsPath)
	}

	logsDir := GetSubDir("logs")
	if filepath.Base(logsDir) != "logs" {
		t.Fatalf("expected logs sub dir, got %s", logsDir)
	}
	if _, err := os.Stat(logsDir); os.IsNotExist(err) {
		t.Fatalf("expected logs dir to exist on disk")
	}
}

func TestAutoCreateConfigDirOnStartup(t *testing.T) {
	fakeHome := t.TempDir()
	origHome := os.Getenv("HOME")
	os.Setenv("HOME", fakeHome)
	defer os.Setenv("HOME", origHome)

	targetConfigDir := filepath.Join(fakeHome, DirName)
	// Confirm does not exist initially
	if _, err := os.Stat(targetConfigDir); !os.IsNotExist(err) {
		t.Fatalf("target config dir should not exist initially")
	}

	// Calling GetConfigDir() should automatically create it
	dir := GetConfigDir()
	if dir != targetConfigDir {
		t.Fatalf("expected %s, got %s", targetConfigDir, dir)
	}

	info, err := os.Stat(targetConfigDir)
	if err != nil || !info.IsDir() {
		t.Fatalf("target config dir was not auto-created on startup")
	}

	// Calling GetSubDir() should automatically create the subdirectory
	subDir := GetSubDir("cache")
	infoSub, err := os.Stat(subDir)
	if err != nil || !infoSub.IsDir() {
		t.Fatalf("cache sub directory was not auto-created")
	}
}

func TestCleanLegacyFiles(t *testing.T) {
	tmpDir := t.TempDir()
	legacyFile := filepath.Join(tmpDir, "local_shell_debug.log")
	_ = os.WriteFile(legacyFile, []byte("large debug log content"), 0644)

	cleanupOnce = sync.Once{}
	cleanLegacyFiles(tmpDir)

	if _, err := os.Stat(legacyFile); !os.IsNotExist(err) {
		t.Fatalf("expected legacy debug log to be removed")
	}
}

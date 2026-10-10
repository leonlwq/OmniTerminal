package core

import (
	"testing"
)

func TestSCPClientNilSafety(t *testing.T) {
	client := NewSCPClient(nil)
	err := client.Upload("/tmp/dummy", "/tmp", nil)
	if err == nil {
		t.Error("Expected error when uploading with nil SSH client, got nil")
	}

	err = client.Download("/tmp/dummy", "/tmp", nil)
	if err == nil {
		t.Error("Expected error when downloading with nil SSH client, got nil")
	}
}

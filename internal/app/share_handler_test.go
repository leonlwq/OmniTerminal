package app

import (
	"net"
	"testing"
)

func TestShareHandler(t *testing.T) {
	app := NewApp()

	// Test LAN IP detection
	ip := getLocalLANIP()
	if ip == "" {
		t.Fatal("Expected non-empty LAN IP")
	}
	if parsed := net.ParseIP(ip); parsed == nil {
		t.Fatalf("Invalid IP returned: %s", ip)
	}

	// Test status of non-existent session
	status, err := app.GetShareSessionStatus("non-existent-session-id")
	if err != nil {
		t.Fatalf("GetShareSessionStatus failed: %v", err)
	}
	if status.IsSharing {
		t.Fatal("Expected IsSharing to be false")
	}

	// Test StartShareSession fails on non-connected session
	_, err = app.StartShareSession("non-existent-session-id", "readonly", "", 5, 30)
	if err == nil {
		t.Fatal("Expected error when starting share on non-connected session")
	}

	// Test StopShareSession safe when not active
	err = app.StopShareSession("non-existent-session-id")
	if err != nil {
		t.Fatalf("StopShareSession failed: %v", err)
	}
}

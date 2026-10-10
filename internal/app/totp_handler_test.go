package app

import (
	"os"
	"testing"
)

func TestTOTPHandler(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "omni_totp_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	app := NewApp()

	// Base32 secret for "Hello!" is "JBSWY3DPEHPK3PXP"
	secret := "JBSWY3DPEHPK3PXP"
	entry, err := app.AddTOTPEntry("Test Bastion", secret, "BastionHost", "admin", "SHA1", 6, 30)
	if err != nil {
		t.Fatalf("AddTOTPEntry failed: %v", err)
	}

	if entry.ID == "" {
		t.Fatal("Expected non-empty entry ID")
	}

	entries, err := app.ListTOTPEntries()
	if err != nil {
		t.Fatalf("ListTOTPEntries failed: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("Expected 1 entry, got %d", len(entries))
	}
	if entries[0].SecretEnc != "******" {
		t.Fatalf("Expected masked secret, got %s", entries[0].SecretEnc)
	}

	// Generate code
	codeRes, err := app.GenerateTOTPCode(entry.ID)
	if err != nil {
		t.Fatalf("GenerateTOTPCode failed: %v", err)
	}
	if len(codeRes.Code) != 6 {
		t.Fatalf("Expected 6-digit code, got %s", codeRes.Code)
	}
	if codeRes.RemainingSecs < 1 || codeRes.RemainingSecs > 30 {
		t.Fatalf("Invalid remaining seconds: %d", codeRes.RemainingSecs)
	}

	// Test URI import
	uri := "otpauth://totp/ACME:dev@acme.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME&algorithm=SHA1&digits=6&period=30"
	imported, err := app.ImportTOTPFromURI(uri)
	if err != nil {
		t.Fatalf("ImportTOTPFromURI failed: %v", err)
	}
	if imported.Issuer != "ACME" {
		t.Fatalf("Expected issuer ACME, got %s", imported.Issuer)
	}

	allEntries, _ := app.ListTOTPEntries()
	if len(allEntries) != 2 {
		t.Fatalf("Expected 2 entries, got %d", len(allEntries))
	}

	// Delete entry
	err = app.DeleteTOTPEntry(entry.ID)
	if err != nil {
		t.Fatalf("DeleteTOTPEntry failed: %v", err)
	}
	afterDel, _ := app.ListTOTPEntries()
	if len(afterDel) != 1 {
		t.Fatalf("Expected 1 entry after delete, got %d", len(afterDel))
	}
}

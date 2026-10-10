package app

import (
	"strings"
	"testing"

	"omniterminal/internal/models"
)

func TestEncryptDecryptSyncPayload(t *testing.T) {
	original := []byte(`{"test": "hello omniterminal sync", "value": 12345}`)
	passphrase := "SecretMasterPass123!@#"

	encrypted, err := encryptSyncPayload(original, passphrase)
	if err != nil {
		t.Fatalf("encryptSyncPayload failed: %v", err)
	}

	if len(encrypted) <= len(original) {
		t.Errorf("encrypted length should be larger than original")
	}

	// 尝试用错误密码解密
	_, err = decryptSyncPayload(encrypted, "WrongPassword")
	if err == nil {
		t.Errorf("expected error with wrong password, got nil")
	}

	// 正确密码解密
	decrypted, err := decryptSyncPayload(encrypted, passphrase)
	if err != nil {
		t.Fatalf("decryptSyncPayload failed: %v", err)
	}

	if string(decrypted) != string(original) {
		t.Errorf("decrypted content %q != original %q", string(decrypted), string(original))
	}
}

func TestGistSyncValidation(t *testing.T) {
	// 验证空 Token 校验
	cfg := models.CloudSyncConfig{
		Provider:  "github_gist",
		GistToken: "",
	}
	err := pushToGist(&cfg, []byte("test"))
	if err == nil || !strings.Contains(err.Error(), "Gist Token") {
		t.Fatalf("expected error for empty gist token, got: %v", err)
	}

	_, err = pullFromGist(cfg)
	if err == nil || !strings.Contains(err.Error(), "Gist ID") {
		t.Fatalf("expected error for empty gist id, got: %v", err)
	}
}

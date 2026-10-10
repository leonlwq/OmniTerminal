package crypto

import (
	"bytes"
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef") // 32 bytes for AES-256
	plaintext := "Hello, OmniTerminal!"

	encrypted, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Failed to encrypt: %v", err)
	}

	if encrypted == plaintext {
		t.Errorf("Encrypted text should not equal plaintext")
	}

	decrypted, err := Decrypt(encrypted, key)
	if err != nil {
		t.Fatalf("Failed to decrypt: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("Expected decrypted text '%s', got '%s'", plaintext, decrypted)
	}
}

func TestDeriveKey(t *testing.T) {
	password := "master_password"
	salt := []byte("random_salt")

	key1 := DeriveKey(password, salt)
	key2 := DeriveKey(password, salt)

	if !bytes.Equal(key1, key2) {
		t.Errorf("Derived keys for same password and salt should be identical")
	}

	key3 := DeriveKey("different_password", salt)
	if bytes.Equal(key1, key3) {
		t.Errorf("Derived keys for different passwords should not be identical")
	}
}

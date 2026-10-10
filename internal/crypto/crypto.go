package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/pbkdf2"
)

// 密钥派生 (PBKDF2)
func DeriveKey(password string, salt []byte) []byte {
	return pbkdf2.Key([]byte(password), salt, 10000, 32, sha256.New)
}

// 对称加密 (AES-256-GCM)
func Encrypt(plainText string, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	cipherText := gcm.Seal(nonce, nonce, []byte(plainText), nil)
	return hex.EncodeToString(cipherText), nil
}

// 对称解密 (AES-256-GCM)
func Decrypt(cipherTextHex string, key []byte) (string, error) {
	data, err := hex.DecodeString(cipherTextHex)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("密文损坏")
	}
	nonce, cipherText := data[:nonceSize], data[nonceSize:]
	plainText, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return "", err
	}
	return string(plainText), nil
}

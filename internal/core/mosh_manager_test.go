package core

import (
	"testing"
)

// TestParseMoshConnectOutput 测试对 mosh-server 握手报文的提取与校验
func TestParseMoshConnectOutput(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		wantPort    int
		wantKey     string
		expectError bool
	}{
		{
			name:        "Standard single line",
			input:       "MOSH CONNECT 60001 7uY2eL5m6kP9/xQ=",
			wantPort:    60001,
			wantKey:     "7uY2eL5m6kP9/xQ=",
			expectError: false,
		},
		{
			name:        "Surrounded by banner and logging lines",
			input:       "\r\nmosh-server (mosh 1.4.0) [build date...]\r\nMOSH CONNECT 60025 zA349XkmwELR+mK8A==\r\nConnection established.\r\n",
			wantPort:    60025,
			wantKey:     "zA349XkmwELR+mK8A==",
			expectError: false,
		},
		{
			name:        "Multiple spaces between tokens",
			input:       "MOSH   CONNECT   60100   AbCdEf12345==",
			wantPort:    60100,
			wantKey:     "AbCdEf12345==",
			expectError: false,
		},
		{
			name:        "Missing key or corrupted line",
			input:       "mosh-server: command not found",
			wantPort:    0,
			wantKey:     "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			port, key, err := ParseMoshConnectOutput(tt.input)
			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error for input %q, but got nil (port=%d key=%s)", tt.input, port, key)
				}
			} else {
				if err != nil {
					t.Fatalf("Unexpected error: %v", err)
				}
				if port != tt.wantPort {
					t.Errorf("port mismatch: got %d, want %d", port, tt.wantPort)
				}
				if key != tt.wantKey {
					t.Errorf("key mismatch: got %s, want %s", key, tt.wantKey)
				}
			}
		})
	}
}

// TestFindMoshClient 测试本地 Mosh 探测安全无 panic
func TestFindMoshClient(t *testing.T) {
	clientPath := FindMoshClient()
	t.Logf("FindMoshClient detected path: %q", clientPath)
	// Even if not installed on CI, it should return safely
}

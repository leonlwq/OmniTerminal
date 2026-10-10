package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"omniterminal/internal/models"
)

func TestEvaluateCommandRisk(t *testing.T) {
	tests := []struct {
		cmd      string
		expected string
	}{
		{"ls -la", "safe"},
		{"df -h", "safe"},
		{"rm -rf /var/log/app", "caution"},
		{"kill -9 1234", "caution"},
		{"rm -rf /", "danger"},
		{"mkfs.ext4 /dev/sdb", "danger"},
		{"dd if=/dev/zero of=/dev/sda", "danger"},
		{"reboot", "danger"},
	}

	for _, tt := range tests {
		got := evaluateCommandRisk(tt.cmd)
		if got != tt.expected {
			t.Errorf("evaluateCommandRisk(%q) = %v; want %v", tt.cmd, got, tt.expected)
		}
	}
}

func TestExtractCommandFromText(t *testing.T) {
	raw := "Here is the command you need:\n```bash\nfind . -type f -size +100M\n```\nExplanation:\n- `find`: search tool\n- `-size +100M`: files larger than 100MB"
	cmd, explanation := extractCommandFromText(raw)

	if cmd != "find . -type f -size +100M" {
		t.Errorf("unexpected extracted cmd: %q", cmd)
	}
	if explanation == "" {
		t.Errorf("expected explanation to be non-empty")
	}
}

func TestAIGenerateCommandMock(t *testing.T) {
	// 启动 Mock HTTP 服务器
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		resp := openAIChatResponse{
			ID: "chatcmpl-test",
			Choices: []openAIChatChoice{
				{
					Index: 0,
					Message: struct {
						Role    string `json:"role"`
						Content string `json:"content"`
					}{
						Role:    "assistant",
						Content: "```bash\ntar -czvf archive.tar.gz /var/log\n```\n- `-c`: create\n- `-z`: gzip",
					},
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer mockServer.Close()

	app := NewApp()
	cfg := models.AIConfig{
		Provider: "custom",
		BaseURL:  mockServer.URL,
		ApiKey:   "test-key",
		Model:    "test-model",
	}

	res, err := app.AIGenerateCommand(cfg, "compress /var/log to archive.tar.gz", "/root", "Linux")
	if err != nil {
		t.Fatalf("AIGenerateCommand failed: %v", err)
	}

	if res.Command != "tar -czvf archive.tar.gz /var/log" {
		t.Errorf("unexpected command: %q", res.Command)
	}
	if res.RiskLevel != "safe" {
		t.Errorf("expected safe risk, got %q", res.RiskLevel)
	}
}

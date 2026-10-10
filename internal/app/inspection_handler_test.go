package app

import (
	"os"
	"strings"
	"testing"
)

func TestInspectionHandler(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "omni_insp_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	origHome := os.Getenv("HOME")
	os.Setenv("HOME", tmpDir)
	defer os.Setenv("HOME", origHome)

	app := NewApp()

	// 1. Templates
	templates := app.GetInspectionTemplates()
	if len(templates) < 5 {
		t.Fatalf("Expected at least 5 templates, got %d", len(templates))
	}

	// 2. Anomaly detection algorithm testing
	// Disk anomaly
	diskOutputNormal := "Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/sda1      102400000  40000000  62400000  39% /"
	hasIssue, _ := analyzeCheckIssue("disk", "df -h", diskOutputNormal, 0)
	if hasIssue {
		t.Errorf("Expected normal disk output, got issue")
	}

	diskOutputWarning := "Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/sda1      102400000  92000000  10400000  90% /"
	hasIssue, detail := analyzeCheckIssue("disk", "df -h", diskOutputWarning, 0)
	if !hasIssue || !strings.Contains(detail, "90%") {
		t.Errorf("Expected disk issue >= 85%%, got hasIssue=%v, detail=%s", hasIssue, detail)
	}

	// Services anomaly
	srvOutputFailed := "● nginx.service loaded failed failed A high performance web server"
	hasIssue, _ = analyzeCheckIssue("services", "systemctl", srvOutputFailed, 0)
	if !hasIssue {
		t.Errorf("Expected services issue on failed unit")
	}

	// Kernel anomaly
	kernelOutputOOM := "[12345.67] Out of memory: Killed process 1234 (python3) total-vm:4096000kB, anon-rss:2048000kB, file-rss:0kB"
	hasIssue, detail = analyzeCheckIssue("kernel", "dmesg", kernelOutputOOM, 0)
	if !hasIssue || !strings.Contains(detail, "OOM") {
		t.Errorf("Expected kernel OOM issue, got hasIssue=%v, detail=%s", hasIssue, detail)
	}

	// 3. History
	history, err := app.GetInspectionHistory()
	if err != nil {
		t.Fatalf("GetInspectionHistory failed: %v", err)
	}
	if len(history) != 0 {
		t.Fatalf("Expected 0 history initially, got %d", len(history))
	}
}

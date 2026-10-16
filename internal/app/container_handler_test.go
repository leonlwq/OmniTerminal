package app

import (
	"testing"
)

func TestContainerHandlerValidation(t *testing.T) {
	app := NewApp()

	// 1. 测试不存在的 SSH 会话报错校验
	_, err := app.ListDockerContainers("non-existent-session-id")
	if err == nil {
		t.Fatalf("expected error for non-existent session, got nil")
	}

	_, err = app.ListK8sPods("non-existent-session-id", "default", "")
	if err == nil {
		t.Fatalf("expected error for non-existent session, got nil")
	}

	_, err = app.GetDockerLogs("non-existent-session-id", "cnt-1", 100)
	if err == nil {
		t.Fatalf("expected error for non-existent session, got nil")
	}

	err = app.RestartDockerContainer("non-existent-session-id", "cnt-1")
	if err == nil {
		t.Fatalf("expected error for non-existent session, got nil")
	}

	err = app.StopDockerContainer("non-existent-session-id", "cnt-1")
	if err == nil {
		t.Fatalf("expected error for non-existent session, got nil")
	}

	// 2. 测试容器内联文件浏览接口非法会话报错校验
	_, err = app.ListContainerFiles("non-existent-session-id", "docker", "c1", "", "", "", "/")
	if err == nil {
		t.Fatalf("expected error for non-existent session in ListContainerFiles, got nil")
	}

	_, err = app.ReadContainerFile("non-existent-session-id", "docker", "c1", "", "", "", "/etc/hosts")
	if err == nil {
		t.Fatalf("expected error for non-existent session in ReadContainerFile, got nil")
	}

	err = app.WriteContainerFile("non-existent-session-id", "docker", "c1", "", "", "", "/etc/hosts", "test")
	if err == nil {
		t.Fatalf("expected error for non-existent session in WriteContainerFile, got nil")
	}

	_, err = app.GetMultiContainerLogs("non-existent-session-id", []string{"c1", "c2"}, 50)
	if err == nil {
		t.Fatalf("expected error for non-existent session in GetMultiContainerLogs, got nil")
	}

	// 3. 测试文件路径空参校验
	_, err = app.ReadContainerFile("", "docker", "c1", "", "", "", "")
	if err == nil {
		t.Fatalf("expected error for empty filePath in ReadContainerFile, got nil")
	}

	err = app.WriteContainerFile("", "docker", "c1", "", "", "", "", "hello")
	if err == nil {
		t.Fatalf("expected error for empty filePath in WriteContainerFile, got nil")
	}

	// 4. 测试打印功能空参校验
	err = app.PrintTerminalDocument("test", "")
	if err == nil {
		t.Fatalf("expected error for empty htmlContent in PrintTerminalDocument, got nil")
	}
}

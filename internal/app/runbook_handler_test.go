package app

import (
	"strings"
	"testing"

	"omniterminal/internal/models"
)

func TestRunbookTemplatesCRUD(t *testing.T) {
	app := NewApp()

	// 1. 获取预设模板
	rbs, err := app.GetRunbooks()
	if err != nil {
		t.Fatalf("GetRunbooks failed: %v", err)
	}
	if len(rbs) == 0 {
		t.Fatalf("expected default runbooks, got 0")
	}

	// 2. 新增自定义模板
	custom := models.RunbookTemplate{
		Name:        "测试 SOP 手册",
		Description: "单元测试自动化 SOP",
		Category:    "日常运维",
		Variables: []models.RunbookVariable{
			{Name: "TARGET_IP", Description: "目标主机 IP", DefaultValue: "127.0.0.1", Required: true, Type: "text"},
		},
		Steps: []models.RunbookStep{
			{ID: "s1", Name: "Ping 连通性测试", Command: "ping -c 2 ${TARGET_IP}", TimeoutSeconds: 10, ContinueOnError: false},
		},
	}
	err = app.SaveRunbook(custom)
	if err != nil {
		t.Fatalf("SaveRunbook failed: %v", err)
	}

	// 3. 验证存在并导出
	jsonStr, err := app.ExportRunbooks()
	if err != nil {
		t.Fatalf("ExportRunbooks failed: %v", err)
	}
	if !strings.Contains(jsonStr, "测试 SOP 手册") {
		t.Errorf("expected custom runbook in exported json")
	}

	// 4. 保存执行审计记录
	execRecord := models.RunbookExecutionRecord{
		RunbookID:      custom.ID,
		RunbookName:    custom.Name,
		StartTime:      "2026-10-10 12:00:00",
		EndTime:        "2026-10-10 12:00:05",
		Status:         "success",
		TargetHost:     "127.0.0.1",
		VariableValues: map[string]string{"TARGET_IP": "127.0.0.1"},
		StepResults: []models.RunbookStepResult{
			{StepID: "s1", StepName: "Ping 连通性测试", Command: "ping -c 2 127.0.0.1", Status: "success", Output: "2 packets transmitted", ExitCode: 0, DurationMs: 120},
		},
	}
	err = app.SaveRunbookExecution(execRecord)
	if err != nil {
		t.Fatalf("SaveRunbookExecution failed: %v", err)
	}

	history, err := app.GetRunbookHistory()
	if err != nil {
		t.Fatalf("GetRunbookHistory failed: %v", err)
	}
	if len(history) == 0 {
		t.Errorf("expected at least 1 history record")
	}

	// 5. 清理测试产生的自定义项
	_ = app.DeleteRunbook(custom.ID)
}

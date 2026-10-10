package app

import (
	"os"
	"testing"
	"omniterminal/internal/models"
)

func TestWorkspaceStateSaveAndGet(t *testing.T) {
	app := &App{}
	
	testState := models.WorkspaceState{
		Tabs: []models.WorkspaceTabState{
			{SessionID: "sess_1", CustomName: "Prod-DB", IsLocked: true},
			{SessionID: "sess_2", CustomName: "Redis-Cluster", IsLocked: false},
		},
		ActiveTabID:    "sess_1",
		SplitMode:      "vertical",
		SecondaryTabID: "sess_2",
	}

	err := app.SaveWorkspaceState(testState)
	if err != nil {
		t.Fatalf("SaveWorkspaceState failed: %v", err)
	}

	gotState, err := app.GetWorkspaceState()
	if err != nil {
		t.Fatalf("GetWorkspaceState failed: %v", err)
	}

	if len(gotState.Tabs) != 2 {
		t.Errorf("Expected 2 tabs, got %d", len(gotState.Tabs))
	}
	if gotState.ActiveTabID != "sess_1" {
		t.Errorf("Expected ActiveTabID sess_1, got %s", gotState.ActiveTabID)
	}
	if gotState.SplitMode != "vertical" {
		t.Errorf("Expected SplitMode vertical, got %s", gotState.SplitMode)
	}

	// 清理测试工作区文件
	_ = os.Remove(app.getWorkspacePath())
}

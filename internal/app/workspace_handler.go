package app

import (
	"encoding/json"
	"os"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/models"
)

func (a *App) getWorkspacePath() string {
	return config.GetFilePath("workspace.json")
}

// SaveWorkspaceState 持久化保存当前工作区打开的会话与分屏状态
func (a *App) SaveWorkspaceState(state models.WorkspaceState) error {
	state.LastSavedAt = time.Now().Format("2006-01-02 15:04:05")
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.getWorkspacePath(), data, 0644)
}

// GetWorkspaceState 获取上次保存的工作区状态
func (a *App) GetWorkspaceState() (*models.WorkspaceState, error) {
	path := a.getWorkspacePath()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return &models.WorkspaceState{
			Tabs:        []models.WorkspaceTabState{},
			SplitMode:   "none",
			LastSavedAt: "",
		}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var state models.WorkspaceState
	if err := json.Unmarshal(data, &state); err != nil {
		return &models.WorkspaceState{
			Tabs:        []models.WorkspaceTabState{},
			SplitMode:   "none",
			LastSavedAt: "",
		}, nil
	}

	return &state, nil
}

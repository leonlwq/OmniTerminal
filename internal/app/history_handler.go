package app

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/models"
)

var historyMu sync.Mutex

func getHistoryFilePath() (string, error) {
	return config.GetFilePath("command_history.jsonl"), nil
}

// RecordCommandHistory 记录一条终端命令历史
func (a *App) RecordCommandHistory(sessionId, sessionName, host, command string, exitCode int) error {
	cmd := strings.TrimSpace(command)
	if cmd == "" {
		return nil
	}

	historyMu.Lock()
	defer historyMu.Unlock()

	filePath, err := getHistoryFilePath()
	if err != nil {
		return err
	}

	entry := models.CommandHistoryEntry{
		ID:          fmt.Sprintf("%d", time.Now().UnixNano()),
		SessionID:   sessionId,
		SessionName: sessionName,
		Host:        host,
		Command:     cmd,
		ExitCode:    exitCode,
		Timestamp:   time.Now().Format("2006-01-02 15:04:05"),
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := f.Write(append(data, '\n')); err != nil {
		return err
	}

	return nil
}

// GetCommandHistory 获取近期命令历史记录
func (a *App) GetCommandHistory(limit int) ([]models.CommandHistoryEntry, error) {
	if limit <= 0 {
		limit = 200
	}

	historyMu.Lock()
	defer historyMu.Unlock()

	filePath, err := getHistoryFilePath()
	if err != nil {
		return nil, err
	}

	f, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.CommandHistoryEntry{}, nil
		}
		return nil, err
	}
	defer f.Close()

	var allEntries []models.CommandHistoryEntry
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		var entry models.CommandHistoryEntry
		if err := json.Unmarshal([]byte(line), &entry); err == nil {
			allEntries = append(allEntries, entry)
		}
	}

	// 逆序排列（最新的在最前）
	n := len(allEntries)
	var reversed []models.CommandHistoryEntry
	for i := n - 1; i >= 0; i-- {
		reversed = append(reversed, allEntries[i])
		if len(reversed) >= limit {
			break
		}
	}

	if reversed == nil {
		reversed = []models.CommandHistoryEntry{}
	}

	return reversed, nil
}

// SearchCommandHistory 模糊检索跨会话命令历史
func (a *App) SearchCommandHistory(query string, limit int) ([]models.CommandHistoryEntry, error) {
	if limit <= 0 {
		limit = 100
	}

	all, err := a.GetCommandHistory(1000)
	if err != nil {
		return nil, err
	}

	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		if len(all) > limit {
			return all[:limit], nil
		}
		return all, nil
	}

	var matched []models.CommandHistoryEntry
	for _, item := range all {
		if strings.Contains(strings.ToLower(item.Command), q) ||
			strings.Contains(strings.ToLower(item.SessionName), q) ||
			strings.Contains(strings.ToLower(item.Host), q) {
			matched = append(matched, item)
			if len(matched) >= limit {
				break
			}
		}
	}

	if matched == nil {
		matched = []models.CommandHistoryEntry{}
	}

	return matched, nil
}

// ClearCommandHistory 清空所有命令历史
func (a *App) ClearCommandHistory() error {
	historyMu.Lock()
	defer historyMu.Unlock()

	filePath, err := getHistoryFilePath()
	if err != nil {
		return err
	}

	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		// 若移除失败（如被其他句柄锁定），尝试将其写为空文件
		_ = os.WriteFile(filePath, []byte{}, 0600)
	}

	return nil
}

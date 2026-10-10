package config

import (
	"os"
	"path/filepath"
	"sync"
)

const (
	// DirName OmniTerminal 统一标准配置目录名
	DirName = ".omniterminal"
)

var cleanupOnce sync.Once

// cleanLegacyFiles 清理历史遗留的无用诊断文件
func cleanLegacyFiles(dir string) {
	cleanupOnce.Do(func() {
		legacyDebugLog := filepath.Join(dir, "local_shell_debug.log")
		if _, err := os.Stat(legacyDebugLog); err == nil {
			_ = os.Remove(legacyDebugLog)
		}
	})
}

// GetConfigDir 获取 OmniTerminal 应用主配置目录 (~/.omniterminal)
// 若目录不存在则自动创建
func GetConfigDir() string {
	home, err := os.UserHomeDir()
	var targetDir string
	if err != nil {
		targetDir = DirName
	} else {
		targetDir = filepath.Join(home, DirName)
	}

	_ = os.MkdirAll(targetDir, 0755)
	cleanLegacyFiles(targetDir)
	return targetDir
}

// GetFilePath 返回 ~/.omniterminal/<filename> 的完整路径
func GetFilePath(filename string) string {
	return filepath.Join(GetConfigDir(), filename)
}

// GetSubDir 返回 ~/.omniterminal/<subDir> 目录，并确保该子目录存在
func GetSubDir(subDir string) string {
	dir := filepath.Join(GetConfigDir(), subDir)
	_ = os.MkdirAll(dir, 0755)
	return dir
}

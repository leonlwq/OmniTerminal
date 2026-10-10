package core

import (
	"bufio"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"omniterminal/internal/models"
)

// ListAvailableShells 扫描并返回本机当前可用的 Shell 列表
func ListAvailableShells() ([]models.SystemShellInfo, error) {
	var result []models.SystemShellInfo
	seen := make(map[string]bool)

	addShell := func(name, path string) {
		if path == "" || seen[path] {
			return
		}
		if _, err := os.Stat(path); err == nil {
			seen[path] = true
			result = append(result, models.SystemShellInfo{
				Name: name,
				Path: path,
			})
		}
	}

	if runtime.GOOS == "windows" {
		// Windows 常用 Shell
		windir := os.Getenv("WINDIR")
		if windir == "" {
			windir = `C:\Windows`
		}
		addShell("PowerShell", filepath.Join(windir, `System32\WindowsPowerShell\v1.0\powershell.exe`))
		addShell("Command Prompt (CMD)", filepath.Join(windir, `System32\cmd.exe`))

		// PowerShell Core (pwsh)
		if p, err := exec.LookPath("pwsh.exe"); err == nil {
			addShell("PowerShell Core (pwsh)", p)
		}
		// Git Bash
		gitPaths := []string{
			`C:\Program Files\Git\bin\bash.exe`,
			`C:\Program Files (x86)\Git\bin\bash.exe`,
			filepath.Join(os.Getenv("LOCALAPPDATA"), `Programs\Git\bin\bash.exe`),
		}
		for _, gp := range gitPaths {
			addShell("Git Bash", gp)
		}
		// NuShell
		if p, err := exec.LookPath("nu.exe"); err == nil {
			addShell("NuShell", p)
		}
	} else {
		// macOS / Linux 从 /etc/shells 读取
		if file, err := os.Open("/etc/shells"); err == nil {
			defer file.Close()
			scanner := bufio.NewScanner(file)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				baseName := filepath.Base(line)
				addShell(strings.ToUpper(baseName)+" ("+line+")", line)
			}
		}

		// 补充常见 Homebrew / 默认路径
		candidates := []string{
			"/bin/zsh",
			"/bin/bash",
			"/bin/sh",
			"/usr/local/bin/zsh",
			"/usr/local/bin/bash",
			"/usr/local/bin/fish",
			"/opt/homebrew/bin/zsh",
			"/opt/homebrew/bin/bash",
			"/opt/homebrew/bin/fish",
			"/usr/bin/nu",
		}
		for _, c := range candidates {
			baseName := filepath.Base(c)
			addShell(strings.ToUpper(baseName)+" ("+c+")", c)
		}
	}

	return result, nil
}

// ListWSLDistros 扫描 Windows 环境下已安装的 WSL 发行版列表
func ListWSLDistros() ([]models.WSLDistroInfo, error) {
	if runtime.GOOS != "windows" {
		return []models.WSLDistroInfo{}, nil
	}

	cmd := exec.Command("wsl.exe", "-l", "-v")
	HideConsoleWindow(cmd)
	out, err := cmd.Output()
	if err != nil {
		// 降级尝试 wsl.exe -l -q
		cmdQuiet := exec.Command("wsl.exe", "-l", "-q")
		HideConsoleWindow(cmdQuiet)
		outQuiet, errQuiet := cmdQuiet.Output()
		if errQuiet != nil {
			return []models.WSLDistroInfo{}, nil
		}
		return parseWSLQuiet(outQuiet), nil
	}

	return parseWSLVerbose(out), nil
}

func parseWSLVerbose(out []byte) []models.WSLDistroInfo {
	var distros []models.WSLDistroInfo
	// WSL 输出常为 UTF-16LE，剥离 null 字节
	cleaned := strings.ReplaceAll(string(out), "\x00", "")
	lines := strings.Split(cleaned, "\n")
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if i == 0 || line == "" || strings.Contains(line, "NAME") || strings.Contains(line, "STATE") {
			continue
		}
		isDefault := false
		if strings.HasPrefix(line, "*") {
			isDefault = true
			line = strings.TrimSpace(strings.TrimPrefix(line, "*"))
		}
		fields := strings.Fields(line)
		if len(fields) >= 1 {
			name := fields[0]
			version := 2
			if len(fields) >= 3 && fields[2] == "1" {
				version = 1
			}
			distros = append(distros, models.WSLDistroInfo{
				Name:      name,
				IsDefault: isDefault,
				Version:   version,
			})
		}
	}
	return distros
}

func parseWSLQuiet(out []byte) []models.WSLDistroInfo {
	var distros []models.WSLDistroInfo
	cleaned := strings.ReplaceAll(string(out), "\x00", "")
	lines := strings.Split(cleaned, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		distros = append(distros, models.WSLDistroInfo{
			Name:      line,
			IsDefault: len(distros) == 0,
			Version:   2,
		})
	}
	return distros
}

package app

import (
	"fmt"
	"os"
	"os/user"
	"runtime"
)

func (a *App) LocalListDir(path string) ([]SftpFileInfo, error) {
	if path == "" {
		path = a.GetLocalHomeDir()
	}
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var res []SftpFileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		permissions := info.Mode().Perm().String()
		res = append(res, SftpFileInfo{
			Name:    info.Name(),
			Size:    info.Size(),
			IsDir:   info.IsDir(),
			ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
			Mode:    permissions,
		})
	}
	return res, nil
}

func (a *App) GetLocalHomeDir() string {
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return home
	}
	usr, err := user.Current()
	if err == nil && usr.HomeDir != "" {
		return usr.HomeDir
	}
	if runtime.GOOS == "windows" {
		if p := os.Getenv("USERPROFILE"); p != "" {
			return p
		}
		return "C:\\"
	}
	return "/"
}

func (a *App) LocalReadFile(path string) (string, error) {
	info, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	if info.Size() > 5*1024*1024 { // 5MB limit
		return "", fmt.Errorf("文件过大，无法在内置编辑器打开")
	}
	data, err := os.ReadFile(path)
	return string(data), err
}

func (a *App) LocalWriteFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

func (a *App) LocalMkdir(path string) error {
	return os.MkdirAll(path, 0755)
}

func (a *App) LocalRename(oldPath string, newPath string) error {
	return os.Rename(oldPath, newPath)
}

func (a *App) LocalDelete(path string) error {
	return os.RemoveAll(path)
}

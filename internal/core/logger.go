package core

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	appconfig "omniterminal/internal/config"
	"omniterminal/internal/models"
)

type SessionLogger struct {
	config      models.LogConfig
	sessionName string
	host        string

	file        *os.File
	currentSize int64
	mu          sync.Mutex
}

func NewSessionLogger(config models.LogConfig, sessionName, host string) (*SessionLogger, error) {
	if !config.Enable {
		return nil, nil
	}

	l := &SessionLogger{
		config:      config,
		sessionName: sessionName,
		host:        host,
	}
	err := l.openFile()
	return l, err
}

func (l *SessionLogger) getPath() string {
	path := l.config.PathTemplate
	if path == "" {
		path = filepath.Join(appconfig.GetSubDir("logs"), "%Y", "%m", "%n_%Y%m%d.log")
	} else if strings.HasPrefix(path, "~/") || strings.HasPrefix(path, "~\\") {
		home, _ := os.UserHomeDir()
		path = filepath.Join(home, path[2:])
	}

	now := time.Now()
	
	safeName := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			return r
		}
		return '_'
	}, l.sessionName)

	safeHost := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			return r
		}
		return '_'
	}, l.host)

	path = strings.ReplaceAll(path, "%n", safeName)
	path = strings.ReplaceAll(path, "%h", safeHost)
	path = strings.ReplaceAll(path, "%Y%m%d", now.Format("20060102"))
	path = strings.ReplaceAll(path, "%Y", now.Format("2006"))
	path = strings.ReplaceAll(path, "%m", now.Format("01"))
	path = strings.ReplaceAll(path, "%d", now.Format("02"))

	if l.config.Format == "HTML" && !strings.HasSuffix(path, ".html") {
		path += ".html"
	} else if l.config.Format == "CSV" && !strings.HasSuffix(path, ".csv") {
		path += ".csv"
	}
	return path
}

func (l *SessionLogger) openFile() error {
	path := l.getPath()
	os.MkdirAll(filepath.Dir(path), 0755)

	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}

	info, err := file.Stat()
	if err == nil {
		l.currentSize = info.Size()
	}

	l.file = file

	if l.currentSize == 0 {
		if l.config.Format == "HTML" {
			l.file.WriteString("<html><head><meta charset='utf-8'><style>body{background:#1e1e1e;color:#d4d4d4;font-family:monospace;white-space:pre-wrap;}</style></head><body>\n")
		} else if l.config.Format == "CSV" {
			l.file.WriteString("Timestamp,Direction,Data\n")
		} else {
			l.file.WriteString(fmt.Sprintf("=== OmniTerminal Audit Log [%s] Session:%s Host:%s ===\n", time.Now().Format("2006-01-02 15:04:05"), l.sessionName, l.host))
		}
	}

	return nil
}

func (l *SessionLogger) Write(p []byte) (n int, err error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.file == nil {
		return len(p), nil
	}

	if l.config.MaxBytes > 0 && l.currentSize+int64(len(p)) > l.config.MaxBytes {
		l.rotate()
	}

	var out []byte
	if l.config.Format == "HTML" {
		s := string(p)
		s = strings.ReplaceAll(s, "&", "&amp;")
		s = strings.ReplaceAll(s, "<", "&lt;")
		s = strings.ReplaceAll(s, ">", "&gt;")
		out = []byte(s)
	} else if l.config.Format == "CSV" {
		s := string(p)
		s = strings.ReplaceAll(s, "\"", "\"\"")
		csvLine := fmt.Sprintf("\"%s\",\"IN\",\"%s\"\n", time.Now().Format("2006-01-02 15:04:05"), s)
		out = []byte(csvLine)
	} else {
		out = p
	}

	n, err = l.file.Write(out)
	l.currentSize += int64(n)
	return len(p), err
}

func (l *SessionLogger) rotate() {
	if l.file != nil {
		if l.config.Format == "HTML" {
			l.file.WriteString("</body></html>\n")
		}
		l.file.Close()
	}
	path := l.getPath()
	backupPath := path + "." + time.Now().Format("150405")
	os.Rename(path, backupPath)

	l.currentSize = 0
	l.openFile()
}

func (l *SessionLogger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file != nil {
		if l.config.Format == "HTML" {
			l.file.WriteString("</body></html>\n")
		}
		err := l.file.Close()
		l.file = nil
		return err
	}
	return nil
}

func (l *SessionLogger) Sync() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file != nil {
		return l.file.Sync()
	}
	return nil
}

package app

import (
	"bufio"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ImportExternalSessions 根据格式解析外部会话
func (a *App) ImportExternalSessions(format string, rawContent string, filePath string) ([]SessionConfig, error) {
	content := rawContent
	if content == "" && filePath != "" {
		data, err := os.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf("读取文件失败: %w", err)
		}
		content = string(data)
	}

	switch strings.ToLower(format) {
	case "ssh_config", "openssh":
		return parseSSHConfig(content)
	case "xshell", "xsh":
		return parseXshellConfig(content, filePath)
	case "securecrt", "crt":
		return parseSecureCRTConfig(content)
	case "mobaxterm", "mxtpro":
		return parseMobaXtermConfig(content)
	case "putty", "reg":
		return parsePuttyConfig(content)
	case "termius", "json":
		return parseTermiusConfig(content)
	default:
		return nil, fmt.Errorf("不支持的导入格式: %s", format)
	}
}

// ScanLocalSSHConfig 扫描本机 ~/.ssh/config 配置文件
func (a *App) ScanLocalSSHConfig() ([]SessionConfig, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	sshConfigPath := filepath.Join(home, ".ssh", "config")
	if _, err := os.Stat(sshConfigPath); os.IsNotExist(err) {
		return []SessionConfig{}, nil
	}

	data, err := os.ReadFile(sshConfigPath)
	if err != nil {
		return nil, err
	}
	return parseSSHConfig(string(data))
}

// parseSSHConfig 解析 OpenSSH 格式配置文件
func parseSSHConfig(content string) ([]SessionConfig, error) {
	var sessions []SessionConfig
	scanner := bufio.NewScanner(strings.NewReader(content))

	var current *SessionConfig

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		key := strings.ToLower(parts[0])
		val := strings.Join(parts[1:], " ")

		if key == "host" {
			if current != nil && current.Host != "" && current.Name != "*" {
				sessions = append(sessions, *current)
			}
			if val == "*" {
				current = nil
				continue
			}
			current = &SessionConfig{
				ID:        fmt.Sprintf("import-ssh-%d-%s", time.Now().UnixNano(), sanitizeID(val)),
				Name:      val,
				Host:      val,
				Port:      22,
				User:      "root",
				Encoding:  "UTF-8",
				TermType:  "xterm-256color",
			}
			continue
		}

		if current == nil {
			continue
		}

		switch key {
		case "hostname":
			current.Host = val
		case "port":
			if p, err := strconv.Atoi(val); err == nil {
				current.Port = p
			}
		case "user":
			current.User = val
		case "identityfile":
			// 展开 ~ 路径
			if strings.HasPrefix(val, "~") {
				if home, err := os.UserHomeDir(); err == nil {
					val = filepath.Join(home, strings.TrimPrefix(val, "~"))
				}
			}
			if keyData, err := os.ReadFile(val); err == nil {
				current.PrivateKey = string(keyData)
			}
		case "proxyjump":
			current.JumpHostSessionID = val
		}
	}

	if current != nil && current.Host != "" && current.Name != "*" {
		sessions = append(sessions, *current)
	}

	return sessions, nil
}

// parseXshellConfig 解析 Xshell .xsh 文件（INI 格式）
func parseXshellConfig(content string, defaultName string) ([]SessionConfig, error) {
	session := SessionConfig{
		ID:       fmt.Sprintf("import-xsh-%d", time.Now().UnixNano()),
		Name:     "Xshell Session",
		Port:     22,
		User:     "root",
		Encoding: "UTF-8",
		TermType: "xterm-256color",
	}

	if defaultName != "" {
		base := filepath.Base(defaultName)
		session.Name = strings.TrimSuffix(base, filepath.Ext(base))
	}

	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, ";") || strings.HasPrefix(line, "#") {
			continue
		}

		if idx := strings.Index(line, "="); idx != -1 {
			k := strings.TrimSpace(line[:idx])
			v := strings.TrimSpace(line[idx+1:])

			switch strings.ToLower(k) {
			case "host":
				session.Host = v
			case "port":
				if p, err := strconv.Atoi(v); err == nil {
					session.Port = p
				}
			case "username", "user":
				session.User = v
			case "sessionname":
				if v != "" {
					session.Name = v
				}
			case "encoding":
				if v != "" {
					session.Encoding = v
				}
			}
		}
	}

	if session.Host == "" {
		return nil, fmt.Errorf("未在 Xshell 配置中找到有效的 Host")
	}

	return []SessionConfig{session}, nil
}

// parseSecureCRTConfig 解析 SecureCRT XML / INI
func parseSecureCRTConfig(content string) ([]SessionConfig, error) {
	var sessions []SessionConfig

	// 尝试 XML 格式
	type CRTXMLNode struct {
		Name     string `xml:"name,attr"`
		Hostname string `xml:"Hostname"`
		Port     int    `xml:"Port"`
		Username string `xml:"Username"`
	}
	type CRTXMLRoot struct {
		Sessions []CRTXMLNode `xml:"Session"`
	}

	var root CRTXMLRoot
	if err := xml.Unmarshal([]byte(content), &root); err == nil && len(root.Sessions) > 0 {
		for _, s := range root.Sessions {
			port := s.Port
			if port == 0 {
				port = 22
			}
			sessions = append(sessions, SessionConfig{
				ID:       fmt.Sprintf("import-crt-%d-%s", time.Now().UnixNano(), sanitizeID(s.Name)),
				Name:     s.Name,
				Host:     s.Hostname,
				Port:     port,
				User:     s.Username,
				Encoding: "UTF-8",
				TermType: "xterm-256color",
			})
		}
		return sessions, nil
	}

	// 尝试 SecureCRT INI 键值格式 (如 S:"Hostname"=1.2.3.4)
	session := SessionConfig{
		ID:       fmt.Sprintf("import-crt-%d", time.Now().UnixNano()),
		Name:     "SecureCRT Session",
		Port:     22,
		User:     "root",
		Encoding: "UTF-8",
		TermType: "xterm-256color",
	}

	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.Contains(line, `S:"Hostname"=`) {
			val := extractCRTValue(line)
			session.Host = val
		} else if strings.Contains(line, `S:"Username"=`) {
			val := extractCRTValue(line)
			session.User = val
		} else if strings.Contains(line, `D:"[SSH2] Port"=`) {
			val := extractCRTValue(line)
			if p, err := strconv.ParseInt(val, 16, 32); err == nil {
				session.Port = int(p)
			}
		}
	}

	if session.Host != "" {
		sessions = append(sessions, session)
		return sessions, nil
	}

	return nil, fmt.Errorf("未能成功解析 SecureCRT 配置")
}

func extractCRTValue(line string) string {
	parts := strings.SplitN(line, "=", 2)
	if len(parts) < 2 {
		return ""
	}
	v := strings.TrimSpace(parts[1])
	return strings.Trim(v, `"`)
}

// parseMobaXtermConfig 解析 MobaXterm 配置
func parseMobaXtermConfig(content string) ([]SessionConfig, error) {
	var sessions []SessionConfig
	scanner := bufio.NewScanner(strings.NewReader(content))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "[") || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		sessionName := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		if strings.HasPrefix(val, "#") {
			if idx := strings.Index(val[1:], "#"); idx != -1 {
				val = val[idx+2:]
			}
		}

		if strings.Contains(val, "%") {
			subParts := strings.Split(val, "%")
			if len(subParts) >= 3 {
				host := subParts[0]
				portStr := subParts[1]
				user := subParts[2]

				port := 22
				if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
					port = p
				}

				if host != "" {
					sessions = append(sessions, SessionConfig{
						ID:       fmt.Sprintf("import-mxt-%d-%s", time.Now().UnixNano(), sanitizeID(sessionName)),
						Name:     sessionName,
						Host:     host,
						Port:     port,
						User:     user,
						Encoding: "UTF-8",
						TermType: "xterm-256color",
					})
				}
			}
		}
	}

	if len(sessions) == 0 {
		return nil, fmt.Errorf("未在 MobaXterm 内容中找到有效会话")
	}
	return sessions, nil
}

// parsePuttyConfig 解析 PuTTY .reg 文件
func parsePuttyConfig(content string) ([]SessionConfig, error) {
	var sessions []SessionConfig
	var current *SessionConfig

	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "[HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions\\") {
			if current != nil && current.Host != "" {
				sessions = append(sessions, *current)
			}
			sessName := strings.TrimPrefix(line, "[HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions\\")
			sessName = strings.TrimSuffix(sessName, "]")
			sessName = strings.ReplaceAll(sessName, "%20", " ")

			current = &SessionConfig{
				ID:       fmt.Sprintf("import-putty-%d-%s", time.Now().UnixNano(), sanitizeID(sessName)),
				Name:     sessName,
				Port:     22,
				User:     "root",
				Encoding: "UTF-8",
				TermType: "xterm-256color",
			}
			continue
		}

		if current == nil {
			continue
		}

		if strings.HasPrefix(line, `"HostName"=`) {
			current.Host = extractRegString(line)
		} else if strings.HasPrefix(line, `"UserName"=`) {
			current.User = extractRegString(line)
		} else if strings.HasPrefix(line, `"PortNumber"=dword:`) {
			hexVal := strings.TrimPrefix(line, `"PortNumber"=dword:`)
			if p, err := strconv.ParseInt(hexVal, 16, 32); err == nil && p > 0 {
				current.Port = int(p)
			}
		}
	}

	if current != nil && current.Host != "" {
		sessions = append(sessions, *current)
	}

	if len(sessions) == 0 {
		return nil, fmt.Errorf("未在 PuTTY .reg 文件中找到有效会话")
	}
	return sessions, nil
}

func extractRegString(line string) string {
	parts := strings.SplitN(line, "=", 2)
	if len(parts) < 2 {
		return ""
	}
	v := strings.TrimSpace(parts[1])
	return strings.Trim(v, `"`)
}

// parseTermiusConfig 解析 Termius JSON 导出
func parseTermiusConfig(content string) ([]SessionConfig, error) {
	var sessions []SessionConfig

	var genericData []map[string]interface{}
	if err := json.Unmarshal([]byte(content), &genericData); err == nil {
		for _, item := range genericData {
			host, _ := item["address"].(string)
			if host == "" {
				host, _ = item["hostname"].(string)
			}
			if host == "" {
				continue
			}

			label, _ := item["label"].(string)
			if label == "" {
				label, _ = item["name"].(string)
			}
			if label == "" {
				label = host
			}

			user, _ := item["username"].(string)
			if user == "" {
				user = "root"
			}

			port := 22
			if p, ok := item["port"].(float64); ok && p > 0 {
				port = int(p)
			}

			sessions = append(sessions, SessionConfig{
				ID:       fmt.Sprintf("import-termius-%d-%s", time.Now().UnixNano(), sanitizeID(label)),
				Name:     label,
				Host:     host,
				Port:     port,
				User:     user,
				Encoding: "UTF-8",
				TermType: "xterm-256color",
			})
		}
		if len(sessions) > 0 {
			return sessions, nil
		}
	}

	return nil, fmt.Errorf("未能成功解析 Termius JSON 配置")
}

func sanitizeID(s string) string {
	reg := regexp.MustCompile(`[^a-zA-Z0-9_-]`)
	cleaned := reg.ReplaceAllString(s, "_")
	if len(cleaned) > 20 {
		cleaned = cleaned[:20]
	}
	return cleaned
}

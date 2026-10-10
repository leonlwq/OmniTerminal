//go:build darwin

package core

import (
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

func detectPlatformProxy() SystemProxyInfo {
	cmd := exec.Command("scutil", "--proxy")
	out, err := cmd.Output()
	if err != nil {
		return SystemProxyInfo{Enabled: false, Source: "none"}
	}

	text := string(out)

	// 检查 SOCKS 代理 (SOCKSEnable : 1)
	if strings.Contains(text, "SOCKSEnable : 1") {
		host := extractScutilVal(text, "SOCKSProxy")
		portStr := extractScutilVal(text, "SOCKSPort")
		port, _ := strconv.Atoi(portStr)
		if host != "" && port > 0 {
			return SystemProxyInfo{
				Enabled:   true,
				ProxyType: "socks5",
				Host:      host,
				Port:      port,
				Source:    "macOS 系统设置 (SOCKS)",
				RawURL:    "socks5://" + host + ":" + portStr,
			}
		}
	}

	// 检查 HTTP/HTTPS 代理 (HTTPEnable : 1)
	if strings.Contains(text, "HTTPEnable : 1") {
		host := extractScutilVal(text, "HTTPProxy")
		portStr := extractScutilVal(text, "HTTPPort")
		port, _ := strconv.Atoi(portStr)
		if host != "" && port > 0 {
			return SystemProxyInfo{
				Enabled:   true,
				ProxyType: "http",
				Host:      host,
				Port:      port,
				Source:    "macOS 系统设置 (HTTP)",
				RawURL:    "http://" + host + ":" + portStr,
			}
		}
	}

	return SystemProxyInfo{Enabled: false, Source: "none"}
}

func extractScutilVal(text string, key string) string {
	re := regexp.MustCompile(key + `\s*:\s*([^\r\n]+)`)
	matches := re.FindStringSubmatch(text)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	return ""
}

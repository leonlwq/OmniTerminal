package core

import (
	"net/url"
	"os"
	"strconv"
	"strings"
)

// SystemProxyInfo 系统代理检测结果
type SystemProxyInfo struct {
	Enabled   bool   `json:"enabled"`
	ProxyType string `json:"proxyType"` // "http" | "socks5" | ""
	Host      string `json:"host"`
	Port      int    `json:"port"`
	Source    string `json:"source"`    // "env" | "macos-scutil" | "windows-registry" | "none"
	RawURL    string `json:"rawUrl"`
}

// DetectSystemProxy 检测当前操作系统的系统代理配置
func DetectSystemProxy() SystemProxyInfo {
	// 1. 优先尝试系统环境变量 (ALL_PROXY, HTTPS_PROXY, HTTP_PROXY)
	if envProxy := detectFromEnv(); envProxy.Enabled {
		return envProxy
	}

	// 2. 调用平台特异性接口检测系统代理 (macOS scutil / Windows Registry)
	return detectPlatformProxy()
}

func detectFromEnv() SystemProxyInfo {
	for _, envKey := range []string{"ALL_PROXY", "all_proxy", "HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"} {
		val := strings.TrimSpace(os.Getenv(envKey))
		if val == "" {
			continue
		}

		raw := val
		if !strings.Contains(raw, "://") {
			raw = "http://" + raw
		}

		u, err := url.Parse(raw)
		if err == nil && u.Hostname() != "" {
			port := 8080
			if u.Port() != "" {
				if p, perr := strconv.Atoi(u.Port()); perr == nil {
					port = p
				}
			}
			pType := "http"
			if strings.HasPrefix(strings.ToLower(u.Scheme), "socks") {
				pType = "socks5"
			}
			return SystemProxyInfo{
				Enabled:   true,
				ProxyType: pType,
				Host:      u.Hostname(),
				Port:      port,
				Source:    "环境变量 (" + envKey + ")",
				RawURL:    val,
			}
		}
	}
	return SystemProxyInfo{Enabled: false, Source: "none"}
}

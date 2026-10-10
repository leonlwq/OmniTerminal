//go:build windows

package core

import (
	"strconv"
	"strings"

	"golang.org/x/sys/windows/registry"
)

const internetSettingsKey = `Software\Microsoft\Windows\CurrentVersion\Internet Settings`

func detectPlatformProxy() SystemProxyInfo {
	k, err := registry.OpenKey(registry.CURRENT_USER, internetSettingsKey, registry.QUERY_VALUE)
	if err != nil {
		return SystemProxyInfo{Enabled: false, Source: "none"}
	}
	defer k.Close()

	enable, _, err := k.GetIntegerValue("ProxyEnable")
	if err != nil || enable != 1 {
		return SystemProxyInfo{Enabled: false, Source: "none"}
	}

	server, _, err := k.GetStringValue("ProxyServer")
	if err != nil || server == "" {
		return SystemProxyInfo{Enabled: false, Source: "none"}
	}

	pType := "http"
	addr := server

	if strings.Contains(server, ";") || strings.Contains(server, "=") {
		parts := strings.Split(server, ";")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if strings.HasPrefix(part, "socks=") {
				pType = "socks5"
				addr = strings.TrimPrefix(part, "socks=")
				break
			}
			if strings.HasPrefix(part, "http=") {
				pType = "http"
				addr = strings.TrimPrefix(part, "http=")
			}
		}
	}

	host := addr
	port := 8080
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		host = addr[:idx]
		if p, err := strconv.Atoi(addr[idx+1:]); err == nil {
			port = p
		}
	}

	return SystemProxyInfo{
		Enabled:   true,
		ProxyType: pType,
		Host:      host,
		Port:      port,
		Source:    "Windows 系统注册表",
		RawURL:    pType + "://" + host + ":" + strconv.Itoa(port),
	}
}

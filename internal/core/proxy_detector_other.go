//go:build !darwin && !windows

package core

func detectPlatformProxy() SystemProxyInfo {
	return SystemProxyInfo{Enabled: false, Source: "none"}
}

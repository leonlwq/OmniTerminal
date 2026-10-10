package core

import (
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"
	"omniterminal/internal/models"
)

// ProbeHost 探测目标主机的连通性与 TCP 往返时延
func ProbeHost(host string, port int, timeout time.Duration) (bool, int64, error) {
	if host == "" || host == "Local" || port <= 0 {
		return false, 0, fmt.Errorf("无效的主机地址或端口")
	}

	target := net.JoinHostPort(host, strconv.Itoa(port))
	start := time.Now()

	conn, err := net.DialTimeout("tcp", target, timeout)
	if err != nil {
		return false, 0, err
	}
	defer conn.Close()

	latency := time.Since(start).Milliseconds()
	return true, latency, nil
}

// BatchProbeHosts 并发探测一组主机的连通性
func BatchProbeHosts(targets map[string]struct {
	Host string
	Port int
}, timeout time.Duration) map[string]models.HostStatusResult {
	results := make(map[string]models.HostStatusResult)
	var mu sync.Mutex
	var wg sync.WaitGroup

	sem := make(chan struct{}, 20) // 最大并发数 20

	nowStr := time.Now().Format("15:04:05")

	for id, target := range targets {
		wg.Add(1)
		go func(sessID, host string, port int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			online, latency, err := ProbeHost(host, port, timeout)
			errStr := ""
			if err != nil {
				errStr = err.Error()
			}

			mu.Lock()
			results[sessID] = models.HostStatusResult{
				SessionID: sessID,
				Online:    online,
				LatencyMs: latency,
				CheckedAt: nowStr,
				Error:     errStr,
			}
			mu.Unlock()
		}(id, target.Host, target.Port)
	}

	wg.Wait()
	return results
}

package core

import (
	"bytes"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/models"
	"golang.org/x/crypto/ssh"
)

// runSSHExecHelper 执行轻量只读命令并返回标准输出
func runSSHExecHelper(client *ssh.Client, cmd string, timeout time.Duration) (string, error) {
	if client == nil {
		return "", fmt.Errorf("ssh client is nil")
	}
	session, err := client.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	done := make(chan error, 1)
	go func() {
		done <- session.Run(cmd)
	}()

	select {
	case err := <-done:
		if err != nil {
			return stdout.String(), fmt.Errorf("exec error: %v, stderr: %s", err, stderr.String())
		}
		return stdout.String(), nil
	case <-time.After(timeout):
		_ = session.Signal(ssh.SIGKILL)
		return "", fmt.Errorf("command timed out after %v", timeout)
	}
}

type netSampleRecord struct {
	rxBytes    int64
	txBytes    int64
	sampleTime time.Time
}

var (
	netSampleMu  sync.RWMutex
	netSampleMap = make(map[string]netSampleRecord)
)

// ClearHostMonitorSession 清理指定会话的监控缓存
func ClearHostMonitorSession(sessionId string) {
	netSampleMu.Lock()
	defer netSampleMu.Unlock()
	delete(netSampleMap, sessionId)
}

// parseNetDev 解析 /proc/net/dev 输出中的非回环网口收发总字节数
func parseNetDev(content string) (int64, int64) {
	lines := strings.Split(content, "\n")
	var totalRx, totalTx int64
	for _, line := range lines {
		colonIdx := strings.Index(line, ":")
		if colonIdx == -1 {
			continue
		}
		iface := strings.TrimSpace(line[:colonIdx])
		if iface == "lo" || strings.HasPrefix(iface, "lo:") {
			continue
		}
		rest := strings.TrimSpace(line[colonIdx+1:])
		fields := strings.Fields(rest)
		if len(fields) < 9 {
			continue
		}
		rx, err1 := strconv.ParseInt(fields[0], 10, 64)
		tx, err2 := strconv.ParseInt(fields[8], 10, 64)
		if err1 == nil && rx > 0 {
			totalRx += rx
		}
		if err2 == nil && tx > 0 {
			totalTx += tx
		}
	}
	return totalRx, totalTx
}

// SampleHostMetrics 远程主机性能指标采集
func SampleHostMetrics(client *ssh.Client, sessionId string) (models.HostResourceMetrics, error) {
	metrics := models.HostResourceMetrics{
		SessionID: sessionId,
		SampledAt: time.Now().Format("15:04:05"),
	}

	combinedCmd := `cat /proc/stat 2>/dev/null | head -n 1; echo "---MEM---"; cat /proc/meminfo 2>/dev/null | grep -E "MemTotal|MemAvailable|MemFree|Buffers|Cached"; echo "---DISK---"; df -Pk / 2>/dev/null | tail -n 1; echo "---NET---"; cat /proc/net/dev 2>/dev/null; echo "---UPTIME---"; uptime 2>/dev/null`
	out, err := runSSHExecHelper(client, combinedCmd, 3*time.Second)
	if err != nil {
		metrics.Error = err.Error()
		return metrics, err
	}

	parts := strings.Split(out, "---")
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if strings.HasPrefix(trimmed, "cpu ") {
			metrics.CPUUsage = parseCPUStat(trimmed)
		} else if strings.HasPrefix(trimmed, "MEM---") || strings.Contains(trimmed, "MemTotal:") {
			memUsage, totalMB, usedMB := parseMemInfo(trimmed)
			metrics.MemUsage = memUsage
			metrics.MemTotalMB = totalMB
			metrics.MemUsedMB = usedMB
		} else if strings.HasPrefix(trimmed, "DISK---") || strings.Contains(trimmed, "/") {
			diskUsage, totalGB, usedGB := parseDFOutput(trimmed)
			metrics.DiskUsage = diskUsage
			metrics.DiskTotalGB = totalGB
			metrics.DiskUsedGB = usedGB
		} else if strings.HasPrefix(trimmed, "NET---") || strings.Contains(trimmed, "Receive") || strings.Contains(trimmed, "Transmit") {
			rxBytes, txBytes := parseNetDev(trimmed)
			now := time.Now()
			netSampleMu.Lock()
			if prev, exists := netSampleMap[sessionId]; exists {
				elapsed := now.Sub(prev.sampleTime).Seconds()
				if elapsed > 0.4 {
					rxDiff := rxBytes - prev.rxBytes
					txDiff := txBytes - prev.txBytes
					if rxDiff >= 0 {
						metrics.NetRxRateKBps = math.Round((float64(rxDiff)/elapsed/1024.0)*10) / 10
					}
					if txDiff >= 0 {
						metrics.NetTxRateKBps = math.Round((float64(txDiff)/elapsed/1024.0)*10) / 10
					}
				}
			}
			netSampleMap[sessionId] = netSampleRecord{
				rxBytes:    rxBytes,
				txBytes:    txBytes,
				sampleTime: now,
			}
			netSampleMu.Unlock()
		} else if strings.HasPrefix(trimmed, "UPTIME---") || strings.Contains(trimmed, "up") {
			metrics.UptimeStr = parseUptime(trimmed)
		}
	}

	return metrics, nil
}

// parseCPUStat 解析 /proc/stat 第一行
func parseCPUStat(line string) float64 {
	fields := strings.Fields(line)
	if len(fields) < 5 {
		return 0.0
	}
	var total float64
	var idle float64
	for i, f := range fields[1:] {
		val, _ := strconv.ParseFloat(f, 64)
		total += val
		if i == 3 { // idle index in fields[1:]
			idle = val
		}
	}
	if total == 0 {
		return 0.0
	}
	usage := (1.0 - idle/total) * 100.0
	if usage < 0 {
		usage = 0.0
	}
	if usage > 100 {
		usage = 100.0
	}
	return math.Round(usage*10) / 10
}

// parseMemInfo 解析 /proc/meminfo
func parseMemInfo(content string) (usagePercent float64, totalMB int64, usedMB int64) {
	lines := strings.Split(content, "\n")
	var totalKB, availKB, freeKB, buffersKB, cachedKB int64
	for _, line := range lines {
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		val, _ := strconv.ParseInt(parts[1], 10, 64)
		switch parts[0] {
		case "MemTotal:":
			totalKB = val
		case "MemAvailable:":
			availKB = val
		case "MemFree:":
			freeKB = val
		case "Buffers:":
			buffersKB = val
		case "Cached:":
			cachedKB = val
		}
	}

	if totalKB == 0 {
		return 0, 0, 0
	}

	totalMB = totalKB / 1024
	if availKB > 0 {
		usedMB = (totalKB - availKB) / 1024
	} else {
		usedMB = (totalKB - freeKB - buffersKB - cachedKB) / 1024
	}

	if usedMB < 0 {
		usedMB = 0
	}
	if totalMB > 0 {
		usagePercent = math.Round(float64(usedMB)/float64(totalMB)*1000) / 10
	}
	return usagePercent, totalMB, usedMB
}

// parseDFOutput 解析 df -Pk / 输出
func parseDFOutput(content string) (usagePercent float64, totalGB float64, usedGB float64) {
	lines := strings.Split(strings.TrimSpace(content), "\n")
	lastLine := lines[len(lines)-1]
	fields := strings.Fields(lastLine)
	if len(fields) >= 5 {
		totalKB, _ := strconv.ParseFloat(fields[1], 64)
		usedKB, _ := strconv.ParseFloat(fields[2], 64)
		if totalKB > 0 {
			totalGB = math.Round(totalKB/(1024*1024)*10) / 10
			usedGB = math.Round(usedKB/(1024*1024)*10) / 10
			usagePercent = math.Round(usedKB/totalKB*1000) / 10
		}
	}
	return usagePercent, totalGB, usedGB
}

// parseUptime 解析 uptime 输出
func parseUptime(content string) string {
	content = strings.TrimPrefix(content, "UPTIME---")
	content = strings.TrimSpace(content)
	if idx := strings.Index(content, "up "); idx != -1 {
		sub := content[idx+3:]
		if commaIdx := strings.Index(sub, ","); commaIdx != -1 {
			return sub[:commaIdx]
		}
		return sub
	}
	return content
}

// GetRemoteProcesses 获取远程进程列表
func GetRemoteProcesses(client *ssh.Client) ([]models.RemoteProcessItem, error) {
	cmd := `ps -eo pid,user,pcpu,pmem,stat,time,comm --sort=-%cpu 2>/dev/null | head -n 60`
	out, err := runSSHExecHelper(client, cmd, 4*time.Second)
	if err != nil {
		return nil, err
	}

	return ParseProcessList(out), nil
}

// ParseProcessList 解析 ps 输出
func ParseProcessList(out string) []models.RemoteProcessItem {
	var items []models.RemoteProcessItem
	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) <= 1 {
		return items
	}

	for _, line := range lines[1:] {
		fields := strings.Fields(line)
		if len(fields) < 7 {
			continue
		}
		pid, err := strconv.Atoi(fields[0])
		if err != nil {
			continue
		}
		user := fields[1]
		cpu, _ := strconv.ParseFloat(fields[2], 64)
		mem, _ := strconv.ParseFloat(fields[3], 64)
		status := fields[4]
		runTime := fields[5]
		comm := strings.Join(fields[6:], " ")

		items = append(items, models.RemoteProcessItem{
			PID:     pid,
			User:    user,
			CPU:     cpu,
			Mem:     mem,
			Status:  status,
			Time:    runTime,
			Command: comm,
		})
	}
	return items
}

// KillRemoteProcess 结束远程进程
func KillRemoteProcess(client *ssh.Client, pid int, force bool) error {
	sig := "-15"
	if force {
		sig = "-9"
	}
	cmd := fmt.Sprintf("kill %s %d", sig, pid)
	_, err := runSSHExecHelper(client, cmd, 3*time.Second)
	return err
}

// GetRemoteServices 获取 Systemd 服务列表
func GetRemoteServices(client *ssh.Client) ([]models.RemoteServiceItem, error) {
	cmd := `systemctl list-units --type=service --no-pager --no-legend 2>/dev/null | head -n 60`
	out, err := runSSHExecHelper(client, cmd, 4*time.Second)
	if err != nil {
		return nil, err
	}

	return ParseServiceList(out), nil
}

// ParseServiceList 解析 systemctl 输出
func ParseServiceList(out string) []models.RemoteServiceItem {
	var items []models.RemoteServiceItem
	lines := strings.Split(strings.TrimSpace(out), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		unit := fields[0]
		load := fields[1]
		active := fields[2]
		sub := fields[3]
		desc := strings.Join(fields[4:], " ")

		items = append(items, models.RemoteServiceItem{
			Unit:        unit,
			Load:        load,
			Active:      active,
			Sub:         sub,
			Description: desc,
		})
	}
	return items
}

// ControlRemoteService 控制 Systemd 服务 (start, stop, restart)
func ControlRemoteService(client *ssh.Client, serviceName string, action string) error {
	validActions := map[string]bool{"start": true, "stop": true, "restart": true, "status": true}
	if !validActions[action] {
		return fmt.Errorf("invalid service action: %s", action)
	}
	cmd := fmt.Sprintf("systemctl %s %s", action, serviceName)
	_, err := runSSHExecHelper(client, cmd, 5*time.Second)
	return err
}

// GetRemotePorts 获取远程监听端口列表
func GetRemotePorts(client *ssh.Client) ([]models.RemotePortItem, error) {
	cmd := `ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null`
	out, err := runSSHExecHelper(client, cmd, 4*time.Second)
	if err != nil {
		return nil, err
	}

	return ParsePortList(out), nil
}

// ParsePortList 解析 ss / netstat 输出
func ParsePortList(out string) []models.RemotePortItem {
	var items []models.RemotePortItem
	lines := strings.Split(strings.TrimSpace(out), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		proto := strings.ToLower(fields[0])
		if !strings.HasPrefix(proto, "tcp") && !strings.HasPrefix(proto, "udp") {
			continue
		}

		var localAddr string
		var state string

		if strings.HasPrefix(proto, "tcp") {
			if len(fields) >= 5 {
				state = fields[1]
				localAddr = fields[4]
			}
		} else {
			if len(fields) >= 4 {
				state = "UNCONN"
				localAddr = fields[3]
			}
		}

		if localAddr == "" {
			continue
		}

		items = append(items, models.RemotePortItem{
			Protocol:  proto,
			LocalAddr: localAddr,
			State:     state,
		})
	}
	return items
}

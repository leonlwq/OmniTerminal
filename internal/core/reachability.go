package core

import (
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/models"

	"golang.org/x/crypto/ssh"
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

// ProbeSSHSessionRTT 通过已建立的 SSH 会话发送信标以精准测量往返网络延迟
func ProbeSSHSessionRTT(client *ssh.Client, timeout time.Duration) (int64, error) {
	if client == nil {
		return 0, fmt.Errorf("SSH 客户端未就绪")
	}
	if timeout <= 0 {
		timeout = 1500 * time.Millisecond
	}

	start := time.Now()
	done := make(chan error, 1)

	go func() {
		// keepalive@openssh.com 请求通常在 ~10-80ms 内返回
		_, _, err := client.SendRequest("keepalive@openssh.com", true, nil)
		done <- err
	}()

	select {
	case <-done:
		rtt := time.Since(start).Milliseconds()
		if rtt <= 0 {
			rtt = 1
		}
		return rtt, nil
	case <-time.After(timeout):
		return 0, fmt.Errorf("SSH keepalive 响应超时 (%v)", timeout)
	}
}

// ProbeHopViaSSH 通过远程 SSH Client 的网络堆栈探测指定目标地址的 TCP 连通性与时延
func ProbeHopViaSSH(client *ssh.Client, targetAddr string, timeout time.Duration) (bool, int64, error) {
	if client == nil {
		return false, 0, fmt.Errorf("SSH 客户端未建立")
	}
	if targetAddr == "" {
		return false, 0, fmt.Errorf("目标地址不可为空")
	}
	if timeout <= 0 {
		timeout = 1500 * time.Millisecond
	}

	start := time.Now()
	type dialRes struct {
		conn net.Conn
		err  error
	}

	done := make(chan struct{})
	ch := make(chan dialRes, 1)
	go func() {
		c, err := client.Dial("tcp", targetAddr)
		select {
		case <-done:
			// 外部超时已提前返回，若拨号最终成功则必须即刻关闭连接，防止 SSH Channel 与远程 Socket 泄漏
			if err == nil && c != nil {
				_ = c.Close()
			}
		case ch <- dialRes{conn: c, err: err}:
		}
	}()

	select {
	case res := <-ch:
		close(done)
		if res.err != nil {
			return false, 0, res.err
		}
		_ = res.conn.Close()
		latency := time.Since(start).Milliseconds()
		if latency <= 0 {
			latency = 1
		}
		return true, latency, nil
	case <-time.After(timeout):
		close(done)
		return false, 0, fmt.Errorf("内网逐跳探测超时 (%v)", timeout)
	}
}

// InferServiceName 根据常见端口智能推断服务类型与名称
func InferServiceName(port int) string {
	switch port {
	case 3306:
		return "MySQL Database"
	case 5432:
		return "PostgreSQL Database"
	case 6379:
		return "Redis Cache"
	case 27017:
		return "MongoDB"
	case 80:
		return "HTTP Web (Nginx/Apache)"
	case 443:
		return "HTTPS Web (SSL)"
	case 8080:
		return "Web App (8080)"
	case 8443:
		return "HTTPS App (8443)"
	case 9000:
		return "MinIO / PHP-FPM"
	case 9090:
		return "Prometheus"
	case 3000:
		return "Grafana / Node Service"
	case 5000:
		return "Docker Registry / Flask"
	case 8000:
		return "FastAPI / Django"
	case 22:
		return "SSH Host"
	case 9200, 9300:
		return "Elasticsearch"
	case 5672, 15672:
		return "RabbitMQ"
	case 9092:
		return "Kafka Broker"
	default:
		return fmt.Sprintf("Service (:%d)", port)
	}
}

// DiagnoseHopReachability 针对目标节点执行端到端分段排错诊断
func DiagnoseHopReachability(client *ssh.Client, targetAddr string, timeout time.Duration) *models.ReachabilityDiagnosisResult {
	res := &models.ReachabilityDiagnosisResult{
		Target:      targetAddr,
		Hops:        make([]models.HopDiagnosisDetail, 0),
		DiagnosedAt: time.Now().Format("2006-01-02 15:04:05"),
	}

	// 第 1 跳：测量到达 SSH 宿主机的往返时延
	rtt1, err1 := ProbeSSHSessionRTT(client, timeout)
	hop1 := models.HopDiagnosisDetail{
		HopIndex: 1,
		Name:     "本机 -> SSH 跳板机/网关",
		FromAddr: "localhost",
		ToAddr:   "SSH Host",
		RttMs:    rtt1,
		Status:   "healthy",
	}
	if err1 != nil {
		hop1.Status = "broken"
		hop1.ErrorDetail = err1.Error()
	}
	res.Hops = append(res.Hops, hop1)

	// 第 2 跳：测量 SSH 宿主机到达目标服务端口的连通性
	ok2, rtt2, err2 := ProbeHopViaSSH(client, targetAddr, timeout)
	hop2 := models.HopDiagnosisDetail{
		HopIndex: 2,
		Name:     "SSH 跳板机 -> 目标服务端口",
		FromAddr: "SSH Host",
		ToAddr:   targetAddr,
		RttMs:    rtt2,
		Status:   "healthy",
	}
	if !ok2 || err2 != nil {
		hop2.Status = "broken"
		if err2 != nil {
			hop2.ErrorDetail = err2.Error()
		}
	}
	res.Hops = append(res.Hops, hop2)

	// 综合判定结论与建议
	if hop1.Status == "healthy" && hop2.Status == "healthy" {
		res.Healthy = true
		res.TotalRttMs = rtt1 + rtt2
		res.Conclusion = fmt.Sprintf("端到端链路完全通畅，总时延约 %d ms (第1跳 %d ms + 第2跳 %d ms)", res.TotalRttMs, rtt1, rtt2)
		res.Suggestion = "网络链路状态极佳，各跳 TCP 握手与端口均正常响应"
	} else if hop1.Status != "healthy" {
		res.Healthy = false
		res.Conclusion = "第一跳网络握手失败或连接断开"
		res.Suggestion = "请检查本机网络环境及 SSH 跳板机/网关连接是否正常"
	} else {
		res.Healthy = false
		errStr := ""
		if err2 != nil {
			errStr = err2.Error()
		}
		if strings.Contains(errStr, "refused") || strings.Contains(errStr, "connection refused") {
			res.Conclusion = fmt.Sprintf("跳板机连通正常，但目标端拒绝连接 (%s)", targetAddr)
			res.Suggestion = "目标主机端口未在监听，或者本地进程已退出，请检查内网对应服务状态"
		} else if strings.Contains(errStr, "timeout") || strings.Contains(errStr, "timed out") {
			res.Conclusion = fmt.Sprintf("跳板机连通正常，但探测目标端口超时 (%s)", targetAddr)
			res.Suggestion = "可能存在安全组规则拦截、内网防火墙丢包或内网路由不可达，请检查安全组端口放行配置"
		} else {
			res.Conclusion = fmt.Sprintf("跳板机连通正常，但探测目标异常: %v", errStr)
			res.Suggestion = "请核对目标 IP 地址、端口是否正确并检查内网连通性"
		}
	}

	return res
}


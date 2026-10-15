package app

import (
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/core"
	"omniterminal/internal/models"
)

// GetActiveTunnels 获取当前所有运行中的端口转发隧道
func (a *App) GetActiveTunnels() ([]models.TunnelStatusInfo, error) {
	return a.sshManager.GetActiveTunnels(), nil
}

// StopTunnel 关闭指定会话的指定端口转发隧道
func (a *App) StopTunnel(sessionId string, localAddr string) error {
	return a.sshManager.StopTunnel(sessionId, localAddr)
}

// AddActiveTunnel 运行时动态向活动 SSH 会话添加端口转发隧道
func (a *App) AddActiveTunnel(sessionId string, tunnelType string, localAddr string, remoteAddr string) error {
	return a.sshManager.StartDynamicTunnel(sessionId, tunnelType, localAddr, remoteAddr)
}

// GetNetworkTopology 提取当前所有活跃会话、跳板机链路及端口转发隧道的全局网络拓扑结构（含真实 RTT 探测与多跳服务）
func (a *App) GetNetworkTopology() (*models.NetworkTopologyData, error) {
	data := &models.NetworkTopologyData{
		Nodes:   make([]models.TopologyNode, 0),
		Edges:   make([]models.TopologyEdge, 0),
		Tunnels: make([]models.TopologyTunnel, 0),
	}

	// 1. 本机工作台根节点
	data.Nodes = append(data.Nodes, models.TopologyNode{
		ID:                 "local_root",
		Label:              "本机工作台 (Local Machine)",
		Host:               "127.0.0.1",
		Port:               0,
		User:               "localhost",
		Type:               "local",
		Status:             "connected",
		Uptime:             "-",
		ActiveTunnelsCount: 0,
		RttMs:              0,
	})

	// 获取已存盘的所有会话配置映射
	cfgMap := make(map[string]SessionConfig)
	if configs, err := a.GetSessions(); err == nil {
		for _, c := range configs {
			cfgMap[c.ID] = c
		}
	}

	a.sshManager.Mu.RLock()
	activeTunnels := a.sshManager.GetActiveTunnels()
	for _, t := range activeTunnels {
		data.Tunnels = append(data.Tunnels, models.TopologyTunnel{
			SessionID:  t.SessionID,
			Type:       t.Type,
			LocalAddr:  t.LocalAddr,
			RemoteAddr: t.RemoteAddr,
			Status:     "active",
		})
	}

	// 并发采集活跃会话的真实 RTT
	sessionRttMap := make(map[string]int64)
	var rttMu sync.Mutex
	var wg sync.WaitGroup

	for id, info := range a.sshManager.Sessions {
		if info.IsLocal || info.Protocol == "local" {
			sessionRttMap[id] = 0
			continue
		}
		if info.Client != nil {
			wg.Add(1)
			go func(sessId string, cli *core.SessionInfo) {
				defer wg.Done()
				rtt, err := core.ProbeSSHSessionRTT(cli.Client, 1200*time.Millisecond)
				if err != nil || rtt <= 0 {
					rtt = 1
				}
				rttMu.Lock()
				sessionRttMap[sessId] = rtt
				rttMu.Unlock()
			}(id, info)
		}
	}
	wg.Wait()

	for id, info := range a.sshManager.Sessions {
		cfg := cfgMap[id]
		host := cfg.Host
		if host == "" {
			host = info.Name
		}
		user := cfg.User
		port := cfg.Port
		if port == 0 {
			port = 22
		}

		uptimeStr := ""
		if !info.ConnectedAt.IsZero() {
			uptimeStr = time.Since(info.ConnectedAt).Truncate(time.Second).String()
		}

		nodeType := "target"
		if info.IsLocal {
			nodeType = "local"
		} else if cfg.JumpHostSessionID != "" {
			nodeType = "target"
		}

		// 检查此节点是否作为其他节点的跳板机
		for _, otherCfg := range cfgMap {
			if otherCfg.JumpHostSessionID == id {
				nodeType = "jumphost"
				break
			}
		}

		tunnelsCount := 0
		for _, t := range data.Tunnels {
			if t.SessionID == id {
				tunnelsCount++
			}
		}

		realRtt := sessionRttMap[id]
		if realRtt <= 0 && !info.IsLocal {
			realRtt = 1
		}

		data.Nodes = append(data.Nodes, models.TopologyNode{
			ID:                 id,
			Label:              info.Name,
			Host:               host,
			Port:               port,
			User:               user,
			Type:               nodeType,
			Status:             "connected",
			Uptime:             uptimeStr,
			ActiveTunnelsCount: tunnelsCount,
			RttMs:              realRtt,
		})

		// 建立链路拓扑边 (Edges)
		if cfg.JumpHostSessionID != "" && a.sshManager.Sessions[cfg.JumpHostSessionID] != nil {
			data.Edges = append(data.Edges, models.TopologyEdge{
				ID:     "edge_" + cfg.JumpHostSessionID + "_" + id,
				Source: cfg.JumpHostSessionID,
				Target: id,
				Type:   "jump_host",
				Label:  "ProxyJump",
				Status: "healthy",
				RttMs:  realRtt,
			})
		} else {
			data.Edges = append(data.Edges, models.TopologyEdge{
				ID:     "edge_root_" + id,
				Source: "local_root",
				Target: id,
				Type:   "direct",
				Label:  info.Protocol,
				Status: "healthy",
				RttMs:  realRtt,
			})
		}
	}

	// 2. 为端口转发隧道追加终点服务节点 (Service Nodes) 与多跳边并进行连通性探测
	for _, t := range activeTunnels {
		if t.RemoteAddr == "" {
			continue
		}
		info := a.sshManager.Sessions[t.SessionID]
		if info == nil {
			continue
		}

		svcNodeId := fmt.Sprintf("svc_%s_%s", t.SessionID, strings.ReplaceAll(t.RemoteAddr, ":", "_"))
		host, portStr, err := net.SplitHostPort(t.RemoteAddr)
		port := 0
		if err == nil {
			port, _ = strconv.Atoi(portStr)
		} else {
			host = t.RemoteAddr
		}

		svcLabel := core.InferServiceName(port)

		// 主动通过宿主机的网络通道探测终点服务的连通性
		online, probeRtt, probeErr := core.ProbeHopViaSSH(info.Client, t.RemoteAddr, 1500*time.Millisecond)
		nodeStatus := "connected"
		edgeStatus := "healthy"
		errMsg := ""

		if !online || probeErr != nil {
			nodeStatus = "error"
			edgeStatus = "broken"
			if probeErr != nil {
				errMsg = probeErr.Error()
			} else {
				errMsg = "无法连通目标服务端口"
			}
		}

		data.Nodes = append(data.Nodes, models.TopologyNode{
			ID:                 svcNodeId,
			Label:              fmt.Sprintf("%s (%s)", svcLabel, t.RemoteAddr),
			Host:               host,
			Port:               port,
			User:               "service",
			Type:               "service",
			Status:             nodeStatus,
			Uptime:             "Tunnel Active",
			ActiveTunnelsCount: 0,
			RttMs:              probeRtt,
			ErrorMessage:       errMsg,
		})

		data.Edges = append(data.Edges, models.TopologyEdge{
			ID:     fmt.Sprintf("edge_tun_%s_%s", t.SessionID, svcNodeId),
			Source: t.SessionID,
			Target: svcNodeId,
			Type:   "tunnel",
			Label:  fmt.Sprintf("%s %s", t.Type, t.LocalAddr),
			Status: edgeStatus,
			RttMs:  probeRtt,
		})
	}

	a.sshManager.Mu.RUnlock()
	return data, nil
}

// DiagnoseTopologyHop 针对指定会话与下游目标执行深度网络链路排错诊断
func (a *App) DiagnoseTopologyHop(sessionId string, targetAddr string) (*models.ReachabilityDiagnosisResult, error) {
	if a.sshManager == nil {
		return nil, fmt.Errorf("SSH 管理器未就绪")
	}
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return nil, fmt.Errorf("无法获取该会话的 SSH 客户端: %v", err)
	}
	return core.DiagnoseHopReachability(client, targetAddr, 2*time.Second), nil
}




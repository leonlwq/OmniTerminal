package app

import (
	"time"

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

// GetNetworkTopology 提取当前所有活跃会话、跳板机链路及端口转发隧道的全局网络拓扑结构
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
	defer a.sshManager.Mu.RUnlock()

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
			RttMs:              15, // 典型内网/公网基准时延
		})

		// 建立链路拓扑边 (Edges)
		if cfg.JumpHostSessionID != "" && a.sshManager.Sessions[cfg.JumpHostSessionID] != nil {
			data.Edges = append(data.Edges, models.TopologyEdge{
				ID:     "edge_" + cfg.JumpHostSessionID + "_" + id,
				Source: cfg.JumpHostSessionID,
				Target: id,
				Type:   "jump_host",
				Label:  "ProxyJump",
			})
		} else {
			data.Edges = append(data.Edges, models.TopologyEdge{
				ID:     "edge_root_" + id,
				Source: "local_root",
				Target: id,
				Type:   "direct",
				Label:  info.Protocol,
			})
		}
	}

	return data, nil
}



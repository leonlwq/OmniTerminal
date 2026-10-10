package app

import (
	"omniterminal/internal/core"
	"omniterminal/internal/models"
)

// GetHostMetrics 获取指定 SSH 会话的主机性能监控指标
func (a *App) GetHostMetrics(sessionId string) (models.HostResourceMetrics, error) {
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return models.HostResourceMetrics{SessionID: sessionId, Error: err.Error()}, err
	}
	return core.SampleHostMetrics(client, sessionId)
}

// GetRemoteProcesses 获取指定 SSH 会话的远程进程列表
func (a *App) GetRemoteProcesses(sessionId string) ([]models.RemoteProcessItem, error) {
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return nil, err
	}
	return core.GetRemoteProcesses(client)
}

// KillRemoteProcess 终止远程进程
func (a *App) KillRemoteProcess(sessionId string, pid int, force bool) error {
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return err
	}
	return core.KillRemoteProcess(client, pid, force)
}

// GetRemoteServices 获取 Systemd 服务列表
func (a *App) GetRemoteServices(sessionId string) ([]models.RemoteServiceItem, error) {
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return nil, err
	}
	return core.GetRemoteServices(client)
}

// ControlRemoteService 控制 Systemd 服务 (start, stop, restart)
func (a *App) ControlRemoteService(sessionId string, serviceName string, action string) error {
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return err
	}
	return core.ControlRemoteService(client, serviceName, action)
}

// GetRemotePorts 获取远程监听端口列表
func (a *App) GetRemotePorts(sessionId string) ([]models.RemotePortItem, error) {
	client, err := a.sshManager.GetSSHClient(sessionId)
	if err != nil {
		return nil, err
	}
	return core.GetRemotePorts(client)
}

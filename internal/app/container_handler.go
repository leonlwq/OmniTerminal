package app

import (
	"fmt"

	"omniterminal/internal/core"
	"omniterminal/internal/models"
)

// ListDockerContainers 列出指定会话或本地的 Docker 容器
func (a *App) ListDockerContainers(sessionId string) ([]models.ContainerInfo, error) {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return nil, fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.ListDockerContainers(info)
}

// ListK8sPods 列出指定会话或本地的 Kubernetes Pods
func (a *App) ListK8sPods(sessionId, namespace, kubeconfig string) ([]models.PodInfo, error) {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return nil, fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.ListK8sPods(info, namespace, kubeconfig)
}

// GetDockerLogs 获取指定容器的输出日志
func (a *App) GetDockerLogs(sessionId, containerId string, tail int) (string, error) {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return "", fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.GetDockerLogs(info, containerId, tail)
}

// RestartDockerContainer 重启指定 Docker 容器
func (a *App) RestartDockerContainer(sessionId, containerId string) error {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.RestartDockerContainer(info, containerId)
}

// StopDockerContainer 停止指定 Docker 容器
func (a *App) StopDockerContainer(sessionId, containerId string) error {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.StopDockerContainer(info, containerId)
}

// ConnectContainerShell 为 Docker 或 Kubernetes 容器启动交互式终端连接
func (a *App) ConnectContainerShell(
	id string,
	name string,
	containerType string,
	hostSessionId string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	shell string,
	cols int,
	rows int,
	overrideTheme string,
	overrideFontSize int,
	logConfig models.LogConfig,
	encoding string,
) error {
	return a.sshManager.ConnectContainerShell(
		id,
		name,
		containerType,
		hostSessionId,
		containerId,
		podName,
		namespace,
		k8sContainer,
		shell,
		cols,
		rows,
		overrideTheme,
		overrideFontSize,
		logConfig,
		encoding,
	)
}

// ListContainerFiles 列出容器内虚拟文件系统的目录与文件
func (a *App) ListContainerFiles(
	sessionId string,
	containerType string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	remotePath string,
) ([]models.ContainerFileInfo, error) {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return nil, fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.ListContainerFiles(info, containerType, containerId, podName, namespace, k8sContainer, remotePath)
}

// ReadContainerFile 读取容器内指定文件的文本内容
func (a *App) ReadContainerFile(
	sessionId string,
	containerType string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	filePath string,
) (string, error) {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return "", fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.ReadContainerFile(info, containerType, containerId, podName, namespace, k8sContainer, filePath)
}

// WriteContainerFile 将修改后的文本写回容器内部
func (a *App) WriteContainerFile(
	sessionId string,
	containerType string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	filePath string,
	content string,
) error {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.WriteContainerFile(info, containerType, containerId, podName, namespace, k8sContainer, filePath, content)
}

// GetMultiContainerLogs 并发获取多个容器的最新日志
func (a *App) GetMultiContainerLogs(sessionId string, containerIds []string, tail int) (map[string]string, error) {
	var info *core.SessionInfo
	if sessionId != "" && sessionId != "local" {
		a.sshManager.Mu.RLock()
		info = a.sshManager.Sessions[sessionId]
		a.sshManager.Mu.RUnlock()
		if info == nil {
			return nil, fmt.Errorf("未找到对应 SSH 会话 %s", sessionId)
		}
	}
	return core.GetMultiContainerLogs(info, containerIds, tail)
}


package core

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"path"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"

	"omniterminal/internal/models"
)

// ListDockerContainers 列出 Docker 容器（支持远程 SSH 会话与本地 Docker 守护进程）
func ListDockerContainers(info *SessionInfo) ([]models.ContainerInfo, error) {
	cmdStr := "docker ps -a --format '{{json .}}'"
	var output []byte
	var err error

	if info != nil && info.Client != nil && !info.IsLocal {
		session, sErr := info.Client.NewSession()
		if sErr != nil {
			return nil, fmt.Errorf("创建远程 SSH 会话失败: %w", sErr)
		}
		defer session.Close()
		output, err = session.CombinedOutput(cmdStr)
	} else {
		// 本地执行
		cmd := exec.Command("sh", "-c", cmdStr)
		output, err = cmd.CombinedOutput()
	}

	if err != nil {
		return nil, fmt.Errorf("执行 docker ps 失败: %v, 输出: %s", err, string(output))
	}

	var containers []models.ContainerInfo
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		type dockerJSON struct {
			ID        string `json:"ID"`
			Names     string `json:"Names"`
			Image     string `json:"Image"`
			Command   string `json:"Command"`
			CreatedAt string `json:"CreatedAt"`
			Status    string `json:"Status"`
			State     string `json:"State"`
			Ports     string `json:"Ports"`
		}

		var dj dockerJSON
		if err := json.Unmarshal([]byte(line), &dj); err != nil {
			// 兼容不同 Docker 版本字段大小写
			continue
		}

		containers = append(containers, models.ContainerInfo{
			ID:        dj.ID,
			Names:     dj.Names,
			Image:     dj.Image,
			Command:   dj.Command,
			CreatedAt: dj.CreatedAt,
			Status:    dj.Status,
			State:     dj.State,
			Ports:     dj.Ports,
		})
	}

	return containers, nil
}

// ListK8sPods 列出 Kubernetes Pods（支持指定命名空间与 kubeconfig）
func ListK8sPods(info *SessionInfo, namespace, kubeconfig string) ([]models.PodInfo, error) {
	args := []string{"kubectl", "get", "pods", "-o", "json"}
	if namespace != "" && namespace != "all" {
		args = append(args, "-n", namespace)
	} else {
		args = append(args, "-A")
	}
	if kubeconfig != "" {
		args = append(args, "--kubeconfig", kubeconfig)
	}

	cmdStr := strings.Join(args, " ")
	var output []byte
	var err error

	if info != nil && info.Client != nil && !info.IsLocal {
		session, sErr := info.Client.NewSession()
		if sErr != nil {
			return nil, fmt.Errorf("创建远程 SSH 会话失败: %w", sErr)
		}
		defer session.Close()
		output, err = session.CombinedOutput(cmdStr)
	} else {
		cmd := exec.Command("sh", "-c", cmdStr)
		output, err = cmd.CombinedOutput()
	}

	if err != nil {
		return nil, fmt.Errorf("执行 kubectl get pods 失败: %v, 输出: %s", err, string(output))
	}

	type k8sContainerSpec struct {
		Name string `json:"name"`
	}
	type k8sContainerStatus struct {
		Name         string `json:"name"`
		Ready        bool   `json:"ready"`
		RestartCount int    `json:"restartCount"`
	}
	type k8sPodItem struct {
		Metadata struct {
			Name              string `json:"name"`
			Namespace         string `json:"namespace"`
			CreationTimestamp string `json:"creationTimestamp"`
		} `json:"metadata"`
		Status struct {
			Phase             string               `json:"phase"`
			PodIP             string               `json:"podIP"`
			ContainerStatuses []k8sContainerStatus `json:"containerStatuses"`
		} `json:"status"`
		Spec struct {
			NodeName   string             `json:"nodeName"`
			Containers []k8sContainerSpec `json:"containers"`
		} `json:"spec"`
	}
	type k8sPodList struct {
		Items []k8sPodItem `json:"items"`
	}

	var podList k8sPodList
	if err := json.Unmarshal(output, &podList); err != nil {
		return nil, fmt.Errorf("解析 K8s Pod 列表失败: %w", err)
	}

	var pods []models.PodInfo
	for _, item := range podList.Items {
		totalContainers := len(item.Spec.Containers)
		readyContainers := 0
		restarts := 0
		var cNames []string
		for _, c := range item.Spec.Containers {
			cNames = append(cNames, c.Name)
		}
		for _, cs := range item.Status.ContainerStatuses {
			if cs.Ready {
				readyContainers++
			}
			restarts += cs.RestartCount
		}

		readyStr := fmt.Sprintf("%d/%d", readyContainers, totalContainers)
		pods = append(pods, models.PodInfo{
			Name:       item.Metadata.Name,
			Namespace:  item.Metadata.Namespace,
			Status:     item.Status.Phase,
			Ready:      readyStr,
			Restarts:   restarts,
			Age:        item.Metadata.CreationTimestamp,
			IP:         item.Status.PodIP,
			Node:       item.Spec.NodeName,
			Containers: cNames,
		})
	}

	return pods, nil
}

// GetDockerLogs 获取容器近期日志
func GetDockerLogs(info *SessionInfo, containerId string, tail int) (string, error) {
	if tail <= 0 {
		tail = 100
	}
	cmdStr := fmt.Sprintf("docker logs --tail %d %s", tail, containerId)
	var output []byte
	var err error

	if info != nil && info.Client != nil && !info.IsLocal {
		session, sErr := info.Client.NewSession()
		if sErr != nil {
			return "", fmt.Errorf("创建远程 SSH 会话失败: %w", sErr)
		}
		defer session.Close()
		output, err = session.CombinedOutput(cmdStr)
	} else {
		cmd := exec.Command("sh", "-c", cmdStr)
		output, err = cmd.CombinedOutput()
	}

	if err != nil {
		return string(output), fmt.Errorf("读取日志失败: %w", err)
	}
	return string(output), nil
}

// RestartDockerContainer 重启指定的 Docker 容器
func RestartDockerContainer(info *SessionInfo, containerId string) error {
	cmdStr := fmt.Sprintf("docker restart %s", containerId)
	var output []byte
	var err error

	if info != nil && info.Client != nil && !info.IsLocal {
		session, sErr := info.Client.NewSession()
		if sErr != nil {
			return fmt.Errorf("创建远程 SSH 会话失败: %w", sErr)
		}
		defer session.Close()
		output, err = session.CombinedOutput(cmdStr)
	} else {
		cmd := exec.Command("sh", "-c", cmdStr)
		output, err = cmd.CombinedOutput()
	}

	if err != nil {
		return fmt.Errorf("重启容器失败: %v, 输出: %s", err, string(output))
	}
	return nil
}

// StopDockerContainer 停止指定的 Docker 容器
func StopDockerContainer(info *SessionInfo, containerId string) error {
	cmdStr := fmt.Sprintf("docker stop %s", containerId)
	var output []byte
	var err error

	if info != nil && info.Client != nil && !info.IsLocal {
		session, sErr := info.Client.NewSession()
		if sErr != nil {
			return fmt.Errorf("创建远程 SSH 会话失败: %w", sErr)
		}
		defer session.Close()
		output, err = session.CombinedOutput(cmdStr)
	} else {
		cmd := exec.Command("sh", "-c", cmdStr)
		output, err = cmd.CombinedOutput()
	}

	if err != nil {
		return fmt.Errorf("停止容器失败: %v, 输出: %s", err, string(output))
	}
	return nil
}

// runHostCmd 在宿主 SSH 或本地执行命令，可选传入标准输入
func runHostCmd(info *SessionInfo, cmdStr string, input []byte) ([]byte, error) {
	if info != nil && info.Client != nil && !info.IsLocal {
		session, err := info.Client.NewSession()
		if err != nil {
			return nil, fmt.Errorf("创建远程 SSH 会话失败: %w", err)
		}
		defer session.Close()
		if len(input) > 0 {
			session.Stdin = bytes.NewReader(input)
		}
		return session.CombinedOutput(cmdStr)
	}

	cmd := exec.Command("sh", "-c", cmdStr)
	HideConsoleWindow(cmd)
	if len(input) > 0 {
		cmd.Stdin = bytes.NewReader(input)
	}
	return cmd.CombinedOutput()
}

// ListContainerFiles 列出容器内指定路径的文件与目录 (支持 Docker 与 K8s)
func ListContainerFiles(
	info *SessionInfo,
	containerType string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	remotePath string,
) ([]models.ContainerFileInfo, error) {
	if remotePath == "" {
		remotePath = "/"
	}
	remotePath = path.Clean(remotePath)

	var cmdStr string
	if containerType == "docker" {
		cmdStr = fmt.Sprintf("docker exec %s ls -la --full-time '%s' 2>/dev/null || docker exec %s ls -la '%s'", containerId, remotePath, containerId, remotePath)
	} else {
		k8sPrefix := fmt.Sprintf("kubectl exec %s -n %s", podName, namespace)
		if k8sContainer != "" {
			k8sPrefix += " -c " + k8sContainer
		}
		cmdStr = fmt.Sprintf("%s -- ls -la --full-time '%s' 2>/dev/null || %s -- ls -la '%s'", k8sPrefix, remotePath, k8sPrefix, remotePath)
	}

	output, err := runHostCmd(info, cmdStr, nil)
	if err != nil && len(output) == 0 {
		return nil, fmt.Errorf("读取容器目录失败: %w", err)
	}

	var files []models.ContainerFileInfo
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total ") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 8 {
			continue
		}

		mode := parts[0]
		isDir := strings.HasPrefix(mode, "d")
		isSymlink := strings.HasPrefix(mode, "l")
		size, _ := strconv.ParseInt(parts[4], 10, 64)

		var name string
		var linkTarget string
		if isSymlink && strings.Contains(line, " -> ") {
			linkSplit := strings.Split(line, " -> ")
			linkTarget = strings.TrimSpace(linkSplit[1])
			nameParts := strings.Fields(linkSplit[0])
			name = nameParts[len(nameParts)-1]
		} else {
			name = parts[len(parts)-1]
		}

		if name == "." || name == ".." {
			continue
		}

		modTime := strings.Join(parts[5:len(parts)-1], " ")
		fullPath := path.Join(remotePath, name)
		if remotePath == "/" && !strings.HasPrefix(fullPath, "/") {
			fullPath = "/" + name
		}

		files = append(files, models.ContainerFileInfo{
			Name:       name,
			Path:       fullPath,
			Size:       size,
			Mode:       mode,
			ModTime:    modTime,
			IsDir:      isDir,
			IsSymlink:  isSymlink,
			LinkTarget: linkTarget,
		})
	}

	return files, nil
}

// ReadContainerFile 读取容器内指定文件的文本内容
func ReadContainerFile(
	info *SessionInfo,
	containerType string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	filePath string,
) (string, error) {
	if filePath == "" {
		return "", errors.New("文件路径不能为空")
	}

	var cmdStr string
	if containerType == "docker" {
		cmdStr = fmt.Sprintf("docker exec %s head -c 2097152 '%s'", containerId, filePath)
	} else {
		k8sPrefix := fmt.Sprintf("kubectl exec %s -n %s", podName, namespace)
		if k8sContainer != "" {
			k8sPrefix += " -c " + k8sContainer
		}
		cmdStr = fmt.Sprintf("%s -- head -c 2097152 '%s'", k8sPrefix, filePath)
	}

	output, err := runHostCmd(info, cmdStr, nil)
	if err != nil && len(output) == 0 {
		return "", fmt.Errorf("读取文件失败: %w", err)
	}
	return string(output), nil
}

// WriteContainerFile 将内容写回容器内指定文件
func WriteContainerFile(
	info *SessionInfo,
	containerType string,
	containerId string,
	podName string,
	namespace string,
	k8sContainer string,
	filePath string,
	content string,
) error {
	if filePath == "" {
		return errors.New("文件路径不能为空")
	}

	var cmdStr string
	if containerType == "docker" {
		cmdStr = fmt.Sprintf("docker exec -i %s sh -c \"cat > '%s'\"", containerId, filePath)
	} else {
		k8sPrefix := fmt.Sprintf("kubectl exec -i %s -n %s", podName, namespace)
		if k8sContainer != "" {
			k8sPrefix += " -c " + k8sContainer
		}
		cmdStr = fmt.Sprintf("%s -- sh -c \"cat > '%s'\"", k8sPrefix, filePath)
	}

	output, err := runHostCmd(info, cmdStr, []byte(content))
	if err != nil {
		return fmt.Errorf("写回文件失败: %v, 输出: %s", err, string(output))
	}
	return nil
}

// GetMultiContainerLogs 并发聚合获取多个容器的最新日志
func GetMultiContainerLogs(info *SessionInfo, containerIds []string, tail int) (map[string]string, error) {
	if tail <= 0 {
		tail = 100
	}

	results := make(map[string]string)
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, cid := range containerIds {
		if cid == "" {
			continue
		}
		wg.Add(1)
		go func(cId string) {
			defer wg.Done()
			logs, err := GetDockerLogs(info, cId, tail)
			mu.Lock()
			if err != nil {
				results[cId] = fmt.Sprintf("[获取日志异常]: %v", err)
			} else {
				results[cId] = logs
			}
			mu.Unlock()
		}(cid)
	}

	wg.Wait()
	return results, nil
}

// ConnectContainerShell 为 Docker 或 Kubernetes 容器创建交互式终端会话
func (m *SSHManager) ConnectContainerShell(
	id string,
	name string,
	containerType string, // "docker" | "k8s"
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
	if shell == "" {
		shell = "/bin/sh"
	}

	// 1. 远程 SSH 宿主机挂载
	if hostSessionId != "" && hostSessionId != "local" {
		m.Mu.RLock()
		hostInfo := m.Sessions[hostSessionId]
		m.Mu.RUnlock()

		if hostInfo == nil || hostInfo.Client == nil {
			return fmt.Errorf("指定的宿主 SSH 会话不存在或未连接: %s", hostSessionId)
		}

		session, err := hostInfo.Client.NewSession()
		if err != nil {
			return fmt.Errorf("创建远程会话失败: %w", err)
		}

		modes := ssh.TerminalModes{
			ssh.ECHO:          1,
			ssh.TTY_OP_ISPEED: 14400,
			ssh.TTY_OP_OSPEED: 14400,
		}
		if err := session.RequestPty("xterm-256color", rows, cols, modes); err != nil {
			session.Close()
			return fmt.Errorf("请求 PTY 终端设备失败: %w", err)
		}

		stdin, err := session.StdinPipe()
		if err != nil {
			session.Close()
			return fmt.Errorf("获取输入管道失败: %w", err)
		}
		stdout, err := session.StdoutPipe()
		if err != nil {
			session.Close()
			return fmt.Errorf("获取输出管道失败: %w", err)
		}

		var cmdStr string
		if containerType == "docker" {
			cmdStr = fmt.Sprintf("docker exec -it %s %s", containerId, shell)
		} else {
			if k8sContainer != "" {
				cmdStr = fmt.Sprintf("kubectl exec -it %s -n %s -c %s -- %s", podName, namespace, k8sContainer, shell)
			} else {
				cmdStr = fmt.Sprintf("kubectl exec -it %s -n %s -- %s", podName, namespace, shell)
			}
		}

		if err := session.Start(cmdStr); err != nil {
			session.Close()
			return fmt.Errorf("启动容器终端命令失败: %w", err)
		}

		logger, _ := NewSessionLogger(logConfig, name, containerType)

		m.Mu.Lock()
		m.Sessions[id] = &SessionInfo{
			ID:          id,
			Protocol:    containerType,
			Client:      hostInfo.Client,
			Session:     session,
			WriteCloser: stdin,
			Encoding:    encoding,
			Logger:      logger,
			ConnectedAt: time.Now(),
		}
		m.Mu.Unlock()

		wailsruntime.EventsEmit(m.Ctx, "terminal-ready", map[string]interface{}{
			"id":    id,
			"theme": overrideTheme,
			"font":  overrideFontSize,
		})

		go m.readLoop(id, stdout, m.Sessions[id])
		return nil
	}

	// 2. 本地宿主环境挂载
	var binary string
	var args []string
	if containerType == "docker" {
		binary = "docker"
		args = []string{"exec", "-it", containerId, shell}
	} else {
		binary = "kubectl"
		args = []string{"exec", "-it", podName, "-n", namespace}
		if k8sContainer != "" {
			args = append(args, "-c", k8sContainer)
		}
		args = append(args, "--", shell)
	}

	c := exec.Command(binary, args...)
	c.Env = getLocalShellEnv(encoding)
	HideConsoleWindow(c)

	var ptmx io.ReadWriteCloser
	if runtime.GOOS == "windows" {
		stdin, err := c.StdinPipe()
		if err != nil {
			return fmt.Errorf("启动容器终端失败 (stdin): %v", err)
		}
		stdout, err := c.StdoutPipe()
		if err != nil {
			return fmt.Errorf("启动容器终端失败 (stdout): %v", err)
		}
		c.Stderr = c.Stdout
		if err := c.Start(); err != nil {
			return fmt.Errorf("启动容器终端失败: %v", err)
		}
		ptmx = &localPtyWrapper{
			cmd:    c,
			stdin:  stdin,
			stdout: stdout,
		}
	} else {
		ptmxFile, err := pty.StartWithSize(c, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
		if err != nil {
			return fmt.Errorf("启动本地容器终端失败: %v", err)
		}
		ptmx = ptmxFile
	}

	logger, _ := NewSessionLogger(logConfig, name, containerType)

	m.Mu.Lock()
	m.Sessions[id] = &SessionInfo{
		ID:          id,
		Protocol:    containerType,
		WriteCloser: ptmx,
		Ptmx:        ptmx,
		IsLocal:     true,
		LocalCmd:    c,
		Encoding:    encoding,
		Logger:      logger,
		ConnectedAt: time.Now(),
	}
	m.Mu.Unlock()

	wailsruntime.EventsEmit(m.Ctx, "terminal-ready", map[string]interface{}{
		"id":    id,
		"theme": overrideTheme,
		"font":  overrideFontSize,
	})

	go m.readLoop(id, ptmx, m.Sessions[id])
	return nil
}


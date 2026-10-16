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

// defaultContainerPathPrefix 为容器与命令执行提供广泛的 PATH 兼容前缀
const defaultContainerPathPrefix = "export PATH=\"/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:$HOME/bin:$HOME/.local/bin:$HOME/.docker/bin:$PATH\"; "

// runDockerHostCmd 智能执行 Docker 命令，若权限受限则自动尝试 sudo -n 与 podman
func runDockerHostCmd(info *SessionInfo, args string, input []byte) ([]byte, error) {
	// 1. 直接尝试 docker
	out, err := runHostCmd(info, "docker "+args, input)
	if err == nil {
		return out, nil
	}

	outStr := string(out)
	lower := strings.ToLower(outStr)

	// 2. 若报权限不足 (permission denied / docker daemon socket)，尝试 sudo -n docker
	if strings.Contains(lower, "permission denied") ||
		strings.Contains(lower, "docker daemon socket") ||
		strings.Contains(lower, "dial unix") ||
		strings.Contains(lower, "got permission denied") {
		sudoOut, sudoErr := runHostCmd(info, "sudo -n docker "+args, input)
		if sudoErr == nil {
			return sudoOut, nil
		}
	}

	// 3. 若报命令未找到，尝试 podman 或 sudo -n podman
	if strings.Contains(lower, "command not found") || strings.Contains(lower, "not found") {
		podOut, podErr := runHostCmd(info, "podman "+args, input)
		if podErr == nil {
			return podOut, nil
		}
		sudoPodOut, sudoPodErr := runHostCmd(info, "sudo -n podman "+args, input)
		if sudoPodErr == nil {
			return sudoPodOut, nil
		}
	}

	// 4. 若为其它报错，也尝试一次 sudo -n docker 作为保底
	if !strings.Contains(lower, "permission denied") {
		sudoOut, sudoErr := runHostCmd(info, "sudo -n docker "+args, input)
		if sudoErr == nil {
			return sudoOut, nil
		}
	}

	return out, err
}

// parseDockerContainersFromJSON 解析 docker ps --format '{{json .}}' 输出
func parseDockerContainersFromJSON(output string) []models.ContainerInfo {
	var containers []models.ContainerInfo
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}

		var m map[string]interface{}
		if err := json.Unmarshal([]byte(line), &m); err != nil {
			continue
		}

		getString := func(keys ...string) string {
			for _, k := range keys {
				if v, ok := m[k]; ok && v != nil {
					switch val := v.(type) {
					case string:
						return strings.TrimSpace(val)
					case []interface{}:
						var parts []string
						for _, item := range val {
							if s, ok := item.(string); ok {
								parts = append(parts, s)
							}
						}
						return strings.Join(parts, ", ")
					case fmt.Stringer:
						return val.String()
					default:
						return fmt.Sprintf("%v", val)
					}
				}
			}
			return ""
		}

		id := getString("ID", "Id", "id", "ContainerID", "container_id")
		names := getString("Names", "names", "Name", "name")
		image := getString("Image", "image")
		status := getString("Status", "status")
		state := getString("State", "state")
		ports := getString("Ports", "ports")
		command := getString("Command", "command")
		createdAt := getString("CreatedAt", "createdAt", "created_at", "Created", "created")

		if id == "" && names == "" {
			continue
		}

		if state == "" {
			lowerStatus := strings.ToLower(status)
			if strings.HasPrefix(lowerStatus, "up") {
				state = "running"
			} else if strings.HasPrefix(lowerStatus, "exited") {
				state = "exited"
			} else if strings.HasPrefix(lowerStatus, "created") {
				state = "created"
			} else {
				state = "stopped"
			}
		}

		containers = append(containers, models.ContainerInfo{
			ID:        id,
			Names:     names,
			Image:     image,
			Command:   command,
			CreatedAt: createdAt,
			Status:    status,
			State:     state,
			Ports:     ports,
		})
	}
	return containers
}

// parseDockerContainersFromTSV 解析制表符分隔格式
func parseDockerContainersFromTSV(output string) []models.ContainerInfo {
	var containers []models.ContainerInfo
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 3 {
			continue
		}

		id := strings.TrimSpace(parts[0])
		names := strings.TrimSpace(parts[1])
		image := strings.TrimSpace(parts[2])
		status := ""
		if len(parts) > 3 {
			status = strings.TrimSpace(parts[3])
		}
		state := ""
		if len(parts) > 4 {
			state = strings.TrimSpace(parts[4])
		}
		ports := ""
		if len(parts) > 5 {
			ports = strings.TrimSpace(parts[5])
		}
		command := ""
		if len(parts) > 6 {
			command = strings.TrimSpace(parts[6])
		}
		createdAt := ""
		if len(parts) > 7 {
			createdAt = strings.TrimSpace(parts[7])
		}

		if id == "" && names == "" {
			continue
		}

		if state == "" {
			lowerStatus := strings.ToLower(status)
			if strings.HasPrefix(lowerStatus, "up") {
				state = "running"
			} else if strings.HasPrefix(lowerStatus, "exited") {
				state = "exited"
			} else {
				state = "stopped"
			}
		}

		containers = append(containers, models.ContainerInfo{
			ID:        id,
			Names:     names,
			Image:     image,
			Command:   command,
			CreatedAt: createdAt,
			Status:    status,
			State:     state,
			Ports:     ports,
		})
	}
	return containers
}

// parseDockerContainersFromTable 解析原生 docker ps 表格文本
func parseDockerContainersFromTable(output string) []models.ContainerInfo {
	var containers []models.ContainerInfo
	lines := strings.Split(output, "\n")
	if len(lines) < 2 {
		return nil
	}

	headerLine := lines[0]
	upperHeader := strings.ToUpper(headerLine)
	if !strings.Contains(upperHeader, "IMAGE") || !strings.Contains(upperHeader, "NAMES") {
		return nil
	}

	for _, line := range lines[1:] {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		fields := strings.Fields(trimmed)
		if len(fields) < 4 {
			continue
		}

		id := fields[0]
		name := fields[len(fields)-1]
		image := fields[1]
		status := ""
		for i, f := range fields {
			if strings.EqualFold(f, "Up") || strings.EqualFold(f, "Exited") {
				status = strings.Join(fields[i:len(fields)-1], " ")
				break
			}
		}
		if status == "" {
			status = "running"
		}

		state := "running"
		if strings.HasPrefix(strings.ToLower(status), "exited") {
			state = "exited"
		}

		containers = append(containers, models.ContainerInfo{
			ID:     id,
			Names:  name,
			Image:  image,
			Status: status,
			State:  state,
		})
	}
	return containers
}

// ListDockerContainers 列出 Docker 容器（支持远程 SSH 会话与本地 Docker 守护进程）
func ListDockerContainers(info *SessionInfo) ([]models.ContainerInfo, error) {
	// 1. JSON 格式优先
	out, err := runDockerHostCmd(info, "ps -a --format '{{json .}}'", nil)
	if err == nil && len(out) > 0 {
		containers := parseDockerContainersFromJSON(string(out))
		if len(containers) > 0 {
			return containers, nil
		}
	}

	// 2. 制表符格式 (所有 Docker 版本百分之百兼容保底)
	tsvFormat := `"{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.State}}\t{{.Ports}}\t{{.Command}}\t{{.CreatedAt}}"`
	outTSV, errTSV := runDockerHostCmd(info, "ps -a --format "+tsvFormat, nil)
	if errTSV == nil && len(outTSV) > 0 {
		containers := parseDockerContainersFromTSV(string(outTSV))
		if len(containers) > 0 {
			return containers, nil
		}
	}

	// 3. 原生表格文本格式保底
	outTable, errTable := runDockerHostCmd(info, "ps -a", nil)
	if errTable == nil && len(outTable) > 0 {
		containers := parseDockerContainersFromTable(string(outTable))
		if len(containers) > 0 {
			return containers, nil
		}
	}

	// 整合错误排障信息
	lastErr := err
	lastOut := string(out)
	if lastErr == nil {
		lastErr = errTSV
		lastOut = string(outTSV)
	}
	if lastErr == nil {
		lastErr = errTable
		lastOut = string(outTable)
	}

	if lastErr != nil {
		lower := strings.ToLower(lastOut)
		if strings.Contains(lower, "permission denied") || strings.Contains(lower, "docker daemon socket") || strings.Contains(lower, "dial unix") {
			return nil, fmt.Errorf("Docker 权限不足 (请确认用户加入 docker 组或配置 sudo 免密): %s", strings.TrimSpace(lastOut))
		}
		if strings.Contains(lower, "command not found") || strings.Contains(lower, "not found") {
			return nil, fmt.Errorf("未在目标主机检测到 Docker 或 Podman 命令: %s", strings.TrimSpace(lastOut))
		}
		return nil, fmt.Errorf("执行 docker ps 失败: %v, 输出: %s", lastErr, strings.TrimSpace(lastOut))
	}

	return []models.ContainerInfo{}, nil
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
	args := fmt.Sprintf("logs --tail %d %s", tail, containerId)
	output, err := runDockerHostCmd(info, args, nil)
	if err != nil {
		return string(output), fmt.Errorf("读取日志失败: %w", err)
	}
	return string(output), nil
}

// RestartDockerContainer 重启指定的 Docker 容器
func RestartDockerContainer(info *SessionInfo, containerId string) error {
	args := fmt.Sprintf("restart %s", containerId)
	output, err := runDockerHostCmd(info, args, nil)
	if err != nil {
		return fmt.Errorf("重启容器失败: %v, 输出: %s", err, string(output))
	}
	return nil
}

// StopDockerContainer 停止指定的 Docker 容器
func StopDockerContainer(info *SessionInfo, containerId string) error {
	args := fmt.Sprintf("stop %s", containerId)
	output, err := runDockerHostCmd(info, args, nil)
	if err != nil {
		return fmt.Errorf("停止容器失败: %v, 输出: %s", err, string(output))
	}
	return nil
}

// runHostCmd 在宿主 SSH 或本地执行命令，可选传入标准输入，并注入标准 PATH
func runHostCmd(info *SessionInfo, cmdStr string, input []byte) ([]byte, error) {
	fullCmd := defaultContainerPathPrefix + cmdStr
	if info != nil && info.Client != nil && !info.IsLocal {
		session, err := info.Client.NewSession()
		if err != nil {
			return nil, fmt.Errorf("创建远程 SSH 会话失败: %w", err)
		}
		defer session.Close()
		if len(input) > 0 {
			session.Stdin = bytes.NewReader(input)
		}
		return session.CombinedOutput(fullCmd)
	}

	cmd := exec.Command("sh", "-c", fullCmd)
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
			cmdStr = fmt.Sprintf("%sdocker exec -it %s %s || sudo docker exec -it %s %s || podman exec -it %s %s", defaultContainerPathPrefix, containerId, shell, containerId, shell, containerId, shell)
		} else {
			if k8sContainer != "" {
				cmdStr = fmt.Sprintf("%skubectl exec -it %s -n %s -c %s -- %s", defaultContainerPathPrefix, podName, namespace, k8sContainer, shell)
			} else {
				cmdStr = fmt.Sprintf("%skubectl exec -it %s -n %s -- %s", defaultContainerPathPrefix, podName, namespace, shell)
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


package core

import (
	"encoding/json"
	"testing"

	"omniterminal/internal/models"
)

func TestContainerInfoSerialization(t *testing.T) {
	c := models.ContainerInfo{
		ID:        "abc123def456",
		Names:     "/web-nginx",
		Image:     "nginx:latest",
		Command:   "nginx -g 'daemon off;'",
		CreatedAt: "2026-09-10 12:00:00",
		Status:    "Up 2 hours",
		State:     "running",
		Ports:     "0.0.0.0:80->80/tcp",
	}

	data, err := json.Marshal(c)
	if err != nil {
		t.Fatalf("序列化 ContainerInfo 失败: %v", err)
	}

	var decoded models.ContainerInfo
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("反序列化 ContainerInfo 失败: %v", err)
	}

	if decoded.ID != c.ID || decoded.Names != c.Names || decoded.State != "running" {
		t.Errorf("字段反序列化不一致: %+v", decoded)
	}
}

func TestPodInfoSerialization(t *testing.T) {
	pod := models.PodInfo{
		Name:       "api-service-7d8b5c96b8-x9v1k",
		Namespace:  "production",
		Status:     "Running",
		Ready:      "1/1",
		Restarts:   0,
		Age:        "3d12h",
		IP:         "10.244.1.45",
		Node:       "worker-node-1",
		Containers: []string{"api-service"},
	}

	data, err := json.Marshal(pod)
	if err != nil {
		t.Fatalf("序列化 PodInfo 失败: %v", err)
	}

	var decoded models.PodInfo
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("反序列化 PodInfo 失败: %v", err)
	}

	if decoded.Name != pod.Name || decoded.Namespace != "production" || decoded.Status != "Running" {
		t.Errorf("字段反序列化不一致: %+v", decoded)
	}
}

func TestFolderSizeProgressSerialization(t *testing.T) {
	progress := models.FolderSizeProgress{
		Path:      "/var/log",
		TotalSize: 10485760,
		FileCount: 150,
		DirCount:  12,
		Done:      true,
	}

	data, err := json.Marshal(progress)
	if err != nil {
		t.Fatalf("序列化 FolderSizeProgress 失败: %v", err)
	}

	var decoded models.FolderSizeProgress
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("反序列化 FolderSizeProgress 失败: %v", err)
	}

	if decoded.TotalSize != progress.TotalSize || decoded.FileCount != 150 || !decoded.Done {
		t.Errorf("字段反序列化不一致: %+v", decoded)
	}
}

func TestContainerFileInfoSerialization(t *testing.T) {
	fi := models.ContainerFileInfo{
		Name:       "nginx.conf",
		Path:       "/etc/nginx/nginx.conf",
		Size:       2048,
		Mode:       "-rw-r--r--",
		ModTime:    "2026-10-10 12:00:00",
		IsDir:      false,
		IsSymlink:  false,
		LinkTarget: "",
	}

	data, err := json.Marshal(fi)
	if err != nil {
		t.Fatalf("序列化 ContainerFileInfo 失败: %v", err)
	}

	var decoded models.ContainerFileInfo
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("反序列化 ContainerFileInfo 失败: %v", err)
	}

	if decoded.Name != fi.Name || decoded.Path != fi.Path || decoded.Size != fi.Size || decoded.IsDir != fi.IsDir {
		t.Errorf("字段反序列化不一致: %+v", decoded)
	}
}

func TestContainerFileEmptyPathValidation(t *testing.T) {
	_, err := ReadContainerFile(nil, "docker", "c1", "", "", "", "")
	if err == nil {
		t.Fatal("expected error for empty filePath in ReadContainerFile, got nil")
	}

	err = WriteContainerFile(nil, "docker", "c1", "", "", "", "", "test")
	if err == nil {
		t.Fatal("expected error for empty filePath in WriteContainerFile, got nil")
	}
}

func TestParseDockerContainersFormats(t *testing.T) {
	// 1. 测试兼容 JSON 格式 (包括字段大小写、Podman 格式、数组格式)
	jsonSample := `{"ID":"c1a2b3c4d5e6","Names":["alert-gateway"],"Image":"ops/alert-gateway:1.0.1","Command":"\"/app/alert-gateway\"","CreatedAt":"8 weeks ago","Status":"Up 8 weeks","State":"running","Ports":"0.0.0.0:9193->9193/tcp"}
{"id":"f6e5d4c3b2a1","names":"redis","image":"redis:alpine","command":"docker-entrypoint.sh","created_at":"4 months ago","status":"Up 2 months (healthy)","state":"running","ports":"0.0.0.0:6379->6379/tcp"}`

	jsonContainers := parseDockerContainersFromJSON(jsonSample)
	if len(jsonContainers) != 2 {
		t.Fatalf("expected 2 containers from JSON, got %d", len(jsonContainers))
	}
	if jsonContainers[0].Names != "alert-gateway" || jsonContainers[0].ID != "c1a2b3c4d5e6" {
		t.Errorf("unexpected container 0: %+v", jsonContainers[0])
	}
	if jsonContainers[1].Names != "redis" || jsonContainers[1].Ports != "0.0.0.0:6379->6379/tcp" {
		t.Errorf("unexpected container 1: %+v", jsonContainers[1])
	}

	// 2. 测试制表符格式 (TSV)
	tsvSample := "c1a2b3c4d5e6\talert-gateway\tops/alert-gateway:1.0.1\tUp 8 weeks\trunning\t0.0.0.0:9193->9193/tcp\t/app/alert-gateway\t8 weeks ago\n" +
		"f6e5d4c3b2a1\tredis\tredis:alpine\tUp 2 months (healthy)\trunning\t0.0.0.0:6379->6379/tcp\tdocker-entrypoint.sh\t4 months ago"

	tsvContainers := parseDockerContainersFromTSV(tsvSample)
	if len(tsvContainers) != 2 {
		t.Fatalf("expected 2 containers from TSV, got %d", len(tsvContainers))
	}
	if tsvContainers[0].Names != "alert-gateway" || tsvContainers[1].Names != "redis" {
		t.Errorf("unexpected TSV containers: %+v", tsvContainers)
	}

	// 3. 测试原生终端表格文本解析 (模拟用户真实终端执行 docker ps)
	tableSample := `CONTAINER ID   IMAGE                    COMMAND                  CREATED        STATUS                    PORTS                                    NAMES
c1a2b3c4d5e6   ops/alert-gateway:1.0.1  "/app/alert-gateway"     8 weeks ago    Up 8 weeks                0.0.0.0:9193->9193/tcp                   alert-gateway
f6e5d4c3b2a1   redis:alpine             "docker-entrypoint.s..." 4 months ago   Up 2 months (healthy)     0.0.0.0:6379->6379/tcp                   redis`

	tableContainers := parseDockerContainersFromTable(tableSample)
	if len(tableContainers) != 2 {
		t.Fatalf("expected 2 containers from table, got %d", len(tableContainers))
	}
	if tableContainers[0].Names != "alert-gateway" || tableContainers[1].Names != "redis" {
		t.Errorf("unexpected table containers: %+v", tableContainers)
	}
}



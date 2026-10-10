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


package core

import (
	"testing"
	"omniterminal/internal/models"
)

func TestListSerialPorts(t *testing.T) {
	ports, err := ListSerialPorts()
	if err != nil {
		t.Logf("ListSerialPorts returned error (normal if no permissions/hardware): %v", err)
	} else {
		t.Logf("Found %d serial ports: %v", len(ports), ports)
	}
}

func TestOpenSerialPortValidation(t *testing.T) {
	// 测试空路径校验
	_, err := OpenSerialPort(models.SerialConfig{})
	if err == nil {
		t.Error("Expected error for empty port path, got nil")
	}

	// 测试非法路径
	_, err = OpenSerialPort(models.SerialConfig{
		Port: "/dev/non_existent_serial_port_12345",
	})
	if err == nil {
		t.Error("Expected error for non-existent port path, got nil")
	}
}

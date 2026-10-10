package core

import (
	"fmt"
	"io"
	"sync"
	"time"

	"go.bug.st/serial"
	"omniterminal/internal/models"
)

// SerialPortWrapper 封装打开的串口句柄
type SerialPortWrapper struct {
	Port   serial.Port
	Config models.SerialConfig
	mu     sync.Mutex
}

// ListSerialPorts 枚举系统可用的串口设备列表
func ListSerialPorts() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return []string{}, err
	}
	if ports == nil {
		return []string{}, nil
	}
	return ports, nil
}

// OpenSerialPort 根据配置打开串口并返回包装对象
func OpenSerialPort(cfg models.SerialConfig) (*SerialPortWrapper, error) {
	if cfg.Port == "" {
		return nil, fmt.Errorf("串口设备路径不能为空")
	}

	baud := cfg.BaudRate
	if baud <= 0 {
		baud = 115200 // 默认波特率
	}

	dataBits := cfg.DataBits
	if dataBits <= 0 {
		dataBits = 8 // 默认 8 数据位
	}

	var stopBits serial.StopBits
	switch cfg.StopBits {
	case "1.5":
		stopBits = serial.OnePointFiveStopBits
	case "2":
		stopBits = serial.TwoStopBits
	default:
		stopBits = serial.OneStopBit
	}

	var parity serial.Parity
	switch cfg.Parity {
	case "odd":
		parity = serial.OddParity
	case "even":
		parity = serial.EvenParity
	case "mark":
		parity = serial.MarkParity
	case "space":
		parity = serial.SpaceParity
	default:
		parity = serial.NoParity
	}

	mode := &serial.Mode{
		BaudRate: baud,
		DataBits: dataBits,
		Parity:   parity,
		StopBits: stopBits,
	}

	port, err := serial.Open(cfg.Port, mode)
	if err != nil {
		return nil, fmt.Errorf("打开串口 %s 失败: %w", cfg.Port, err)
	}

	// 初始 DTR / RTS 状态配置
	if cfg.DTR {
		_ = port.SetDTR(true)
	}
	if cfg.RTS {
		_ = port.SetRTS(true)
	}

	return &SerialPortWrapper{
		Port:   port,
		Config: cfg,
	}, nil
}

func (s *SerialPortWrapper) Read(p []byte) (n int, err error) {
	return s.Port.Read(p)
}

func (s *SerialPortWrapper) Write(p []byte) (n int, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.Port.Write(p)
}

func (s *SerialPortWrapper) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.Port.Close()
}

// SetDTR 设置 DTR 引脚电平
func (s *SerialPortWrapper) SetDTR(state bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Config.DTR = state
	return s.Port.SetDTR(state)
}

// SetRTS 设置 RTS 引脚电平
func (s *SerialPortWrapper) SetRTS(state bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Config.RTS = state
	return s.Port.SetRTS(state)
}

// SendBreak 发送串口 Break 脉冲信号 (约 250ms)
func (s *SerialPortWrapper) SendBreak(duration time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if duration <= 0 {
		duration = 250 * time.Millisecond
	}
	if err := s.Port.Break(duration); err != nil {
		return err
	}
	return nil
}

// Ensure SerialPortWrapper satisfies io.ReadWriteCloser
var _ io.ReadWriteCloser = (*SerialPortWrapper)(nil)

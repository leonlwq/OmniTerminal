package core

import (
	"sync"
)

// SleepInhibitor 阻止系统自动休眠管理器 (跨平台)
type SleepInhibitor struct {
	mu     sync.Mutex
	active bool
	impl   sleepInhibitorImpl
}

type sleepInhibitorImpl interface {
	start() error
	stop() error
}

func NewSleepInhibitor() *SleepInhibitor {
	return &SleepInhibitor{
		impl: newSleepInhibitorPlatform(),
	}
}

// Enable 开启阻止休眠
func (s *SleepInhibitor) Enable() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.active {
		return nil
	}
	if err := s.impl.start(); err != nil {
		return err
	}
	s.active = true
	return nil
}

// Disable 关闭阻止休眠，恢复系统默认电源策略
func (s *SleepInhibitor) Disable() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.active {
		return nil
	}
	err := s.impl.stop()
	s.active = false
	return err
}

// IsActive 查询当前是否处于阻止休眠状态
func (s *SleepInhibitor) IsActive() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.active
}

// Shutdown 应用退出时清理资源
func (s *SleepInhibitor) Shutdown() {
	_ = s.Disable()
}

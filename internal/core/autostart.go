package core

// AutoStartManager 开机自启动管理器
type AutoStartManager struct {
	impl autoStartImpl
}

type autoStartImpl interface {
	isEnabled() bool
	enable() error
	disable() error
}

func NewAutoStartManager() *AutoStartManager {
	return &AutoStartManager{
		impl: newAutoStartPlatform(),
	}
}

// IsEnabled 查询当前是否已设置开机自启
func (m *AutoStartManager) IsEnabled() bool {
	if m == nil || m.impl == nil {
		return false
	}
	return m.impl.isEnabled()
}

// SetEnabled 设置或取消开机自启
func (m *AutoStartManager) SetEnabled(enable bool) error {
	if m == nil || m.impl == nil {
		return nil
	}
	if enable {
		return m.impl.enable()
	}
	return m.impl.disable()
}

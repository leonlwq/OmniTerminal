package core

// TrayManager 跨平台系统托盘与 Dock 图标激活唤醒管理器
type TrayManager struct {
	onShow func()
	onQuit func()
	impl   trayImpl
}

type trayImpl interface {
	setup()
	show(title string)
	hide()
}

var trayManagerInstance *TrayManager

func NewTrayManager(onShow func(), onQuit func()) *TrayManager {
	tm := &TrayManager{
		onShow: onShow,
		onQuit: onQuit,
	}
	trayManagerInstance = tm
	tm.impl = newTrayPlatform(tm)
	if tm.impl != nil {
		tm.impl.setup()
	}
	return tm
}

func (t *TrayManager) Setup() {
	if t != nil && t.impl != nil {
		t.impl.setup()
	}
}

func (t *TrayManager) ShowTray(title string) {
	if t != nil && t.impl != nil {
		t.impl.show(title)
	}
}

func (t *TrayManager) HideTray() {
	if t != nil && t.impl != nil {
		t.impl.hide()
	}
}

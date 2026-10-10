//go:build !darwin

package core

type otherTray struct {
	tm *TrayManager
}

func newTrayPlatform(tm *TrayManager) trayImpl {
	return &otherTray{tm: tm}
}

func (o *otherTray) setup() {}
func (o *otherTray) show(title string) {}
func (o *otherTray) hide() {}

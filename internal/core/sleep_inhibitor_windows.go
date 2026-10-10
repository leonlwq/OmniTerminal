//go:build windows

package core

import (
	"syscall"
)

const (
	esContinuous       = 0x80000000
	esSystemRequired   = 0x00000001
	esAwaymodeRequired = 0x00000040
	esDisplayRequired  = 0x00000002
)

type windowsSleepInhibitor struct {
	proc *syscall.LazyProc
}

func newSleepInhibitorPlatform() sleepInhibitorImpl {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	return &windowsSleepInhibitor{
		proc: kernel32.NewProc("SetThreadExecutionState"),
	}
}

func (w *windowsSleepInhibitor) start() error {
	if w.proc != nil {
		_, _, _ = w.proc.Call(uintptr(esContinuous | esSystemRequired | esAwaymodeRequired | esDisplayRequired))
	}
	return nil
}

func (w *windowsSleepInhibitor) stop() error {
	if w.proc != nil {
		_, _, _ = w.proc.Call(uintptr(esContinuous))
	}
	return nil
}

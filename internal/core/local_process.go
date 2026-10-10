package core

import "io"

// LocalProcess 统一抽象跨平台的本地终端交互进程与伪终端
type LocalProcess interface {
	io.ReadWriteCloser
	Resize(cols, rows int) error
	Wait() error
	Pid() int
}

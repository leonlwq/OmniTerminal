package core

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"golang.org/x/crypto/ssh"
)

// SCPClient 封装基于 SSH Session 的 SCP 协议传输引擎
type SCPClient struct {
	Client *ssh.Client
}

func NewSCPClient(client *ssh.Client) *SCPClient {
	return &SCPClient{Client: client}
}

// Upload 上传本地文件到远程目录
func (s *SCPClient) Upload(localPath string, remoteDir string, progress io.Writer) error {
	if s.Client == nil {
		return fmt.Errorf("SSH 客户端未连接")
	}

	srcFile, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("打开本地文件失败: %w", err)
	}
	defer srcFile.Close()

	stat, err := srcFile.Stat()
	if err != nil {
		return fmt.Errorf("获取文件状态失败: %w", err)
	}

	session, err := s.Client.NewSession()
	if err != nil {
		return fmt.Errorf("创建 SSH 会话失败: %w", err)
	}
	defer session.Close()

	stdin, err := session.StdinPipe()
	if err != nil {
		return err
	}
	defer stdin.Close()

	stdout, err := session.StdoutPipe()
	if err != nil {
		return err
	}

	// 远程执行 scp -t (sink mode)
	cmd := fmt.Sprintf("scp -t %s", remoteDir)
	if err := session.Start(cmd); err != nil {
		return fmt.Errorf("启动远程 SCP 接收失败: %w", err)
	}

	reader := bufio.NewReader(stdout)

	// 等待初始 ACK
	if err := checkAck(reader); err != nil {
		return err
	}

	// 发送协议头: C0644 <size> <filename>\n
	fileName := filepath.Base(localPath)
	header := fmt.Sprintf("C0644 %d %s\n", stat.Size(), fileName)
	if _, err := stdin.Write([]byte(header)); err != nil {
		return err
	}

	if err := checkAck(reader); err != nil {
		return err
	}

	// 发送文件内容
	var writer io.Writer = stdin
	if progress != nil {
		writer = io.MultiWriter(stdin, progress)
	}

	if _, err := io.Copy(writer, srcFile); err != nil {
		return fmt.Errorf("传输数据流失败: %w", err)
	}

	// 发送传输完成信号 \x00
	if _, err := stdin.Write([]byte{0}); err != nil {
		return err
	}

	if err := checkAck(reader); err != nil {
		return err
	}

	return session.Wait()
}

// Download 从远程服务器下载文件到本地目录
func (s *SCPClient) Download(remotePath string, localDir string, progress io.Writer) error {
	if s.Client == nil {
		return fmt.Errorf("SSH 客户端未连接")
	}

	session, err := s.Client.NewSession()
	if err != nil {
		return fmt.Errorf("创建 SSH 会话失败: %w", err)
	}
	defer session.Close()

	stdin, err := session.StdinPipe()
	if err != nil {
		return err
	}
	defer stdin.Close()

	stdout, err := session.StdoutPipe()
	if err != nil {
		return err
	}

	// 远程执行 scp -f (source mode)
	cmd := fmt.Sprintf("scp -f %s", remotePath)
	if err := session.Start(cmd); err != nil {
		return fmt.Errorf("启动远程 SCP 发送失败: %w", err)
	}

	reader := bufio.NewReader(stdout)

	// 向远程发送准备就绪确认 \x00
	if _, err := stdin.Write([]byte{0}); err != nil {
		return err
	}

	// 读取远程返回的头信息
	msgType, err := reader.ReadByte()
	if err != nil {
		return err
	}

	if msgType != 'C' {
		// 如果返回错误字节
		errMsg, _ := reader.ReadString('\n')
		return fmt.Errorf("SCP 协议响应异常: %c %s", msgType, errMsg)
	}

	headerLine, err := reader.ReadString('\n')
	if err != nil {
		return err
	}

	parts := strings.Fields(headerLine)
	if len(parts) < 3 {
		return fmt.Errorf("无法解析 SCP 文件头: %s", headerLine)
	}

	size, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return fmt.Errorf("解析文件大小失败: %w", err)
	}

	fileName := parts[2]
	targetLocalPath := filepath.Join(localDir, fileName)

	dstFile, err := os.Create(targetLocalPath)
	if err != nil {
		return fmt.Errorf("创建本地文件失败: %w", err)
	}
	defer dstFile.Close()

	// 回复确认 \x00
	if _, err := stdin.Write([]byte{0}); err != nil {
		return err
	}

	// 限制读取指定字节数
	var writer io.Writer = dstFile
	if progress != nil {
		writer = io.MultiWriter(dstFile, progress)
	}

	if _, err := io.CopyN(writer, reader, size); err != nil {
		return fmt.Errorf("接收文件流失败: %w", err)
	}

	// 确认接收结束
	if err := checkAck(reader); err != nil {
		return err
	}

	// 回复最后确认
	if _, err := stdin.Write([]byte{0}); err != nil {
		return err
	}

	return session.Wait()
}

func checkAck(r *bufio.Reader) error {
	b, err := r.ReadByte()
	if err != nil {
		return err
	}
	if b == 0 {
		return nil
	}
	// 1 = error, 2 = fatal error
	msg, _ := r.ReadString('\n')
	return fmt.Errorf("SCP 远端返回错误 (%d): %s", b, strings.TrimSpace(msg))
}

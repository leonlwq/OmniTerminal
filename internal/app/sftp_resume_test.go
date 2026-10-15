package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestSftpCheckFileResumeLocal(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "sftp_resume_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	srcFile := filepath.Join(tmpDir, "source.bin")
	dstFile := filepath.Join(tmpDir, "target.bin")

	// 写入 1000 字节源文件
	srcData := make([]byte, 1000)
	for i := range srcData {
		srcData[i] = byte(i % 256)
	}
	if err := os.WriteFile(srcFile, srcData, 0644); err != nil {
		t.Fatalf("failed to write src file: %v", err)
	}

	app := &App{}

	// 测试用例 1: 目标文件尚不存在
	res1, err := app.SftpCheckFileResume("", srcFile, true, "", dstFile, true)
	if err != nil {
		t.Fatalf("check failed: %v", err)
	}
	if res1.Exists || res1.CanResume {
		t.Errorf("expected exists=false, canResume=false, got %+v", res1)
	}
	if res1.SrcSize != 1000 {
		t.Errorf("expected srcSize=1000, got %d", res1.SrcSize)
	}

	// 测试用例 2: 目标文件写入 400 字节 (满足断点续传条件)
	if err := os.WriteFile(dstFile, srcData[:400], 0644); err != nil {
		t.Fatalf("failed to write dst file: %v", err)
	}
	res2, err := app.SftpCheckFileResume("", srcFile, true, "", dstFile, true)
	if err != nil {
		t.Fatalf("check failed: %v", err)
	}
	if !res2.Exists || !res2.CanResume {
		t.Errorf("expected exists=true, canResume=true, got %+v", res2)
	}
	if res2.DstSize != 400 || res2.ResumableBytes != 400 {
		t.Errorf("expected dstSize=400, got %d, resumableBytes=%d", res2.DstSize, res2.ResumableBytes)
	}

	// 测试用例 3: 目标文件已有 1000 字节 (已完整传输)
	if err := os.WriteFile(dstFile, srcData, 0644); err != nil {
		t.Fatalf("failed to write dst file: %v", err)
	}
	res3, err := app.SftpCheckFileResume("", srcFile, true, "", dstFile, true)
	if err != nil {
		t.Fatalf("check failed: %v", err)
	}
	if !res3.Exists || res3.CanResume {
		t.Errorf("expected exists=true, canResume=false for identical size, got %+v", res3)
	}
}

func TestCancelSftpTransfer(t *testing.T) {
	app := &App{
		ctx: nil,
	}

	taskId := "test_task_cancel_123"
	ctx, cancel := context.WithCancel(context.Background())
	transferCancels.Store(taskId, cancel)

	if err := app.CancelSftpTransfer(taskId); err != nil {
		t.Fatalf("CancelSftpTransfer failed: %v", err)
	}

	if ctx.Err() != context.Canceled {
		t.Errorf("expected context to be cancelled, got %v", ctx.Err())
	}

	// 再次取消应当报错（因为已被删除）
	if err := app.CancelSftpTransfer(taskId); err == nil {
		t.Errorf("expected error canceling already cancelled task, got nil")
	}
}

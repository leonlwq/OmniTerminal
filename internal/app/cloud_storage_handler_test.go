package app

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"omniterminal/internal/models"
)

func TestCloudStorageOperations(t *testing.T) {
	// Mock WebDAV server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "PROPFIND":
			w.Header().Set("Content-Type", "application/xml; charset=utf-8")
			w.WriteHeader(http.StatusMultiStatus)
			xmlResp := `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/</D:href>
    <D:propstat>
      <D:prop>
        <D:resourcetype><D:collection/></D:resourcetype>
      </D:prop>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/backup.tar.gz</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>backup.tar.gz</D:displayname>
        <D:getcontentlength>204800</D:getcontentlength>
        <D:getlastmodified>2026-08-25 12:00:00</D:getlastmodified>
        <D:resourcetype/>
      </D:prop>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/docs/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>docs</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
      </D:prop>
    </D:propstat>
  </D:response>
</D:multistatus>`
			fmt.Fprint(w, xmlResp)
		case "GET":
			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, "mock-file-content")
		case "PUT":
			w.WriteHeader(http.StatusCreated)
		case "DELETE":
			w.WriteHeader(http.StatusNoContent)
		case "MKCOL":
			w.WriteHeader(http.StatusCreated)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer ts.Close()

	app := &App{}
	cfg := models.CloudSyncConfig{
		Provider:  "webdav",
		ServerURL: ts.URL,
		Username:  "user",
		Password:  "pass",
	}

	// 1. Test List
	files, err := app.CloudStorageList(cfg, "/")
	if err != nil {
		t.Fatalf("CloudStorageList failed: %v", err)
	}
	if len(files) != 2 {
		t.Errorf("Expected 2 files/dirs, got %d", len(files))
	}
	if files[0].Name != "backup.tar.gz" || files[0].IsDir {
		t.Errorf("Unexpected file[0]: %+v", files[0])
	}
	if files[1].Name != "docs" || !files[1].IsDir {
		t.Errorf("Unexpected file[1]: %+v", files[1])
	}

	// 2. Test Download
	tmpDir := t.TempDir()
	destPath := filepath.Join(tmpDir, "downloaded.txt")
	err = app.CloudStorageDownload(cfg, "/backup.tar.gz", destPath)
	if err != nil {
		t.Fatalf("CloudStorageDownload failed: %v", err)
	}
	content, _ := os.ReadFile(destPath)
	if string(content) != "mock-file-content" {
		t.Errorf("Expected 'mock-file-content', got '%s'", string(content))
	}

	// 3. Test Upload
	srcPath := filepath.Join(tmpDir, "upload.txt")
	_ = os.WriteFile(srcPath, []byte("upload-test-content"), 0644)
	err = app.CloudStorageUpload(cfg, srcPath, "/upload.txt")
	if err != nil {
		t.Fatalf("CloudStorageUpload failed: %v", err)
	}

	// 4. Test Mkdir
	err = app.CloudStorageMkdir(cfg, "/new_folder")
	if err != nil {
		t.Fatalf("CloudStorageMkdir failed: %v", err)
	}

	// 5. Test Delete
	err = app.CloudStorageDelete(cfg, "/delete_file.txt")
	if err != nil {
		t.Fatalf("CloudStorageDelete failed: %v", err)
	}
}

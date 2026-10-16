package models

// UpdateAssetInfo 匹配到的平台安装包信息
type UpdateAssetInfo struct {
	Name        string `json:"name"`
	DownloadURL string `json:"downloadUrl"`
	Size        int64  `json:"size"`
	BrowserURL  string `json:"browserUrl"`
}

// UpdateCheckResult 检查版本更新的返回数据
type UpdateCheckResult struct {
	HasUpdate      bool             `json:"hasUpdate"`
	CurrentVersion string           `json:"currentVersion"`
	LatestVersion  string           `json:"latestVersion"`
	ReleaseTitle   string           `json:"releaseTitle"`
	ReleaseNotes   string           `json:"releaseNotes"`
	PublishedAt    string           `json:"publishedAt"`
	HTMLURL        string           `json:"htmlUrl"`
	PlatformOS     string           `json:"platformOS"`
	PlatformArch   string           `json:"platformArch"`
	TargetAsset    *UpdateAssetInfo `json:"targetAsset"`
}

// UpdateProgress 应用内下载更新的进度状态
type UpdateProgress struct {
	Status          string  `json:"status"` // "downloading" | "ready" | "error" | "cancelled"
	TotalBytes      int64   `json:"totalBytes"`
	DownloadedBytes int64   `json:"downloadedBytes"`
	Percent         float64 `json:"percent"`
	SpeedBytes      int64   `json:"speedBytes"` // bytes/s
	ErrorMsg        string  `json:"errorMsg"`
	FilePath        string  `json:"filePath"`
}

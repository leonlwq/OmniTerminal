package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/models"
)

var runbookMu sync.RWMutex

// getRunbooksFilePath 获取 runbooks.json 存储路径
func getRunbooksFilePath() string {
	return config.GetFilePath("runbooks.json")
}

// getRunbookHistoryFilePath 获取 runbook_history.json 存储路径
func getRunbookHistoryFilePath() string {
	return config.GetFilePath("runbook_history.json")
}

// defaultRunbooks 内置工业级预设 SOP 手册
func defaultRunbooks() []models.RunbookTemplate {
	now := time.Now().Format("2006-01-02 15:04:05")
	return []models.RunbookTemplate{
		{
			ID:          "rb_nginx_reload",
			Name:        "Nginx 优雅热重载与配置语法校验",
			Description: "线上发布或证书更新后，安全核验 Nginx 语法、端口健康并无缝平滑重载",
			Category:    "服务发布",
			Tags:        []string{"Web服务", "Nginx", "无损发布"},
			CreatedAt:   now,
			UpdatedAt:   now,
			Variables: []models.RunbookVariable{
				{
					Name:         "NGINX_CONF_PATH",
					Description:  "Nginx 主配置文件绝对路径",
					DefaultValue: "/etc/nginx/nginx.conf",
					Required:     true,
					Type:         "text",
				},
				{
					Name:         "SERVICE_NAME",
					Description:  "Systemd 服务单元名称",
					DefaultValue: "nginx",
					Required:     true,
					Type:         "text",
				},
			},
			Steps: []models.RunbookStep{
				{
					ID:              "step_1",
					Name:            "校验配置文件语法合法性",
					Description:     "防止因语法或证书路径错误导致服务中断",
					Command:         "nginx -t -c ${NGINX_CONF_PATH}",
					TimeoutSeconds:  30,
					ContinueOnError: false,
				},
				{
					ID:              "step_2",
					Name:            "检查端口监听与 Worker 进程状态",
					Description:     "确认服务处于正常监听状态",
					Command:         "ps aux | grep ${SERVICE_NAME} | grep -v grep; ss -tulpn | grep -E ':80|:443' || true",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
				{
					ID:              "step_3",
					Name:            "执行优雅热重载",
					Description:     "发送 SIGHUP 信号热加载配置，保持长连接不中断",
					Command:         "systemctl reload ${SERVICE_NAME} || kill -HUP $(cat /var/run/nginx.pid 2>/dev/null || cat /run/nginx.pid 2>/dev/null)",
					TimeoutSeconds:  45,
					ContinueOnError: false,
				},
				{
					ID:              "step_4",
					Name:            "核验重载后 HTTP 探针响应",
					Description:     "确认服务重载后能正常返回 200/301 状态码",
					Command:         "curl -I -s --connect-timeout 5 http://127.0.0.1 | head -n 5",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
			},
		},
		{
			ID:          "rb_server_inspection",
			Name:        "Linux 服务器常规体检与僵尸进程巡检",
			Description: "快速摸底系统平均负载、CPU/内存水位、磁盘高水位以及僵尸进程",
			Category:    "系统巡检",
			Tags:        []string{"Linux", "系统巡检", "性能排查"},
			CreatedAt:   now,
			UpdatedAt:   now,
			Variables: []models.RunbookVariable{
				{
					Name:         "TOP_N",
					Description:  "高资源进程统计数量",
					DefaultValue: "10",
					Required:     true,
					Type:         "number",
				},
				{
					Name:         "DISK_THRESHOLD",
					Description:  "磁盘使用率警报阈值百分比",
					DefaultValue: "80",
					Required:     true,
					Type:         "number",
				},
			},
			Steps: []models.RunbookStep{
				{
					ID:              "step_1",
					Name:            "核查系统平均负载与开机运行时长",
					Description:     "评估当前 1/5/15 分钟系统负载与 CPU 核心配比",
					Command:         "uptime; echo '--- CPU 核心与架构 ---'; lscpu 2>/dev/null | grep -E 'Model name|CPU\\(s\\):' || nproc",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
				{
					ID:              "step_2",
					Name:            "核查物理内存与 Swap 交换区水位",
					Description:     "确认物理内存剩余容量与 OOM 隐患",
					Command:         "free -h; echo '--- 虚拟内存状态 ---'; vmstat 1 2",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
				{
					ID:              "step_3",
					Name:            "核查磁盘容量与高水位挂载点",
					Description:     "定位可能打满的根分区或数据挂载卷",
					Command:         "df -h; echo '--- 超阈值分区 ---'; df -h | awk '$5 + 0 >= ${DISK_THRESHOLD} {print $0}'",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
				{
					ID:              "step_4",
					Name:            "筛查僵尸进程 (Zombie) 与 Top 资源进程",
					Description:     "捕获异常退出的子进程与高内存占位进程",
					Command:         "echo '=== 僵尸进程排查 ==='; ps -eo stat,pid,ppid,user,comm | grep -E '^[Zz]' || echo '无僵尸进程'; echo '=== Top CPU/MEM 进程 ==='; ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n ${TOP_N}",
					TimeoutSeconds:  45,
					ContinueOnError: true,
				},
			},
		},
		{
			ID:          "rb_docker_cleanup",
			Name:        "Docker 容器与悬空镜像安全清理",
			Description: "安全回收已退出容器、未引用的悬空镜像与构建缓存，释放磁盘空间",
			Category:    "日常运维",
			Tags:        []string{"Docker", "磁盘扩容", "资源释放"},
			CreatedAt:   now,
			UpdatedAt:   now,
			Variables: []models.RunbookVariable{
				{
					Name:         "PRUNE_VOLUMES",
					Description:  "是否同步清理未被任何容器引用的匿名卷 (请谨慎)",
					DefaultValue: "false",
					Required:     true,
					Type:         "select",
					Options:      []string{"false", "true"},
				},
			},
			Steps: []models.RunbookStep{
				{
					ID:              "step_1",
					Name:            "核查 Docker 空间占用大盘",
					Description:     "记录清理前的镜像、容器与卷占用大小",
					Command:         "docker system df",
					TimeoutSeconds:  30,
					ContinueOnError: false,
				},
				{
					ID:              "step_2",
					Name:            "清理所有已停止退出的容器",
					Description:     "回收停滞历史容器占用的可写层空间",
					Command:         "docker container prune -f",
					TimeoutSeconds:  60,
					ContinueOnError: true,
				},
				{
					ID:              "step_3",
					Name:            "清理悬空无标签镜像与废弃构建缓存",
					Description:     "清理 <none>:<none> 镜像与旧 BuildKit 缓存",
					Command:         "docker image prune -f; docker builder prune -f",
					TimeoutSeconds:  120,
					ContinueOnError: true,
				},
				{
					ID:              "step_4",
					Name:            "核对清理完成后释放的空间",
					Description:     "展示释放成果对比",
					Command:         "echo '=== 清理后 Docker 占用报告 ==='; docker system df",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
			},
		},
		{
			ID:          "rb_mysql_backup",
			Name:        "MySQL 数据库在线备份与 Binlog 切分",
			Description: "利用 mysqldump 产生一致性单事务在线全量备份，并自动刷新日志",
			Category:    "应急排障",
			Tags:        []string{"MySQL", "数据库", "容灾备份"},
			CreatedAt:   now,
			UpdatedAt:   now,
			Variables: []models.RunbookVariable{
				{
					Name:         "DB_USER",
					Description:  "MySQL 运维账号",
					DefaultValue: "root",
					Required:     true,
					Type:         "text",
				},
				{
					Name:         "DB_NAME",
					Description:  "待备份的目标数据库名",
					DefaultValue: "app_production",
					Required:     true,
					Type:         "text",
				},
				{
					Name:         "BACKUP_DIR",
					Description:  "备份文件存放目录",
					DefaultValue: "/data/backup/mysql",
					Required:     true,
					Type:         "text",
				},
			},
			Steps: []models.RunbookStep{
				{
					ID:              "step_1",
					Name:            "确认备份目录存在与磁盘剩余空间",
					Description:     "防止备份途中因磁盘空间不足导致写盘损坏",
					Command:         "mkdir -p ${BACKUP_DIR} && df -h ${BACKUP_DIR}",
					TimeoutSeconds:  30,
					ContinueOnError: false,
				},
				{
					ID:              "step_2",
					Name:            "核验数据库连通性与服务状态",
					Description:     "检测数据库是否可读写响应",
					Command:         "mysql -u${DB_USER} -e \"SHOW STATUS LIKE 'Uptime'; SELECT COUNT(*) as tables_count FROM information_schema.tables WHERE table_schema='${DB_NAME}';\"",
					TimeoutSeconds:  30,
					ContinueOnError: false,
				},
				{
					ID:              "step_3",
					Name:            "执行单事务在线 Dump 压缩写盘",
					Description:     "使用 --single-transaction --quick 避免锁表并启用 gzip 流式压缩",
					Command:         "mysqldump -u${DB_USER} --single-transaction --quick --databases ${DB_NAME} | gzip > ${BACKUP_DIR}/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz",
					TimeoutSeconds:  300,
					ContinueOnError: false,
				},
				{
					ID:              "step_4",
					Name:            "刷新二进制日志并核对归档文件",
					Description:     "执行 FLUSH LOGS，列出刚生成的备份文件元数据",
					Command:         "mysql -u${DB_USER} -e \"FLUSH LOGS;\"; ls -lh ${BACKUP_DIR}/${DB_NAME}*.sql.gz | tail -n 3",
					TimeoutSeconds:  30,
					ContinueOnError: true,
				},
			},
		},
	}
}

// GetRunbooks 读取全量 SOP 手册模板
func (a *App) GetRunbooks() ([]models.RunbookTemplate, error) {
	runbookMu.RLock()
	filePath := getRunbooksFilePath()
	data, err := os.ReadFile(filePath)
	runbookMu.RUnlock()

	if err != nil || len(data) == 0 {
		// 初始化预设模板
		defaults := defaultRunbooks()
		_ = a.saveRunbooksInternal(defaults)
		return defaults, nil
	}

	var runbooks []models.RunbookTemplate
	if err := json.Unmarshal(data, &runbooks); err != nil {
		defaults := defaultRunbooks()
		return defaults, nil
	}
	return runbooks, nil
}

func (a *App) saveRunbooksInternal(runbooks []models.RunbookTemplate) error {
	runbookMu.Lock()
	defer runbookMu.Unlock()

	data, err := json.MarshalIndent(runbooks, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(getRunbooksFilePath(), data, 0644)
}

// SaveRunbook 创建或更新 SOP 手册
func (a *App) SaveRunbook(rb models.RunbookTemplate) error {
	if rb.Name == "" {
		return errors.New("SOP 手册名称不能为空")
	}

	runbooks, err := a.GetRunbooks()
	if err != nil {
		runbooks = []models.RunbookTemplate{}
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	if rb.ID == "" {
		rb.ID = fmt.Sprintf("rb_%d", time.Now().UnixMilli())
		rb.CreatedAt = now
	}
	rb.UpdatedAt = now

	found := false
	for i, existing := range runbooks {
		if existing.ID == rb.ID {
			runbooks[i] = rb
			found = true
			break
		}
	}
	if !found {
		runbooks = append(runbooks, rb)
	}

	return a.saveRunbooksInternal(runbooks)
}

// DeleteRunbook 删除指定 SOP 手册
func (a *App) DeleteRunbook(id string) error {
	runbooks, err := a.GetRunbooks()
	if err != nil {
		return err
	}

	filtered := make([]models.RunbookTemplate, 0, len(runbooks))
	for _, rb := range runbooks {
		if rb.ID != id {
			filtered = append(filtered, rb)
		}
	}
	return a.saveRunbooksInternal(filtered)
}

// ExportRunbooks 导出 SOP 模板为 JSON 字符串
func (a *App) ExportRunbooks() (string, error) {
	runbooks, err := a.GetRunbooks()
	if err != nil {
		return "", err
	}
	data, err := json.MarshalIndent(runbooks, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ImportRunbooks 批量导入 SOP 模板
func (a *App) ImportRunbooks(jsonStr string) error {
	var imported []models.RunbookTemplate
	if err := json.Unmarshal([]byte(jsonStr), &imported); err != nil {
		return fmt.Errorf("解析导入数据失败: %w", err)
	}

	existing, _ := a.GetRunbooks()
	idMap := make(map[string]bool)
	for _, rb := range existing {
		idMap[rb.ID] = true
	}

	for _, rb := range imported {
		if idMap[rb.ID] {
			rb.ID = fmt.Sprintf("%s_imported_%d", rb.ID, time.Now().UnixMilli()%10000)
		}
		existing = append(existing, rb)
	}

	return a.saveRunbooksInternal(existing)
}

// GetRunbookHistory 读取执行审计历史
func (a *App) GetRunbookHistory() ([]models.RunbookExecutionRecord, error) {
	runbookMu.RLock()
	defer runbookMu.RUnlock()

	data, err := os.ReadFile(getRunbookHistoryFilePath())
	if err != nil || len(data) == 0 {
		return []models.RunbookExecutionRecord{}, nil
	}

	var records []models.RunbookExecutionRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return []models.RunbookExecutionRecord{}, nil
	}
	return records, nil
}

// SaveRunbookExecution 归档单次 SOP 执行历史记录
func (a *App) SaveRunbookExecution(record models.RunbookExecutionRecord) error {
	records, err := a.GetRunbookHistory()
	if err != nil {
		records = []models.RunbookExecutionRecord{}
	}

	if record.ID == "" {
		record.ID = fmt.Sprintf("exec_%d", time.Now().UnixMilli())
	}
	if record.EndTime == "" {
		record.EndTime = time.Now().Format("2006-01-02 15:04:05")
	}

	// 最多保留最新 200 条执行审计
	updatedRecords := append([]models.RunbookExecutionRecord{record}, records...)
	if len(updatedRecords) > 200 {
		updatedRecords = updatedRecords[:200]
	}

	runbookMu.Lock()
	defer runbookMu.Unlock()

	data, err := json.MarshalIndent(updatedRecords, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(getRunbookHistoryFilePath(), data, 0644)
}

// ClearRunbookHistory 清空执行审计历史
func (a *App) ClearRunbookHistory() error {
	runbookMu.Lock()
	defer runbookMu.Unlock()

	return os.WriteFile(getRunbookHistoryFilePath(), []byte("[]"), 0644)
}

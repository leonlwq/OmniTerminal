package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"omniterminal/internal/config"
	"omniterminal/internal/models"

	"github.com/google/uuid"
)

var inspectionMu sync.RWMutex

// getInspectionDir 获取巡检报告保存目录
func (a *App) getInspectionDir() string {
	return config.GetSubDir("inspections")
}

// GetInspectionTemplates 获取内置的主机巡检指标模板清单
func (a *App) GetInspectionTemplates() []models.InspectionCheck {
	return []models.InspectionCheck{
		{
			ID:          "sys_os",
			Category:    "system",
			Name:        "系统内核与发行版本",
			Command:     "uname -a && (cat /etc/os-release 2>/dev/null || cat /etc/redhat-release 2>/dev/null || true)",
			Description: "检查主机的操作系统版本、Linux 内核发行号及系统架构",
			TimeoutSec:  10,
			Enabled:     true,
		},
		{
			ID:          "res_cpu_load",
			Category:    "resources",
			Name:        "CPU 架构与系统负载",
			Command:     "uptime && (lscpu 2>/dev/null | grep -E \"Model name|CPU\\(s\\):|Thread\" || true)",
			Description: "检查系统运行时间、1/5/15分钟平均负载及物理/逻辑核心数",
			TimeoutSec:  10,
			Enabled:     true,
		},
		{
			ID:          "res_memory",
			Category:    "resources",
			Name:        "内存利用率与交换空间",
			Command:     "free -m 2>/dev/null || vm_stat 2>/dev/null || true",
			Description: "检查已用物理内存、空闲内存 Buffer/Cache 以及 Swap 交换分区使用状况",
			TimeoutSec:  10,
			Enabled:     true,
		},
		{
			ID:          "disk_usage",
			Category:    "disk",
			Name:        "磁盘容量与文件系统空间",
			Command:     "df -h -x tmpfs -x devtmpfs -x overlay 2>/dev/null || df -h",
			Description: "检查关键根分区和挂载盘的已用容量与百分比，自动探测大于85%的高危空间",
			TimeoutSec:  15,
			Enabled:     true,
		},
		{
			ID:          "srv_failed",
			Category:    "services",
			Name:        "崩溃或失败的系统服务",
			Command:     "systemctl list-units --state=failed --no-pager 2>/dev/null || service --status-all 2>/dev/null | grep -E '\\[ - \\]' || true",
			Description: "检测 systemd 或 SysVinit 管理的服务单元中是否存在退出崩溃的服务",
			TimeoutSec:  15,
			Enabled:     true,
		},
		{
			ID:          "sec_ports",
			Category:    "security",
			Name:        "网络监听端口与暴露服务",
			Command:     "ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null || lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null || true",
			Description: "扫描当前主机所有监听中的 TCP/UDP 端口及绑定的 IP 地址",
			TimeoutSec:  10,
			Enabled:     true,
		},
		{
			ID:          "sec_logins",
			Category:    "security",
			Name:        "最近用户登录与审计记录",
			Command:     "last -n 5 2>/dev/null || who -u 2>/dev/null || true",
			Description: "查看最近成功登录该主机的用户、远程 IP 地址及当前在线会话",
			TimeoutSec:  10,
			Enabled:     true,
		},
		{
			ID:          "kern_dmesg_errors",
			Category:    "kernel",
			Name:        "内核日志与硬件异常预警",
			Command:     "dmesg 2>/dev/null | grep -iE \"error|fail|corrupt|panic|oom-killer|Call Trace\" | tail -n 10 || true",
			Description: "嗅探 dmesg 内核环形缓冲区中的 OOM 杀进程、硬件故障或驱动崩溃记录",
			TimeoutSec:  15,
			Enabled:     true,
		},
	}
}

// analyzeCheckIssue 智能分析巡检项输出是否存在异常
func analyzeCheckIssue(category string, command string, output string, exitCode int) (bool, string) {
	if exitCode != 0 {
		return true, fmt.Sprintf("执行返回非零退出码 (code %d)", exitCode)
	}

	trimmed := strings.TrimSpace(output)
	if trimmed == "" {
		return false, ""
	}

	switch category {
	case "disk":
		// 检查是否有 85% ~ 100% 的分区
		re := regexp.MustCompile(`(\d+)%`)
		matches := re.FindAllStringSubmatch(output, -1)
		for _, m := range matches {
			if len(m) > 1 {
				pct, err := strconv.Atoi(m[1])
				if err == nil && pct >= 85 {
					return true, fmt.Sprintf("检测到高容量占用分区 (%d%% >= 85%%)", pct)
				}
			}
		}
	case "services":
		if strings.Contains(output, "loaded failed failed") || strings.Contains(output, "0 loaded units listed") == false && strings.Contains(output, "failed") {
			lines := strings.Split(output, "\n")
			var failedServices []string
			for _, l := range lines {
				if strings.Contains(l, "failed") && !strings.Contains(l, "0 loaded units listed") && !strings.Contains(l, "UNIT") {
					parts := strings.Fields(l)
					if len(parts) > 0 {
						failedServices = append(failedServices, parts[0])
					}
				}
			}
			if len(failedServices) > 0 {
				return true, fmt.Sprintf("发现 %d 个异常崩溃服务: %s", len(failedServices), strings.Join(failedServices, ", "))
			}
		}
	case "kernel":
		lower := strings.ToLower(output)
		if strings.Contains(lower, "out of memory") || strings.Contains(lower, "oom-killer") || strings.Contains(lower, "invoked oom") {
			return true, "严重: 触发过系统 OOM 内存耗尽杀进程"
		}
		if strings.Contains(lower, "panic") {
			return true, "严重: 检测到内核崩溃 Kernel Panic 记录"
		}
		if strings.Contains(lower, "call trace") || strings.Contains(lower, "corrupt") {
			return true, "告警: 内核日志中存在异常堆栈或文件系统损坏"
		}
	case "resources":
		// 检查负载是否过高
		if strings.Contains(output, "load average") {
			parts := strings.Split(output, "load average:")
			if len(parts) > 1 {
				loads := strings.Split(parts[1], ",")
				if len(loads) > 0 {
					oneMin, err := strconv.ParseFloat(strings.TrimSpace(loads[0]), 64)
					if err == nil && oneMin > 20.0 {
						return true, fmt.Sprintf("系统 1 分钟平均负载过高: %.2f", oneMin)
					}
				}
			}
		}
	}

	return false, ""
}

// RunInspection 批量并发执行多主机巡检并生成结构化报告
func (a *App) RunInspection(sessionIds []string, checks []models.InspectionCheck) (*models.InspectionReport, error) {
	if len(sessionIds) == 0 {
		return nil, errors.New("未指定任何需要巡检的主机会话")
	}

	var activeChecks []models.InspectionCheck
	for _, c := range checks {
		if c.Enabled {
			activeChecks = append(activeChecks, c)
		}
	}
	if len(activeChecks) == 0 {
		activeChecks = a.GetInspectionTemplates()
	}

	startTime := time.Now()
	reportID := "insp_" + uuid.New().String()[:8]
	title := fmt.Sprintf("多主机批量巡检报告 (%s)", startTime.Format("2006-01-02 15:04"))

	hostResults := make(map[string]*models.InspectionHostResult)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// 并发巡检每台主机
	for _, sid := range sessionIds {
		targetSid := sid
		wg.Add(1)

		go func() {
			defer wg.Done()

			hostStart := time.Now()
			a.sshManager.Mu.RLock()
			info, ok := a.sshManager.Sessions[targetSid]
			a.sshManager.Mu.RUnlock()

			hostName := targetSid
			hostIP := "未知"

			// 如果没在活跃连接中，读取会话配置获取别名/IP
			allSessions, _ := a.GetSessions()
			for _, s := range allSessions {
				if s.ID == targetSid {
					hostName = s.Name
					hostIP = s.Host
					if s.IsLocal {
						hostIP = "127.0.0.1 (本地终端)"
					}
					break
				}
			}

			if !ok {
				mu.Lock()
				hostResults[targetSid] = &models.InspectionHostResult{
					SessionID:   targetSid,
					HostName:    hostName,
					HostIP:      hostIP,
					Status:      "failed",
					ExecutionMs: 0,
					CheckItems:  make(map[string]models.InspectionItemResult),
					IssueCount:  1,
					Error:       "主机未连接，请先连接终端再启动巡检",
				}
				mu.Unlock()
				return
			}

			if info.Name != "" {
				hostName = info.Name
			}

			checkItemResults := make(map[string]models.InspectionItemResult)
			hostIssues := 0

			for _, chk := range activeChecks {
				cStart := time.Now()
				out, err := a.executeSessionCommand(info, chk.Command)
				cDur := time.Since(cStart).Milliseconds()

				exitCode := 0
				if err != nil {
					exitCode = 1
				}

				hasIssue, issueDetail := analyzeCheckIssue(chk.Category, chk.Command, out, exitCode)
				if hasIssue {
					hostIssues++
				}

				checkItemResults[chk.ID] = models.InspectionItemResult{
					CheckID:     chk.ID,
					Name:        chk.Name,
					Category:    chk.Category,
					Command:     chk.Command,
					Output:      out,
					ExitCode:    exitCode,
					DurationMs:  cDur,
					HasIssue:    hasIssue,
					IssueDetail: issueDetail,
				}
			}

			status := "success"
			if hostIssues > 0 {
				status = "warning"
				for _, res := range checkItemResults {
					if res.HasIssue && (res.Category == "kernel" || res.Category == "disk" && strings.Contains(res.IssueDetail, "9")) {
						status = "error"
						break
					}
				}
			}

			hostTotalMs := time.Since(hostStart).Milliseconds()

			mu.Lock()
			hostResults[targetSid] = &models.InspectionHostResult{
				SessionID:   targetSid,
				HostName:    hostName,
				HostIP:      hostIP,
				Status:      status,
				ExecutionMs: hostTotalMs,
				CheckItems:  checkItemResults,
				IssueCount:  hostIssues,
			}
			mu.Unlock()
		}()
	}

	wg.Wait()

	totalIssues := 0
	warningHosts := 0
	errorHosts := 0
	for _, hr := range hostResults {
		totalIssues += hr.IssueCount
		if hr.Status == "warning" {
			warningHosts++
		} else if hr.Status == "error" || hr.Status == "failed" {
			errorHosts++
		}
	}

	summary := fmt.Sprintf("本次共巡检 %d 台主机。其中 %d 台完全健康，%d 台存在预警，%d 台存在严重故障，发现异常指标 %d 项。",
		len(sessionIds), len(sessionIds)-warningHosts-errorHosts, warningHosts, errorHosts, totalIssues)

	report := &models.InspectionReport{
		ID:          reportID,
		Title:       title,
		CreatedAt:   startTime.Unix(),
		HostCount:   len(sessionIds),
		IssueCount:  totalIssues,
		DurationMs:  time.Since(startTime).Milliseconds(),
		HostResults: hostResults,
		Summary:     summary,
	}

	// 存盘归档
	_ = a.saveInspectionReport(report)

	return report, nil
}

// saveInspectionReport 归档保存巡检报告
func (a *App) saveInspectionReport(report *models.InspectionReport) error {
	inspectionMu.Lock()
	defer inspectionMu.Unlock()

	dir := a.getInspectionDir()
	filePath := filepath.Join(dir, fmt.Sprintf("%s.json", report.ID))
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

// GetInspectionHistory 获取历史巡检报告概览列表
func (a *App) GetInspectionHistory() ([]models.InspectionReport, error) {
	inspectionMu.RLock()
	defer inspectionMu.RUnlock()

	dir := a.getInspectionDir()
	files, err := os.ReadDir(dir)
	if err != nil {
		return []models.InspectionReport{}, nil
	}

	var reports []models.InspectionReport
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".json") {
			fullPath := filepath.Join(dir, f.Name())
			data, readErr := os.ReadFile(fullPath)
			if readErr != nil {
				continue
			}
			var rep models.InspectionReport
			if json.Unmarshal(data, &rep) == nil {
				reports = append(reports, rep)
			}
		}
	}

	// 按时间倒序排序
	sort.Slice(reports, func(i, j int) bool {
		return reports[i].CreatedAt > reports[j].CreatedAt
	})

	return reports, nil
}

// DeleteInspectionReport 删除指定巡检报告
func (a *App) DeleteInspectionReport(id string) error {
	inspectionMu.Lock()
	defer inspectionMu.Unlock()

	dir := a.getInspectionDir()
	filePath := filepath.Join(dir, fmt.Sprintf("%s.json", id))
	return os.Remove(filePath)
}

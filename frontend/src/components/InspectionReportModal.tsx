import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import {
  Search,
  Server,
  Play,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  FileText,
  FileCode,
  HardDrive,
  Cpu,
  Shield,
  Activity,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  History,
  X,
  Plus,
  Trash2,
  Sliders
} from 'lucide-react';

interface InspectionCheck {
  id: string;
  category: string;
  name: string;
  command: string;
  description: string;
  timeoutSec: number;
  enabled: boolean;
}

interface InspectionItemResult {
  checkId: string;
  name: string;
  category: string;
  command: string;
  output: string;
  exitCode: number;
  durationMs: number;
  hasIssue: boolean;
  issueDetail?: string;
}

interface InspectionHostResult {
  sessionId: string;
  hostName: string;
  hostIp: string;
  status: 'success' | 'warning' | 'error' | 'failed';
  executionMs: number;
  checkItems: { [id: string]: InspectionItemResult };
  issueCount: number;
  error?: string;
}

interface InspectionReport {
  id: string;
  title: string;
  createdAt: number;
  hostCount: number;
  issueCount: number;
  durationMs: number;
  hostResults: { [id: string]: InspectionHostResult };
  summary: string;
}

interface InspectionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  openTabs: Array<{ id: string; title: string; sessionId?: string }>;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  isOpen,
  onClose,
  openTabs
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'inspect' | 'history'>('inspect');
  const [viewMode, setViewMode] = useState<'matrix' | 'issues' | 'raw'>('matrix');

  const [checks, setChecks] = useState<InspectionCheck[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentReport, setCurrentReport] = useState<InspectionReport | null>(null);
  const [historyReports, setHistoryReports] = useState<InspectionReport[]>([]);

  // 展开的主机卡片
  const [expandedHosts, setExpandedHosts] = useState<{ [id: string]: boolean }>({});
  const [selectedHostForRaw, setSelectedHostForRaw] = useState<string | null>(null);

  // 加载模板与历史
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadSessions();
      loadHistory();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    if (typeof window !== 'undefined' && (window as any).go?.app?.App?.GetInspectionTemplates) {
      try {
        const t = await (window as any).go.app.App.GetInspectionTemplates();
        setChecks(t || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    }
  };

  const loadSessions = async () => {
    if (typeof window !== 'undefined' && (window as any).go?.app?.App?.GetSessions) {
      try {
        const s = await (window as any).go.app.App.GetSessions();
        const nonFolder = (s || []).filter((item: any) => !item.isFolder);
        setSavedSessions(nonFolder);

        // 默认选中当前所有已打开活跃的 Tab 会话
        const tabIds = openTabs.map(t => t.sessionId || t.id).filter(Boolean);
        if (tabIds.length > 0) {
          setSelectedSessionIds(tabIds);
        } else if (nonFolder.length > 0) {
          setSelectedSessionIds([nonFolder[0].id]);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    }
  };

  const loadHistory = async () => {
    if (typeof window !== 'undefined' && (window as any).go?.app?.App?.GetInspectionHistory) {
      try {
        const h = await (window as any).go.app.App.GetInspectionHistory();
        setHistoryReports(h || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    }
  };

  const handleToggleCheck = (id: string) => {
    setChecks(prev =>
      prev.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const handleToggleSession = (id: string) => {
    setSelectedSessionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllActive = () => {
    const ids = openTabs.map(t => t.sessionId || t.id).filter(Boolean);
    setSelectedSessionIds(ids);
  };

  const handleSelectAllSaved = () => {
    setSelectedSessionIds(savedSessions.map(s => s.id));
  };

  const handleRunInspection = async () => {
    if (selectedSessionIds.length === 0) {
      alert(t('insp.alertSelectHost'));
      return;
    }
    const enabledChecks = checks.filter(c => c.enabled);
    if (enabledChecks.length === 0) {
      alert(t('insp.alertSelectCheck'));
      return;
    }

    setIsRunning(true);
    setCurrentReport(null);
    try {
      if ((window as any).go?.app?.App?.RunInspection) {
        const report = await (window as any).go.app.App.RunInspection(
          selectedSessionIds,
          enabledChecks
        );
        setCurrentReport(report);
        loadHistory();
      }
    } catch (err: any) {
      alert(t('insp.alertFailed') + ' ' + (err?.message || String(err)));
    } finally {
      setIsRunning(false);
    }
  };

  const toggleHostExpand = (hostId: string) => {
    setExpandedHosts(prev => ({
      ...prev,
      [hostId]: !prev[hostId]
    }));
  };

  // 导出 Markdown 报告
  const exportMarkdown = () => {
    if (!currentReport) return;
    let md = `# ${currentReport.title}\n\n`;
    md += `> ${t('inspection.genTime') || '生成时间: '}${new Date(currentReport.createdAt * 1000).toLocaleString()} | ${t('inspection.duration') || '耗时: '}${currentReport.durationMs}ms\n\n`;
    md += `## ${t('inspection.conclusionSummary') || '巡检结论综述'}\n\n${currentReport.summary}\n\n`;

    md += `## ${t('inspection.resultsOverview') || '主机巡检结果一览'}\n\n`;
    md += `| ${t('inspection.colHost') || '主机名称'} | ${t('inspection.colIp') || 'IP 地址'} | ${t('inspection.colStatus') || '状态'} | ${t('inspection.colIssues') || '异常指标数'} | ${t('inspection.colDuration') || '执行耗时'} |\n`;
    md += `| :--- | :--- | :---: | :---: | :---: |\n`;
    Object.values(currentReport.hostResults).forEach(h => {
      const statusIcon =
        h.status === 'success' ? (t('inspection.statusHealthy') || '🟢 健康') : h.status === 'warning' ? (t('inspection.statusWarning') || '🟡 告警') : (t('inspection.statusError') || '🔴 异常');
      md += `| ${h.hostName} | ${h.hostIp} | ${statusIcon} | ${h.issueCount} | ${h.executionMs}ms |\n`;
    });
    md += `\n`;

    md += `## ${t('inspection.detailsSection') || '详细检查项与输出'}\n\n`;
    Object.values(currentReport.hostResults).forEach(h => {
      md += `### 主机: ${h.hostName} (${h.hostIp})\n\n`;
      if (h.error) {
        md += `> ⚠️ **错误**: ${h.error}\n\n`;
        return;
      }
      Object.values(h.checkItems).forEach(item => {
        const issueBadge = item.hasIssue ? `⚠️ 异常: ${item.issueDetail}` : '✅ 正常';
        md += `#### ${item.name} [${issueBadge}]\n`;
        md += `- **命令**: \`${item.command}\` (${item.durationMs}ms)\n\n`;
        md += '```text\n' + (item.output || '(无输出)') + '\n```\n\n';
      });
    });

    downloadBlob(md, `inspection_${currentReport.id}.md`, 'text/markdown');
  };

  // 导出 HTML 报告
  const exportHTML = () => {
    if (!currentReport) return;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${currentReport.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #1e1e1e; color: #cccccc; padding: 30px; line-height: 1.6; }
    .card { background: #252526; border: 1px solid #2b2b2b; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
    h1 { color: #ffffff; font-size: 24px; border-bottom: 1px solid #2b2b2b; padding-bottom: 10px; }
    h2 { color: #3794ff; font-size: 18px; margin-top: 20px; }
    h3 { color: #75beff; font-size: 15px; margin-top: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid #2b2b2b; padding: 10px; text-align: left; }
    th { background: #1f1f1f; color: #cccccc; font-weight: 600; }
    pre { background: #181818; border: 1px solid #2b2b2b; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 12px; color: #cccccc; }
    .badge-ok { color: #89d185; font-weight: bold; }
    .badge-warn { color: #cca700; font-weight: bold; }
    .badge-err { color: #f48771; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${currentReport.title}</h1>
  <div class="card">
    <p><strong>巡检时间:</strong> ${new Date(currentReport.createdAt * 1000).toLocaleString()}</p>
    <p><strong>耗时:</strong> ${currentReport.durationMs}ms | <strong>主机数:</strong> ${currentReport.hostCount} | <strong>总发现异常:</strong> ${currentReport.issueCount}</p>
    <p><strong>综合评估:</strong> ${currentReport.summary}</p>
  </div>
  <h2>主机概览矩阵</h2>
  <div class="card">
    <table>
      <thead><tr><th>主机名</th><th>IP</th><th>状态</th><th>异常数</th><th>耗时</th></tr></thead>
      <tbody>
        ${Object.values(currentReport.hostResults)
          .map(
            h =>
              `<tr><td>${h.hostName}</td><td>${h.hostIp}</td><td class="${
                h.status === 'success' ? 'badge-ok' : h.status === 'warning' ? 'badge-warn' : 'badge-err'
              }">${h.status}</td><td>${h.issueCount}</td><td>${h.executionMs}ms</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
  <h2>详细指标执行详情</h2>
  ${Object.values(currentReport.hostResults)
    .map(
      h => `
    <div class="card">
      <h3>主机: ${h.hostName} (${h.hostIp})</h3>
      ${Object.values(h.checkItems)
        .map(
          item => `
        <div style="margin-top: 10px;">
          <p><strong>${item.name}</strong> - <code>${item.command}</code> (${item.durationMs}ms)
            <span class="${item.hasIssue ? 'badge-warn' : 'badge-ok'}">[${item.hasIssue ? '异常: ' + item.issueDetail : '正常'}]</span>
          </p>
          <pre>${item.output || '(无输出)'}</pre>
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('')}
</body>
</html>`;

    downloadBlob(html, `inspection_${currentReport.id}.html`, 'text/html');
  };

  // 导出 JSON 数据
  const exportJSON = () => {
    if (!currentReport) return;
    const jsonStr = JSON.stringify(currentReport, null, 2);
    downloadBlob(jsonStr, `inspection_${currentReport.id}.json`, 'application/json');
  };

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden text-[#cccccc]">
        {/* 顶部 Header */}
        <div className="px-5 py-3 border-b border-[#2b2b2b] flex items-center justify-between bg-[#1f1f1f]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] shadow-sm">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">{t('insp.title')}</h2>
              <p className="text-xs text-[#858585]">{t('insp.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex bg-[#181818] border border-[#2b2b2b] rounded p-0.5 mr-2">
              <button
                onClick={() => setActiveTab('inspect')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'inspect' ? 'bg-[#04395e] text-white' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                新建巡检
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'history' ? 'bg-[#04395e] text-white' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{t('insp.historyReports')} ({historyReports.length})</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#858585] hover:text-[#cccccc] rounded hover:bg-[#333333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 主体区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'inspect' ? (
            <div className="flex-1 flex overflow-hidden">
              {/* 左侧配置栏 (主机选择 + 巡检项勾选) */}
              <div className="w-80 border-r border-[#2b2b2b] bg-[#181818] flex flex-col overflow-hidden shrink-0">
                <div className="p-3.5 border-b border-[#2b2b2b] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e0e0e0] uppercase tracking-wider">
                      {t('insp.targetHosts')} ({selectedSessionIds.length})
                    </span>
                    <div className="flex space-x-1.5 text-[11px] text-[#0078d4]">
                      <button onClick={handleSelectAllActive} className="hover:underline">{t('insp.activeTabs')}</button>
                      <span>·</span>
                      <button onClick={handleSelectAllSaved} className="hover:underline">{t('insp.selectAll')}</button>
                    </div>
                  </div>

                  {/* 主机复选列表 */}
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {savedSessions.map(session => {
                      const isConnected = openTabs.some(t => (t.sessionId || t.id) === session.id);
                      const isSelected = selectedSessionIds.includes(session.id);
                      return (
                        <label
                          key={session.id}
                          className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer border transition-colors ${
                            isSelected
                              ? 'bg-[#04395e]/40 border-[#0078d4]/60 text-white'
                              : 'bg-[#1e1e1e] border-[#2b2b2b] text-[#cccccc] hover:border-[#3c3c3c]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSession(session.id)}
                              className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#0078d4] focus:ring-0"
                            />
                            <span className="truncate font-medium">{session.name}</span>
                          </div>
                          {isConnected && (
                            <span className="w-2 h-2 rounded-full bg-[#4ec9b0] shrink-0" title={t('inspection.activeConnTitle') || '活跃连接中'} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 检查项列表 */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2 custom-scrollbar">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#e0e0e0] uppercase tracking-wider">
                      {t('insp.checkItems')} ({checks.filter(c => c.enabled).length}/{checks.length})
                    </span>
                  </div>
                  {checks.map(chk => (
                    <label
                      key={chk.id}
                      className={`block p-2.5 rounded border text-xs cursor-pointer transition-colors ${
                        chk.enabled
                          ? 'bg-[#252526] border-[#0078d4]/40 text-[#e0e0e0]'
                          : 'bg-[#1e1e1e] border-[#2b2b2b] text-[#858585]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="checkbox"
                          checked={chk.enabled}
                          onChange={() => handleToggleCheck(chk.id)}
                          className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#0078d4] focus:ring-0"
                        />
                        <span className="font-medium text-[#e0e0e0] truncate">{chk.name}</span>
                      </div>
                      <p className="text-[11px] text-[#858585] pl-5 leading-relaxed">{chk.description}</p>
                    </label>
                  ))}
                </div>

                {/* 启动按钮 */}
                <div className="p-3.5 border-t border-[#2b2b2b] bg-[#1f1f1f]">
                  <button
                    onClick={handleRunInspection}
                    disabled={isRunning || selectedSessionIds.length === 0}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
                  >
                    {isRunning ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('insp.running')}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t('insp.startBtn')} ({selectedSessionIds.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 右侧展示面板 (报告视图) */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
                {currentReport ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* 报告头部总结卡片 */}
                    <div className="p-4 border-b border-[#2b2b2b] bg-[#252526] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">{currentReport.title}</h3>
                          <p className="text-xs text-[#858585] mt-0.5">{currentReport.summary}</p>
                        </div>
                        {/* 导出按钮组 */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={exportMarkdown}
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#0078d4] text-[#cccccc] rounded text-xs transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t('insp.exportMd')}</span>
                          </button>
                          <button
                            onClick={exportHTML}
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#0078d4] text-[#cccccc] rounded text-xs transition-colors"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>{t('insp.exportHtml')}</span>
                          </button>
                          <button
                            onClick={exportJSON}
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#0078d4] text-[#cccccc] rounded text-xs transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('insp.exportJson')}</span>
                          </button>
                        </div>
                      </div>

                      {/* 核心状态指标卡片 */}
                      <div className="grid grid-cols-5 gap-2.5 pt-1">
                        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5">
                          <span className="text-[11px] text-[#858585]">{t('insp.totalHosts')}</span>
                          <div className="text-lg font-semibold text-[#e0e0e0] mt-0.5">{currentReport.hostCount}</div>
                        </div>
                        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5">
                          <span className="text-[11px] text-[#858585]">{t('insp.healthyHosts')}</span>
                          <div className="text-lg font-semibold text-[#4ec9b0] mt-0.5">
                            {Object.values(currentReport.hostResults).filter(h => h.status === 'success').length}
                          </div>
                        </div>
                        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5">
                          <span className="text-[11px] text-[#858585]">{t('insp.warningHosts')}</span>
                          <div className="text-lg font-semibold text-[#cca700] mt-0.5">
                            {Object.values(currentReport.hostResults).filter(h => h.status === 'warning').length}
                          </div>
                        </div>
                        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5">
                          <span className="text-[11px] text-[#858585]">{t('insp.errorHosts')}</span>
                          <div className="text-lg font-semibold text-[#f14c4c] mt-0.5">
                            {Object.values(currentReport.hostResults).filter(h => h.status === 'error' || h.status === 'failed').length}
                          </div>
                        </div>
                        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5">
                          <span className="text-[11px] text-[#858585]">{t('insp.totalDuration')}</span>
                          <div className="text-lg font-semibold text-[#0078d4] mt-0.5">{currentReport.durationMs}ms</div>
                        </div>
                      </div>

                      {/* 视图切换 */}
                      <div className="flex border-b border-[#2b2b2b] pt-1">
                        <button
                          onClick={() => setViewMode('matrix')}
                          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                            viewMode === 'matrix'
                              ? 'border-[#0078d4] text-[#0078d4]'
                              : 'border-transparent text-[#858585] hover:text-[#cccccc]'
                          }`}
                        >
                          主机矩阵视图
                        </button>
                        <button
                          onClick={() => setViewMode('issues')}
                          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                            viewMode === 'issues'
                              ? 'border-[#0078d4] text-[#0078d4]'
                              : 'border-transparent text-[#858585] hover:text-[#cccccc]'
                          }`}
                        >
                          <span>{t('insp.issuesView')} ({currentReport.issueCount})</span>
                        </button>
                      </div>
                    </div>

                    {/* 报告内容区 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {viewMode === 'matrix' ? (
                        /* 主机矩阵折叠卡片 */
                        Object.values(currentReport.hostResults).map(host => {
                          const isExpanded = expandedHosts[host.sessionId] !== false;
                          const statusBadge =
                            host.status === 'success' ? (
                              <span className="flex items-center space-x-1 text-[#4ec9b0] bg-[#4ec9b0]/10 border border-[#4ec9b0]/30 px-2 py-0.5 rounded text-[11px] font-medium">
                                <CheckCircle className="w-3 h-3" />
                                <span>{t('insp.healthyBadge')}</span>
                              </span>
                            ) : host.status === 'warning' ? (
                              <span className="flex items-center space-x-1 text-[#cca700] bg-[#cca700]/10 border border-[#cca700]/30 px-2 py-0.5 rounded text-[11px] font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{t('insp.warningBadge')} ({host.issueCount})</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-[#f14c4c] bg-[#f14c4c]/10 border border-[#f14c4c]/30 px-2 py-0.5 rounded text-[11px] font-medium">
                                <XCircle className="w-3 h-3" />
                                <span>{t('insp.errorBadge')}</span>
                              </span>
                            );

                          return (
                            <div
                              key={host.sessionId}
                              className="bg-[#252526] border border-[#2b2b2b] rounded overflow-hidden shadow-sm"
                            >
                              <div
                                onClick={() => toggleHostExpand(host.sessionId)}
                                className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#2a2d2e] transition-colors"
                              >
                                <div className="flex items-center space-x-2.5">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-[#858585]" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-[#858585]" />
                                  )}
                                  <Server className="w-4 h-4 text-[#858585]" />
                                  <div>
                                    <span className="text-xs font-medium text-[#e0e0e0] mr-2">{host.hostName}</span>
                                    <span className="text-xs font-mono text-[#858585]">{host.hostIp}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs font-mono text-[#858585]">{host.executionMs}ms</span>
                                  {statusBadge}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="p-3.5 border-t border-[#2b2b2b] bg-[#1e1e1e] space-y-2.5">
                                  {host.error ? (
                                    <div className="p-2.5 bg-[#f14c4c]/10 border border-[#f14c4c]/30 rounded text-xs text-[#f14c4c]">
                                      {host.error}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      {Object.values(host.checkItems).map(item => (
                                        <div
                                          key={item.checkId}
                                          className={`p-2.5 rounded border text-xs ${
                                            item.hasIssue
                                              ? 'bg-[#cca700]/10 border-[#cca700]/30 text-[#cca700]'
                                              : 'bg-[#252526] border-[#2b2b2b] text-[#cccccc]'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-[#e0e0e0]">{item.name}</span>
                                            <span className="text-[10px] font-mono text-[#858585]">{item.durationMs}ms</span>
                                          </div>
                                          {item.hasIssue && (
                                            <div className="text-[11px] text-[#cca700] font-medium mb-1.5 flex items-center space-x-1">
                                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                              <span>{item.issueDetail}</span>
                                            </div>
                                          )}
                                          <pre className="p-2 bg-[#181818] rounded border border-[#2b2b2b] font-mono text-[11px] text-[#cccccc] overflow-x-auto max-h-32">
                                            {item.output || '(无输出)'}
                                          </pre>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        /* 异常与隐患项聚焦卡片 */
                        <div className="space-y-3">
                          {currentReport.issueCount === 0 ? (
                            <div className="text-center py-12 text-[#858585] text-xs">
                              {t('insp.allPassed')}
                            </div>
                          ) : (
                            Object.values(currentReport.hostResults).map(host => {
                              const issueItems = Object.values(host.checkItems).filter(i => i.hasIssue);
                              if (issueItems.length === 0) return null;
                              return (
                                <div
                                  key={host.sessionId}
                                  className="bg-[#252526] border border-[#cca700]/30 rounded p-3.5 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-2">
                                    <div className="flex items-center space-x-2">
                                      <Server className="w-4 h-4 text-[#cca700]" />
                                      <span className="text-xs font-medium text-[#e0e0e0]">{host.hostName}</span>
                                      <span className="text-xs text-[#858585] font-mono">({host.hostIp})</span>
                                    </div>
                                    <span className="text-xs text-[#cca700] font-medium">
                                      {(t('inspection.foundIssues') || '发现 {count} 项异常').replace('{count}', String(issueItems.length))}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {issueItems.map(it => (
                                      <div key={it.checkId} className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5">
                                        <div className="flex items-center space-x-1.5 text-xs font-medium text-[#cca700] mb-1">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          <span>{it.name}: {it.issueDetail}</span>
                                        </div>
                                        <pre className="p-2 bg-[#181818] rounded font-mono text-[11px] text-[#cccccc] border border-[#2b2b2b] overflow-x-auto max-h-36">
                                          {it.output}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Activity className="w-10 h-10 text-[#858585] mb-2.5 stroke-[1.5]" />
                    <h3 className="text-xs font-semibold text-[#e0e0e0] mb-1">{t('insp.notStartedTitle')}</h3>
                    <p className="text-xs text-[#858585] max-w-sm mb-4">
                      {t('insp.notStartedDesc')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 历史报告列表 */
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              <h3 className="text-xs font-semibold text-[#858585] uppercase tracking-wider">{t('insp.historyTitle')}</h3>
              {historyReports.length === 0 ? (
                <div className="text-center py-16 text-[#858585] text-xs">{t('insp.noHistory')}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {historyReports.map(rep => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setCurrentReport(rep);
                        setActiveTab('inspect');
                      }}
                      className="bg-[#252526] border border-[#2b2b2b] hover:border-[#0078d4]/60 rounded p-3.5 cursor-pointer transition-all hover:bg-[#2a2d2e] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-medium text-[#e0e0e0]">{rep.title}</h4>
                          <span className="text-[11px] font-mono text-[#858585]">{rep.durationMs}ms</span>
                        </div>
                        <p className="text-xs text-[#858585] line-clamp-2 mb-2.5">{rep.summary}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#858585] pt-2 border-t border-[#2b2b2b]">
                        <span>{new Date(rep.createdAt * 1000).toLocaleString()}</span>
                        <div className="flex items-center space-x-2">
                          <span>{(t('inspection.hostsCount') || '主机: {count}').replace('{count}', String(rep.hostCount))}</span>
                          <span className={rep.issueCount > 0 ? 'text-[#cca700]' : 'text-[#4ec9b0]'}>
                            {(t('inspection.issuesCount') || '异常: {count}').replace('{count}', String(rep.issueCount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

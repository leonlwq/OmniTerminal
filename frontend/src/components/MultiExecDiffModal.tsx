import React, { useState } from 'react';
import { 
  X, Play, Copy, Check, Download, AlertCircle, CheckCircle2, 
  Server, Clock, Terminal, Columns, LayoutGrid, FileText, ChevronRight
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export interface CommandDiffResult {
  sessionId: string;
  hostName: string;
  output: string;
  exitCode: number;
  durationMs: number;
  error?: string;
}

interface MultiExecDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSessions: { id: string; name: string; host: string; isConnected?: boolean }[];
}

// Preset commands will be evaluated inside component with i18n

export const MultiExecDiffModal: React.FC<MultiExecDiffModalProps> = ({
  isOpen,
  onClose,
  availableSessions,
}) => {
  const { t } = useI18n();

  const presetCommands = [
    { label: t('diff.presetSysInfo') || '系统信息', cmd: 'uname -a' },
    { label: t('diff.presetDisk') || '磁盘用量', cmd: 'df -h' },
    { label: t('diff.presetMem') || '内存状态', cmd: 'free -m' },
    { label: t('diff.presetUptime') || '负载与开机时长', cmd: 'uptime' },
    { label: t('diff.presetOS') || '系统发行版', cmd: 'cat /etc/os-release | grep PRETTY_NAME' },
    { label: t('diff.presetDocker') || 'Docker 容器', cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}"' },
  ];
  const [command, setCommand] = useState<string>('uname -a');
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(
    availableSessions.slice(0, 4).map(s => s.id)
  );
  const [results, setResults] = useState<CommandDiffResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'matrix' | 'unified'>('side-by-side');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string>('');

  const appRpc = typeof window !== 'undefined' ? (window as any).go?.app?.App : null;

  if (!isOpen) return null;

  const handleToggleSession = (id: string) => {
    setSelectedSessionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSessionIds.length === availableSessions.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(availableSessions.map(s => s.id));
    }
  };

  const handleRun = async () => {
    if (!command.trim() || selectedSessionIds.length === 0) return;
    setIsRunning(true);
    try {
      if (appRpc?.ExecuteCommandOnSessions) {
        const res: CommandDiffResult[] = await appRpc.ExecuteCommandOnSessions(selectedSessionIds, command.trim());
        setResults(res || []);
      } else {
        // Mock fallback for UI preview
        const mock: CommandDiffResult[] = selectedSessionIds.map(id => {
          const sess = availableSessions.find(s => s.id === id);
          return {
            sessionId: id,
            hostName: sess?.name || id,
            output: `Linux ${sess?.host || 'server'} 5.15.0-89-generic #99-Ubuntu SMP Fri Nov 3 15:20:12 UTC 2023 x86_64`,
            exitCode: 0,
            durationMs: Math.floor(Math.random() * 80) + 20,
          };
        });
        setResults(mock);
      }
    } catch (err: any) {
      console.error('批量执行失败', err);
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportMarkdown = () => {
    if (results.length === 0) return;
    let md = `# 多主机命令执行结果对比\n\n- **命令**: \`${command}\`\n- **时间**: ${new Date().toLocaleString()}\n\n`;
    results.forEach(res => {
      md += `### 主机: ${res.hostName} (耗时: ${res.durationMs}ms, 退出码: ${res.exitCode})\n\`\`\`\n${res.output || res.error || ''}\n\`\`\`\n\n`;
    });

    navigator.clipboard.writeText(md);
    setExportNotice(t('diff.copyMdNotice') || 'Markdown 已复制到剪贴板！');
    setTimeout(() => setExportNotice(''), 2500);
  };

  // 计算输出一致性分组
  const consistencyGroups = results.reduce<Record<string, CommandDiffResult[]>>((acc, r) => {
    const key = r.output.trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const groupKeys = Object.keys(consistencyGroups);
  const isAllConsistent = groupKeys.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="flex flex-col w-[94vw] max-w-[1300px] h-[88vh] bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] overflow-hidden text-[#cccccc]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Columns className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] flex items-center gap-2">
                {t('multiExecDiff.title')}
              </h2>
              <p className="text-xs text-[#858585]">
                {t('multiExecDiff.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exportNotice && (
              <span className="text-xs text-[#4ec9b0] bg-[#4ec9b0]/10 border border-[#4ec9b0]/30 px-2 py-0.5 rounded flex items-center gap-1">
                <Check className="w-3 h-3" />
                {exportNotice}
              </span>
            )}
            <button
              onClick={exportMarkdown}
              disabled={results.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors disabled:opacity-40"
              title="Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('multiExecDiff.exportMd')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#333333] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Input & Host Selection Bar */}
        <div className="p-3.5 bg-[#1e1e1e] border-b border-[#2b2b2b] space-y-2.5">
          {/* Command Row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 focus-within:border-[#0078d4] transition-colors">
              <Terminal className="w-4 h-4 text-[#0078d4] shrink-0" />
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                placeholder={t('multiExecDiff.cmdPlaceholder')}
                className="w-full bg-transparent text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none font-mono"
              />
            </div>
            <button
              onClick={handleRun}
              disabled={isRunning || !command.trim() || selectedSessionIds.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium disabled:opacity-40 transition-colors shrink-0"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? t('multiExecDiff.executing') : t('multiExecDiff.execute')}</span>
            </button>
          </div>

          {/* Quick Presets & Target Host Chips */}
          <div className="flex items-center justify-between gap-4 text-xs">
            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[#858585] shrink-0">{t('common.quickPresets', '快捷预设:')}</span>
              {presetCommands.map(p => (
                <button
                  key={p.cmd}
                  onClick={() => setCommand(p.cmd)}
                  className="px-2 py-0.5 rounded bg-[#252526] hover:bg-[#2a2d2e] text-[#cccccc] border border-[#2b2b2b] font-mono text-[11px] shrink-0 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#181818] p-0.5 rounded border border-[#2b2b2b] shrink-0">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'side-by-side' ? 'bg-[#04395e] text-white font-medium' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{t('multiExecDiff.sideBySide')}</span>
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'matrix' ? 'bg-[#04395e] text-white font-medium' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t('multiExecDiff.grouped')}</span>
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'unified' ? 'bg-[#04395e] text-white font-medium' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('multiExecDiff.aggregated')}</span>
              </button>
            </div>
          </div>

          {/* Host Selector */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#2b2b2b] overflow-x-auto">
            <button
              onClick={handleSelectAll}
              className="text-[11px] text-[#0078d4] hover:underline shrink-0"
            >
              {selectedSessionIds.length === availableSessions.length ? t('multiExecDiff.deselectAll') : t('multiExecDiff.selectAll')}
            </button>
            <span className="text-[#858585]">|</span>
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
              {availableSessions.length === 0 ? (
                <span className="text-xs text-[#858585]">{t('multiExecDiff.noAvailableConn')}</span>
              ) : (
                availableSessions.map(sess => {
                  const isChecked = selectedSessionIds.includes(sess.id);
                  return (
                    <label
                      key={sess.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border transition-colors shrink-0 ${
                        isChecked 
                          ? 'bg-[#04395e]/40 border-[#0078d4]/60 text-white' 
                          : 'bg-[#252526] border-[#2b2b2b] text-[#858585] hover:text-[#cccccc]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSession(sess.id)}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0"
                      />
                      <Server className="w-3.5 h-3.5 text-[#858585]" />
                      <span className="font-mono">{sess.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e] custom-scrollbar">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] space-y-3">
              <Columns className="w-10 h-10 opacity-30" />
              <p className="text-xs">{t('multiExecDiff.emptyPrompt')}</p>
            </div>
          ) : viewMode === 'side-by-side' ? (
            /* Side-by-Side View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map(res => (
                <div 
                  key={res.sessionId}
                  className="flex flex-col bg-[#252526] border border-[#2b2b2b] rounded overflow-hidden shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b]">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#0078d4]" />
                      <span className="text-xs font-semibold text-[#e0e0e0] font-mono">{res.hostName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-[#858585] font-mono">
                        <Clock className="w-3 h-3 text-[#858585]" />
                        {res.durationMs}ms
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        res.exitCode === 0 ? 'bg-[#4ec9b0]/10 text-[#4ec9b0] border border-[#4ec9b0]/30' : 'bg-[#f14c4c]/10 text-[#f14c4c] border border-[#f14c4c]/30'
                      }`}>
                        EXIT {res.exitCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(res.output || res.error || '', res.sessionId)}
                        className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#333333] transition-colors"
                        title={t('diff.copyOutputTooltip') || '复制该机器输出'}
                      >
                        {copiedId === res.sessionId ? <Check className="w-3.5 h-3.5 text-[#4ec9b0]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Output */}
                  <div className="p-3 font-mono text-xs text-[#cccccc] bg-[#181818] overflow-x-auto whitespace-pre-wrap max-h-80 select-text leading-relaxed custom-scrollbar">
                    {res.error ? (
                      <span className="text-[#f14c4c]">{res.error}</span>
                    ) : (
                      res.output || <span className="text-[#858585] italic">{t('diff.noOutput') || '<无输出>'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'matrix' ? (
            /* Consistency & Matrix View */
            <div className="space-y-3">
              {/* Consistency Summary Banner */}
              <div className={`p-3.5 rounded border flex items-center justify-between ${
                isAllConsistent
                  ? 'bg-[#4ec9b0]/10 border-[#4ec9b0]/30 text-[#4ec9b0]'
                  : 'bg-[#cca700]/10 border-[#cca700]/30 text-[#cca700]'
              }`}>
                <div className="flex items-center gap-2.5">
                  {isAllConsistent ? (
                    <CheckCircle2 className="w-5 h-5 text-[#4ec9b0]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#cca700]" />
                  )}
                  <div>
                    <h3 className="text-xs font-semibold">
                      {isAllConsistent ? (t('diff.allConsistent') || '所有主机执行结果 100% 完全一致') : (t('diff.outputDiff', `检测到输出差异: 存在 ${groupKeys.length} 组不同结果`).replace('{count}', String(groupKeys.length)))}
                    </h3>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {(t('diff.totalHostsCount') || '共 {count} 台主机参与对比执行').replace('{count}', String(results.length))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grouped Output Buckets */}
              <div className="space-y-3">
                {groupKeys.map((key, idx) => {
                  const hostsInGroup = consistencyGroups[key];
                  return (
                    <div key={idx} className="bg-[#252526] border border-[#2b2b2b] rounded overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#e0e0e0]">
                            {(t('diff.outputPattern') || '输出形态 #{idx}').replace('{idx}', String(idx + 1))}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#04395e]/40 text-[#0078d4] border border-[#0078d4]/30 font-mono">
                            {(t('diff.hostsMatched') || '{count} 台主机匹配').replace('{count}', String(hostsInGroup.length))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#858585]">
                            {t('diff.hostList') || '主机列表: '}{hostsInGroup.map(h => h.hostName).join(', ')}
                          </span>
                          <button
                            onClick={() => copyToClipboard(key, `group_${idx}`)}
                            className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#333333] transition-colors"
                            title={t('diff.copyGroupOutput') || '复制输出'}
                          >
                            {copiedId === `group_${idx}` ? <Check className="w-3.5 h-3.5 text-[#4ec9b0]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <pre className="p-3 font-mono text-xs text-[#cccccc] bg-[#181818] overflow-x-auto whitespace-pre-wrap select-text leading-relaxed custom-scrollbar">
                        {key || t('diff.noOutput') || '<无输出>'}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Unified Log View */
            <div className="bg-[#181818] border border-[#2b2b2b] rounded p-4 font-mono text-xs space-y-3 select-text custom-scrollbar">
              {results.map(res => (
                <div key={res.sessionId} className="space-y-1">
                  <div className="text-[#0078d4] font-medium border-b border-[#2b2b2b] pb-1">
                    === [{res.hostName}] (耗时: {res.durationMs}ms, 退出码: {res.exitCode}) ===
                  </div>
                  <pre className="text-[#cccccc] whitespace-pre-wrap pl-2 leading-relaxed">
                    {res.error || res.output || t('diff.noOutput') || '<无输出>'}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

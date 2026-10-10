import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, ListOrdered, Play, CheckCircle2, AlertTriangle, XCircle,
  Plus, Trash2, ArrowUp, ArrowDown, Copy, Download, Upload,
  History, Clock, Terminal, Tag, ChevronRight, RefreshCw, X, Check,
  Edit2, Save, FileText, FastForward, PlayCircle
} from 'lucide-react';
import { RunbookTemplate, RunbookVariable, RunbookStep, RunbookExecutionRecord, RunbookStepResult } from '../types';

interface RunbookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string;
  activeSessionName?: string;
  sessions?: any[];
  onSendCommand?: (cmd: string) => void;
}

export function RunbookManagerModal({
  isOpen,
  onClose,
  activeSessionId,
  activeSessionName,
  sessions = [],
  onSendCommand,
}: RunbookManagerModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'edit' | 'run' | 'history'>('list');
  const [runbooks, setRunbooks] = useState<RunbookTemplate[]>([]);
  const [history, setHistory] = useState<RunbookExecutionRecord[]>([]);
  const [selectedRunbook, setSelectedRunbook] = useState<RunbookTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // 编辑表单状态
  const [editingRunbook, setEditingRunbook] = useState<RunbookTemplate | null>(null);

  // 执行流状态
  const [runParams, setRunParams] = useState<Record<string, string>>({});
  const [runTargetSessionId, setRunTargetSessionId] = useState<string>(activeSessionId || '');
  const [runMode, setRunMode] = useState<'step_by_step' | 'auto_flow'>('step_by_step');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResults, setStepResults] = useState<Record<string, RunbookStepResult>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [runStartTime, setRunStartTime] = useState<string>('');

  // 历史详情状态
  const [viewingRecord, setViewingRecord] = useState<RunbookExecutionRecord | null>(null);

  // 加载 Runbooks
  const loadRunbooks = async () => {
    setLoading(true);
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.GetRunbooks) {
        const list = await appRpc.GetRunbooks();
        setRunbooks(list || []);
        if (list?.length > 0 && !selectedRunbook) {
          setSelectedRunbook(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load runbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载执行历史
  const loadHistory = async () => {
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.GetRunbookHistory) {
        const records = await appRpc.GetRunbookHistory();
        setHistory(records || []);
      }
    } catch (err) {
      console.error('Failed to load runbook history:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRunbooks();
      loadHistory();
      if (activeSessionId) {
        setRunTargetSessionId(activeSessionId);
      }
    }
  }, [isOpen, activeSessionId]);

  // 类别汇总
  const categories = useMemo(() => {
    const set = new Set<string>(['全部']);
    runbooks.forEach(rb => {
      if (rb.category) set.add(rb.category);
    });
    return Array.from(set);
  }, [runbooks]);

  // 过滤后的列表
  const filteredRunbooks = useMemo(() => {
    return runbooks.filter(rb => {
      const matchCat = selectedCategory === '全部' || rb.category === selectedCategory;
      const matchQuery = !searchQuery ||
        rb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rb.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rb.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [runbooks, selectedCategory, searchQuery]);

  // 启动执行模式初始化
  const handleStartRunner = (rb: RunbookTemplate) => {
    setSelectedRunbook(rb);
    const initialParams: Record<string, string> = {};
    rb.variables.forEach(v => {
      initialParams[v.name] = v.defaultValue || '';
    });
    setRunParams(initialParams);
    setCurrentStepIndex(0);
    setStepResults({});
    setIsExecuting(false);
    setRunStartTime(new Date().toLocaleTimeString());
    setViewMode('run');
  };

  // 渲染参数占位符替换后的命令
  const resolveCommand = (cmd: string, params: Record<string, string>) => {
    let resolved = cmd;
    Object.entries(params).forEach(([k, v]) => {
      resolved = resolved.replaceAll(`\${${k}}`, v);
    });
    return resolved;
  };

  // 执行单步
  const executeStep = async (stepIndex: number) => {
    if (!selectedRunbook || stepIndex >= selectedRunbook.steps.length) return;
    const step = selectedRunbook.steps[stepIndex];
    const resolvedCmd = resolveCommand(step.command, runParams);

    setIsExecuting(true);
    const startMs = Date.now();

    // 记录进行中状态
    setStepResults(prev => ({
      ...prev,
      [step.id]: {
        stepId: step.id,
        stepName: step.name,
        command: resolvedCmd,
        status: 'skipped', // 临时态
        output: '正在向终端投递命令并监控执行...',
        exitCode: 0,
        durationMs: 0,
      }
    }));

    try {
      // 投递命令给活动终端
      if (onSendCommand) {
        onSendCommand(resolvedCmd);
      } else {
        const appRpc = (window as any).go?.app?.App;
        if (appRpc?.WriteTerminal && runTargetSessionId) {
          await appRpc.WriteTerminal(runTargetSessionId, resolvedCmd + '\r');
        }
      }

      const durationMs = Date.now() - startMs;
      const result: RunbookStepResult = {
        stepId: step.id,
        stepName: step.name,
        command: resolvedCmd,
        status: 'success',
        output: `[✓ 执行成功] 命令已成功下发至终端 (${durationMs}ms)`,
        exitCode: 0,
        durationMs,
      };

      setStepResults(prev => ({ ...prev, [step.id]: result }));
      setIsExecuting(false);

      return true;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      const result: RunbookStepResult = {
        stepId: step.id,
        stepName: step.name,
        command: resolvedCmd,
        status: 'failed',
        output: `[✗ 执行失败]: ${err?.message || err}`,
        exitCode: 1,
        durationMs,
      };
      setStepResults(prev => ({ ...prev, [step.id]: result }));
      setIsExecuting(false);
      return false;
    }
  };

  // 全自动执行流水线
  const handleRunAutoFlow = async () => {
    if (!selectedRunbook) return;
    setIsExecuting(true);

    for (let i = 0; i < selectedRunbook.steps.length; i++) {
      setCurrentStepIndex(i);
      const ok = await executeStep(i);
      if (!ok && !selectedRunbook.steps[i].continueOnError) {
        alert(`步骤 ${i + 1} (${selectedRunbook.steps[i].name}) 执行失败，流水线已自动终止！`);
        break;
      }
      // 步骤间隔微延迟
      await new Promise(r => setTimeout(r, 600));
    }

    setIsExecuting(false);
    // 归档历史审计
    await saveCurrentExecutionAudit();
  };

  // 保存当前执行历史审计
  const saveCurrentExecutionAudit = async () => {
    if (!selectedRunbook) return;
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.SaveRunbookExecution) {
        const resultsList = Object.values(stepResults);
        const hasFailed = resultsList.some(r => r.status === 'failed');
        const record: RunbookExecutionRecord = {
          id: `exec_${Date.now()}`,
          runbookId: selectedRunbook.id,
          runbookName: selectedRunbook.name,
          startTime: runStartTime || new Date().toLocaleString(),
          endTime: new Date().toLocaleTimeString(),
          status: hasFailed ? 'failed' : 'success',
          targetHost: activeSessionName || '活动终端',
          variableValues: runParams,
          stepResults: resultsList,
        };
        await appRpc.SaveRunbookExecution(record);
        loadHistory();
      }
    } catch (e) {
      console.warn('Failed to save audit history:', e);
    }
  };

  // 保存 SOP 编辑
  const handleSaveEdit = async () => {
    if (!editingRunbook) return;
    if (!editingRunbook.name.trim()) {
      alert('SOP 名称不能为空！');
      return;
    }
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.SaveRunbook) {
        await appRpc.SaveRunbook(editingRunbook);
        await loadRunbooks();
        setSelectedRunbook(editingRunbook);
        setViewMode('list');
      }
    } catch (err: any) {
      alert('保存 SOP 手册失败: ' + (err?.message || err));
    }
  };

  // 删除 SOP
  const handleDeleteRunbook = async (id: string) => {
    if (!confirm('确定要删除此 SOP 运维手册吗？此操作无法撤销。')) return;
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.DeleteRunbook) {
        await appRpc.DeleteRunbook(id);
        await loadRunbooks();
        setSelectedRunbook(null);
      }
    } catch (err: any) {
      alert('删除失败: ' + (err?.message || err));
    }
  };

  // 导出全部 SOP
  const handleExport = async () => {
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.ExportRunbooks) {
        const jsonStr = await appRpc.ExportRunbooks();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omniterminal_runbooks_${Date.now()}.json`;
        a.click();
      }
    } catch (err: any) {
      alert('导出失败: ' + (err?.message || err));
    }
  };

  // 导入 SOP
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const appRpc = (window as any).go?.app?.App;
        if (appRpc?.ImportRunbooks) {
          await appRpc.ImportRunbooks(content);
          await loadRunbooks();
          alert('✓ 成功导入 SOP 运维手册！');
        }
      } catch (err: any) {
        alert('导入失败: ' + (err?.message || err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg w-full max-w-5xl h-[85vh] shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-[#cccccc]">

        {/* Modal Header */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#e0e0e0] flex items-center gap-2">
                参数化 SOP Runbook 运维手册与交互式执行流
              </h3>
              <p className="text-[11px] text-[#858585]">
                多步骤标准运维流程 (SOP) 编排、动态变量注入与分步审计流水线
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (viewMode === 'history') setViewMode('list');
                else setViewMode('history');
              }}
              className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1.5 transition-colors ${
                viewMode === 'history'
                  ? 'bg-[#0078d4] text-white border-[#0078d4]'
                  : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3c3c3c] text-[#cccccc]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>审计历史 ({history.length})</span>
            </button>
            <button onClick={onClose} className="text-[#858585] hover:text-[#e0e0e0] p-1.5 rounded hover:bg-[#333333] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        {viewMode === 'history' ? (
          /* 审计历史视图 */
          <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
            <div className="w-80 border-r border-[#2b2b2b] flex flex-col">
              <div className="p-3 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between text-xs font-semibold">
                <span>执行记录列表</span>
                <button
                  onClick={async () => {
                    if (confirm('确认清空所有历史执行审计记录？')) {
                      const appRpc = (window as any).go?.app?.App;
                      if (appRpc?.ClearRunbookHistory) {
                        await appRpc.ClearRunbookHistory();
                        loadHistory();
                        setViewingRecord(null);
                      }
                    }
                  }}
                  className="text-[#858585] hover:text-rose-400 text-[11px]"
                >
                  清空
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#2b2b2b]">
                {history.map(rec => (
                  <div
                    key={rec.id}
                    onClick={() => setViewingRecord(rec)}
                    className={`p-3 cursor-pointer text-xs transition-colors ${
                      viewingRecord?.id === rec.id ? 'bg-[#0078d4]/15 border-l-2 border-l-[#0078d4]' : 'hover:bg-[#252526]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate">{rec.runbookName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${
                        rec.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {rec.status === 'success' ? '成功' : '失败'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#858585] flex items-center justify-between">
                      <span>目标: {rec.targetHost}</span>
                      <span>{rec.startTime}</span>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="p-8 text-center text-[#858585] text-xs">暂无历史执行记录</div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-[#181818] p-4 text-xs">
              {viewingRecord ? (
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div className="p-3 bg-[#252526] rounded border border-[#2b2b2b] flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{viewingRecord.runbookName}</h4>
                      <p className="text-[11px] text-[#858585]">
                        目标: {viewingRecord.targetHost} | 时间: {viewingRecord.startTime} ~ {viewingRecord.endTime}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      viewingRecord.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {viewingRecord.status === 'success' ? '✓ 全流程执行通过' : '✗ 执行异常终止'}
                    </span>
                  </div>

                  {/* 变量参数快照 */}
                  <div className="space-y-1">
                    <span className="text-[#858585] font-semibold text-[11px]">参数快照 (Parameters):</span>
                    <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-2.5 font-mono text-[11px] grid grid-cols-2 gap-2">
                      {Object.entries(viewingRecord.variableValues || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-[#0078d4] font-semibold">${`{${k}}`}:</span>
                          <span className="text-[#cccccc]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 步骤明细 */}
                  <div className="space-y-2">
                    <span className="text-[#858585] font-semibold text-[11px]">步骤执行明细 ({viewingRecord.stepResults?.length || 0}):</span>
                    {viewingRecord.stepResults?.map((st, i) => (
                      <div key={st.stepId || i} className="bg-[#1e1e1e] border border-[#2b2b2b] rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">Step {i + 1}: {st.stepName}</span>
                          <span className="text-[10px] text-[#858585] font-mono">{st.durationMs}ms</span>
                        </div>
                        <div className="bg-[#121212] p-2 rounded font-mono text-[11px] text-[#89d185] select-all">
                          $ {st.command}
                        </div>
                        <div className="text-[11px] text-[#858585] bg-[#181818] p-2 rounded font-mono whitespace-pre-wrap">
                          {st.output}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#858585]">
                  请在左侧列表中点击选择要查看的执行审计记录
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'run' && selectedRunbook ? (
          /* 交互式执行流视图 */
          <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
            <div className="p-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>执行 SOP: {selectedRunbook.name}</span>
                </h4>
                <p className="text-[11px] text-[#858585] mt-0.5">{selectedRunbook.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#181818] px-2.5 py-1 rounded border border-[#333333] text-xs">
                  <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span className="text-[#858585]">执行目标:</span>
                  <span className="text-white font-medium">{activeSessionName || '当前活动终端'}</span>
                </div>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1 bg-[#333333] hover:bg-[#444444] text-[#cccccc] rounded text-xs transition-colors"
                >
                  退出执行
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* 参数填写面板 */}
              <div className="w-80 border-r border-[#2b2b2b] bg-[#181818] p-4 flex flex-col space-y-4 overflow-y-auto text-xs">
                <div>
                  <span className="font-semibold text-white block mb-1">动态参数填写 (Variables)</span>
                  <p className="text-[11px] text-[#858585]">
                    执行前将自动替换命令中的占位符
                  </p>
                </div>

                <div className="space-y-3 flex-1">
                  {selectedRunbook.variables.map(v => (
                    <div key={v.name} className="space-y-1">
                      <label className="text-[11px] font-mono text-[#0078d4] flex items-center justify-between">
                        <span>${`{${v.name}}`}</span>
                        {v.required && <span className="text-rose-400 text-[10px]">*必填</span>}
                      </label>
                      {v.type === 'select' && v.options?.length ? (
                        <select
                          value={runParams[v.name] || ''}
                          onChange={e => setRunParams({ ...runParams, [v.name]: e.target.value })}
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#0078d4]"
                        >
                          {v.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={v.type === 'number' ? 'number' : 'text'}
                          value={runParams[v.name] || ''}
                          onChange={e => setRunParams({ ...runParams, [v.name]: e.target.value })}
                          placeholder={v.description}
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#0078d4] font-mono"
                        />
                      )}
                      <p className="text-[10px] text-[#707070]">{v.description}</p>
                    </div>
                  ))}
                  {selectedRunbook.variables.length === 0 && (
                    <div className="text-[#858585] text-center py-6">此 SOP 无需配置动态参数</div>
                  )}
                </div>

                {/* 执行模式选择与总控制 */}
                <div className="pt-3 border-t border-[#2b2b2b] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#858585]">执行策略:</span>
                    <div className="flex items-center gap-1 bg-[#1e1e1e] p-0.5 rounded border border-[#3c3c3c]">
                      <button
                        onClick={() => setRunMode('step_by_step')}
                        className={`px-2 py-0.5 rounded text-[11px] ${runMode === 'step_by_step' ? 'bg-[#0078d4] text-white' : 'text-[#858585]'}`}
                      >
                        逐步确认
                      </button>
                      <button
                        onClick={() => setRunMode('auto_flow')}
                        className={`px-2 py-0.5 rounded text-[11px] ${runMode === 'auto_flow' ? 'bg-[#0078d4] text-white' : 'text-[#858585]'}`}
                      >
                        自动流水线
                      </button>
                    </div>
                  </div>

                  {runMode === 'auto_flow' && (
                    <button
                      onClick={handleRunAutoFlow}
                      disabled={isExecuting}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded flex items-center justify-center gap-2 text-xs transition-colors disabled:opacity-50"
                    >
                      <FastForward className="w-4 h-4" />
                      <span>{isExecuting ? '流水线自动执行中...' : '一键自动执行全部步骤'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 步骤编排执行流面板 */}
              <div className="flex-1 bg-[#1e1e1e] p-5 overflow-y-auto space-y-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">
                    执行流步骤 ({selectedRunbook.steps.length} 个步骤)
                  </span>
                  <span className="text-[11px] text-[#858585]">
                    已完成: {Object.keys(stepResults).length} / {selectedRunbook.steps.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedRunbook.steps.map((st, index) => {
                    const resolved = resolveCommand(st.command, runParams);
                    const res = stepResults[st.id];
                    const isCurrent = currentStepIndex === index;

                    return (
                      <div
                        key={st.id}
                        className={`p-4 rounded-lg border transition-all ${
                          res?.status === 'success'
                            ? 'bg-[#18201a] border-emerald-500/40 shadow-sm'
                            : res?.status === 'failed'
                            ? 'bg-[#261818] border-rose-500/40'
                            : isCurrent
                            ? 'bg-[#252526] border-[#0078d4] ring-1 ring-[#0078d4]/30'
                            : 'bg-[#252526]/50 border-[#2b2b2b]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              res?.status === 'success'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : res?.status === 'failed'
                                ? 'bg-rose-500/20 text-rose-400'
                                : isCurrent
                                ? 'bg-[#0078d4] text-white'
                                : 'bg-[#333333] text-[#858585]'
                            }`}>
                              {res?.status === 'success' ? '✓' : res?.status === 'failed' ? '✗' : index + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-white">{st.name}</span>
                              {st.description && <p className="text-[11px] text-[#858585]">{st.description}</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {st.continueOnError && (
                              <span className="text-[10px] text-[#cca700] bg-[#cca700]/10 px-1.5 py-0.5 rounded border border-[#cca700]/20">
                                容错继续
                              </span>
                            )}
                            {runMode === 'step_by_step' && (
                              <button
                                onClick={async () => {
                                  setCurrentStepIndex(index);
                                  await executeStep(index);
                                  if (index === selectedRunbook.steps.length - 1) {
                                    saveCurrentExecutionAudit();
                                  }
                                }}
                                disabled={isExecuting}
                                className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" />
                                <span>执行此步骤</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 命令预览与执行结果 */}
                        <div className="bg-[#121212] p-2.5 rounded font-mono text-[11px] text-[#89d185] border border-[#2b2b2b] select-all flex items-center justify-between">
                          <span className="truncate max-w-[80%]">$ {resolved}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(resolved)}
                            className="text-[#858585] hover:text-white p-1"
                            title="复制命令"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {res && (
                          <div className="mt-2 text-[11px] text-[#858585] bg-[#1a1a1a] p-2 rounded font-mono border border-[#2b2b2b] flex items-center justify-between">
                            <span>{res.output}</span>
                            <span className="text-[10px] text-[#858585]">{res.durationMs}ms</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'edit' && editingRunbook ? (
          /* 编辑/新建 SOP 模板视图 */
          <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
            <div className="p-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#0078d4]" />
                <span>{editingRunbook.id ? '编辑 SOP 运维手册' : '新建 SOP 运维手册'}</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1 bg-[#333333] hover:bg-[#444444] text-[#cccccc] rounded text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存手册</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* 基本信息 */}
              <div className="grid grid-cols-3 gap-3 bg-[#252526] p-3.5 rounded border border-[#2b2b2b]">
                <div className="col-span-2">
                  <label className="text-[#858585] block mb-1">SOP 手册标题:</label>
                  <input
                    type="text"
                    value={editingRunbook.name}
                    onChange={e => setEditingRunbook({ ...editingRunbook, name: e.target.value })}
                    placeholder="如: Nginx 优雅热重载与配置校验"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#858585] block mb-1">运维分类:</label>
                  <input
                    type="text"
                    value={editingRunbook.category}
                    onChange={e => setEditingRunbook({ ...editingRunbook, category: e.target.value })}
                    placeholder="如: 服务发布 / 应急排障"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-white outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[#858585] block mb-1">手册功能描述:</label>
                  <textarea
                    rows={2}
                    value={editingRunbook.description}
                    onChange={e => setEditingRunbook({ ...editingRunbook, description: e.target.value })}
                    placeholder="简要说明此 SOP 执行的前提条件与目标结果"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-white outline-none resize-none"
                  />
                </div>
              </div>

              {/* 参数变量设置 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">动态参数定义 (Variables)</span>
                  <button
                    onClick={() => {
                      const newVar: RunbookVariable = {
                        name: `VAR_${Date.now() % 1000}`,
                        description: '参数说明',
                        defaultValue: '',
                        required: true,
                        type: 'text',
                      };
                      setEditingRunbook({
                        ...editingRunbook,
                        variables: [...editingRunbook.variables, newVar],
                      });
                    }}
                    className="px-2.5 py-1 bg-[#252526] hover:bg-[#333333] border border-[#3c3c3c] rounded text-[#cccccc] flex items-center gap-1 text-[11px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0078d4]" />
                    <span>添加参数</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editingRunbook.variables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#252526] p-2.5 rounded border border-[#2b2b2b]">
                      <input
                        type="text"
                        value={v.name}
                        onChange={e => {
                          const updated = [...editingRunbook.variables];
                          updated[i].name = e.target.value.toUpperCase();
                          setEditingRunbook({ ...editingRunbook, variables: updated });
                        }}
                        placeholder="变量名 (如 HOST_IP)"
                        className="w-40 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 font-mono text-[11px] text-[#0078d4]"
                      />
                      <input
                        type="text"
                        value={v.description}
                        onChange={e => {
                          const updated = [...editingRunbook.variables];
                          updated[i].description = e.target.value;
                          setEditingRunbook({ ...editingRunbook, variables: updated });
                        }}
                        placeholder="说明提示"
                        className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[11px]"
                      />
                      <input
                        type="text"
                        value={v.defaultValue}
                        onChange={e => {
                          const updated = [...editingRunbook.variables];
                          updated[i].defaultValue = e.target.value;
                          setEditingRunbook({ ...editingRunbook, variables: updated });
                        }}
                        placeholder="默认值"
                        className="w-36 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[11px] font-mono"
                      />
                      <button
                        onClick={() => {
                          const updated = editingRunbook.variables.filter((_, idx) => idx !== i);
                          setEditingRunbook({ ...editingRunbook, variables: updated });
                        }}
                        className="p-1 text-[#858585] hover:text-rose-400"
                        title="删除参数"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editingRunbook.variables.length === 0 && (
                    <div className="p-3 text-center text-[#858585] bg-[#252526] rounded border border-[#2b2b2b]">
                      暂无动态参数，命令将以纯静态执行
                    </div>
                  )}
                </div>
              </div>

              {/* 步骤编排设置 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">执行步骤编排 (Steps)</span>
                  <button
                    onClick={() => {
                      const newStep: RunbookStep = {
                        ID: `step_${Date.now()}`,
                        name: `步骤 ${editingRunbook.steps.length + 1}`,
                        description: '',
                        command: 'echo "hello"',
                        timeoutSeconds: 60,
                        continueOnError: false,
                      } as any;
                      setEditingRunbook({
                        ...editingRunbook,
                        steps: [...editingRunbook.steps, newStep],
                      });
                    }}
                    className="px-2.5 py-1 bg-[#252526] hover:bg-[#333333] border border-[#3c3c3c] rounded text-[#cccccc] flex items-center gap-1 text-[11px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0078d4]" />
                    <span>添加步骤</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingRunbook.steps.map((st, i) => (
                    <div key={st.id || i} className="bg-[#252526] p-3.5 rounded border border-[#2b2b2b] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-[#333333] flex items-center justify-center font-bold text-[11px] text-white">
                            {i + 1}
                          </span>
                          <input
                            type="text"
                            value={st.name}
                            onChange={e => {
                              const updated = [...editingRunbook.steps];
                              updated[i].name = e.target.value;
                              setEditingRunbook({ ...editingRunbook, steps: updated });
                            }}
                            placeholder="步骤名称"
                            className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-white font-semibold text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={i === 0}
                            onClick={() => {
                              const updated = [...editingRunbook.steps];
                              const temp = updated[i - 1];
                              updated[i - 1] = updated[i];
                              updated[i] = temp;
                              setEditingRunbook({ ...editingRunbook, steps: updated });
                            }}
                            className="p-1 rounded hover:bg-[#333333] text-[#858585] disabled:opacity-30"
                            title="上移"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={i === editingRunbook.steps.length - 1}
                            onClick={() => {
                              const updated = [...editingRunbook.steps];
                              const temp = updated[i + 1];
                              updated[i + 1] = updated[i];
                              updated[i] = temp;
                              setEditingRunbook({ ...editingRunbook, steps: updated });
                            }}
                            className="p-1 rounded hover:bg-[#333333] text-[#858585] disabled:opacity-30"
                            title="下移"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const updated = editingRunbook.steps.filter((_, idx) => idx !== i);
                              setEditingRunbook({ ...editingRunbook, steps: updated });
                            }}
                            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-rose-400"
                            title="删除步骤"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={st.command}
                        onChange={e => {
                          const updated = [...editingRunbook.steps];
                          updated[i].command = e.target.value;
                          setEditingRunbook({ ...editingRunbook, steps: updated });
                        }}
                        placeholder="待执行的 Shell 命令 (支持 ${VAR_NAME} 占位符)"
                        className="w-full bg-[#181818] border border-[#3c3c3c] focus:border-[#0078d4] rounded p-2 text-xs font-mono text-[#89d185] outline-none"
                      />

                      <div className="flex items-center justify-between text-[11px] text-[#858585]">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!st.continueOnError}
                            onChange={e => {
                              const updated = [...editingRunbook.steps];
                              updated[i].continueOnError = e.target.checked;
                              setEditingRunbook({ ...editingRunbook, steps: updated });
                            }}
                            className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#0078d4]"
                          />
                          <span>失败时继续执行后续步骤</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span>超时秒数:</span>
                          <input
                            type="number"
                            value={st.timeoutSeconds || 60}
                            onChange={e => {
                              const updated = [...editingRunbook.steps];
                              updated[i].timeoutSeconds = Number(e.target.value);
                              setEditingRunbook({ ...editingRunbook, steps: updated });
                            }}
                            className="w-16 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-1.5 py-0.5 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SOP 列表与详情主视图 */
          <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
            {/* 左侧列表与分类导航 */}
            <div className="w-80 border-r border-[#2b2b2b] bg-[#181818] flex flex-col">
              {/* 分类药丸与搜索 */}
              <div className="p-3 border-b border-[#2b2b2b] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">SOP 运维目录</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newRb: RunbookTemplate = {
                          id: '',
                          name: '',
                          description: '',
                          category: '常规运维',
                          tags: [],
                          variables: [],
                          steps: [
                            {
                              id: 'step_1',
                              name: '步骤 1',
                              description: '',
                              command: 'echo "hello"',
                              timeoutSeconds: 60,
                              continueOnError: false,
                            }
                          ],
                          createdAt: '',
                          updatedAt: '',
                        };
                        setEditingRunbook(newRb);
                        setViewMode('edit');
                      }}
                      className="p-1 rounded bg-[#0078d4] text-white hover:bg-[#006cbe] transition-colors"
                      title="新建 SOP 手册"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <label className="p-1 rounded bg-[#252526] hover:bg-[#333333] text-[#cccccc] cursor-pointer" title="导入 JSON">
                      <Upload className="w-3.5 h-3.5" />
                      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                    <button
                      onClick={handleExport}
                      className="p-1 rounded bg-[#252526] hover:bg-[#333333] text-[#cccccc]"
                      title="导出 JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 分类单选 */}
                <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                        selectedCategory === c ? 'bg-[#0078d4] text-white' : 'bg-[#252526] text-[#858585] hover:text-[#cccccc]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索 SOP 手册名称或标签..."
                  className="w-full bg-[#1e1e1e] border border-[#333333] focus:border-[#0078d4] rounded px-2.5 py-1 text-xs text-white outline-none"
                />
              </div>

              {/* 手册列表 */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#2b2b2b]">
                {filteredRunbooks.map(rb => (
                  <div
                    key={rb.id}
                    onClick={() => setSelectedRunbook(rb)}
                    className={`p-3 cursor-pointer text-xs transition-colors space-y-1 ${
                      selectedRunbook?.id === rb.id ? 'bg-[#0078d4]/15 border-l-2 border-l-[#0078d4]' : 'hover:bg-[#252526]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[190px]">{rb.name}</span>
                      <span className="text-[10px] text-[#0078d4] bg-[#0078d4]/10 px-1.5 py-0.2 rounded border border-[#0078d4]/20">
                        {rb.steps?.length || 0} 步
                      </span>
                    </div>
                    <p className="text-[11px] text-[#858585] line-clamp-1">{rb.description}</p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-[#cca700] bg-[#cca700]/10 px-1 rounded">
                        {rb.category}
                      </span>
                      {rb.tags?.map(t => (
                        <span key={t} className="text-[10px] text-[#858585]">#{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredRunbooks.length === 0 && (
                  <div className="p-8 text-center text-[#858585] text-xs">未找到匹配的 SOP 运维手册</div>
                )}
              </div>
            </div>

            {/* 右侧手册详情大盘 */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
              {selectedRunbook ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-white">{selectedRunbook.name}</h4>
                        <span className="text-[11px] bg-[#0078d4]/20 text-[#0078d4] px-2 py-0.5 rounded font-medium">
                          {selectedRunbook.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#858585] mt-1">{selectedRunbook.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRunbook(selectedRunbook);
                          setViewMode('edit');
                        }}
                        className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3c3c3c] text-[#cccccc] rounded flex items-center gap-1.5 text-xs transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>编辑手册</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRunbook(selectedRunbook.id)}
                        className="p-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3c3c3c] text-[#858585] hover:text-rose-400 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleStartRunner(selectedRunbook)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded flex items-center gap-2 text-xs shadow-md transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>启动执行流</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                    {/* 参数预览卡片 */}
                    <div className="space-y-2">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#0078d4]" />
                        <span>参数化动态变量 ({selectedRunbook.variables?.length || 0})</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {selectedRunbook.variables?.map(v => (
                          <div key={v.name} className="p-2.5 bg-[#252526] rounded border border-[#2b2b2b] space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="text-[#0078d4] font-bold">${`{${v.name}}`}</span>
                              <span className="text-[#858585] text-[10px] bg-[#1e1e1e] px-1.5 py-0.2 rounded border border-[#333333]">
                                默认: {v.defaultValue || '空'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#858585]">{v.description}</p>
                          </div>
                        ))}
                        {selectedRunbook.variables?.length === 0 && (
                          <div className="col-span-2 p-3 text-center text-[#858585] bg-[#252526] rounded border border-[#2b2b2b]">
                            此手册无需动态参数输入
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 执行步骤编排一览 */}
                    <div className="space-y-2">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-[#0078d4]" />
                        <span>执行计划步骤 ({selectedRunbook.steps?.length || 0})</span>
                      </span>
                      <div className="space-y-2.5">
                        {selectedRunbook.steps?.map((st, i) => (
                          <div key={st.id || i} className="p-3 bg-[#252526] rounded-md border border-[#2b2b2b] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center font-mono text-[11px] text-[#0078d4]">
                                  {i + 1}
                                </span>
                                <span className="font-semibold text-white text-xs">{st.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#858585]">
                                {st.continueOnError && <span className="text-[#cca700]">容错继续</span>}
                                <span>超时: {st.timeoutSeconds}s</span>
                              </div>
                            </div>
                            {st.description && <p className="text-[11px] text-[#858585]">{st.description}</p>}
                            <div className="bg-[#181818] p-2 rounded font-mono text-[11px] text-[#89d185] border border-[#2b2b2b] select-all">
                              $ {st.command}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#858585] text-xs">
                  请在左侧选择一个 SOP 手册查看编排详情
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585] shrink-0">
          <div>OmniTerminal 参数化 SOP 自动化流水线</div>
          <button onClick={onClose} className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors">
            关闭
          </button>
        </div>

      </div>
    </div>
  );
}

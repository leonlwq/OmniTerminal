import React, { useState, useEffect } from 'react';
import { Play, Code, X, FileText, Terminal, CheckCircle2, AlertCircle, Loader2, Save, Trash2, Plus, Sparkles } from 'lucide-react';
import { runTerminalScript } from '../ScriptEngine';
import { app } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';

interface ScriptRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTabId: string | null;
  activeTabName: string;
  openTabs?: app.SessionConfig[];
}

interface CustomScript {
  id: string;
  name: string;
  code: string;
}

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_1',
    name: '基础运维巡检 (System Status Check)',
    code: `// 自动发送并等待命令响应
await xsh.Screen.Send("uname -a\\n");
await xsh.Session.Sleep(500);

await xsh.Screen.Send("df -h\\n");
await xsh.Session.Sleep(500);

await xsh.Screen.Send("free -m\\n");
await xsh.Session.Sleep(500);

xsh.Session.Log("系统基础状态巡检完成！");
xsh.Dialog.MsgBox("巡检完成！", "OmniTerminal 自动化");`
  },
  {
    id: 'tpl_2',
    name: '交互式等待应答 (Wait & Response)',
    code: `// 等待提示符后输入密码或命令
await xsh.Screen.Send("sudo su\\n");
// 等待出现 Password: 提示
try {
  await xsh.Screen.WaitForString("password", 3000);
  xsh.Session.Log("检测到密码输入提示");
} catch (e) {
  xsh.Session.Log("未提示输入密码或已是 root 用户");
}`
  },
  {
    id: 'tpl_3',
    name: '循环监控采样 (Loop Monitor)',
    code: `// 每隔 2 秒打印一次时间与负载，执行 3 次
for (let i = 1; i <= 3; i++) {
  await xsh.Screen.Send("date && uptime\\n");
  xsh.Session.Log(\`执行第 \${i}/3 次采样\`);
  await xsh.Session.Sleep(2000);
}
xsh.Session.Log("采样完成！");`
  },
  {
    id: 'tpl_4',
    name: 'Docker 容器与网络诊断 (Docker Diagnostics)',
    code: `// Docker 状态巡检
await xsh.Screen.Send("docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'\\n");
await xsh.Session.Sleep(600);

await xsh.Screen.Send("netstat -tuln | grep LISTEN\\n");
xsh.Session.Log("Docker 与网络端口诊断完成");`
  }
];

export function ScriptRunnerModal({
  isOpen,
  onClose,
  activeTabId,
  activeTabName,
  openTabs = [],
}: ScriptRunnerModalProps) {
  const { t } = useI18n();
  const [selectedTargetId, setSelectedTargetId] = useState<string>(activeTabId || '');
  const [scriptCode, setScriptCode] = useState(DEFAULT_TEMPLATES[0].code);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [userScripts, setUserScripts] = useState<CustomScript[]>(() => {
    try {
      const saved = localStorage.getItem('omniterminal_custom_scripts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [newScriptName, setNewScriptName] = useState('');
  const [isSavingModalOpen, setIsSavingModalOpen] = useState(false);

  useEffect(() => {
    if (activeTabId) {
      setSelectedTargetId(activeTabId);
    }
  }, [activeTabId]);

  if (!isOpen) return null;

  const handleSaveCustomScript = () => {
    if (!newScriptName.trim()) {
      alert(t('scriptRunner.inputNameAlert') || '请输入脚本名称');
      return;
    }
    const newScript: CustomScript = {
      id: `script_${Date.now()}`,
      name: newScriptName.trim(),
      code: scriptCode,
    };
    const updated = [...userScripts, newScript];
    setUserScripts(updated);
    localStorage.setItem('omniterminal_custom_scripts', JSON.stringify(updated));
    setNewScriptName('');
    setIsSavingModalOpen(false);
  };

  const handleDeleteCustomScript = (id: string) => {
    if (confirm(t('scriptRunner.deleteConfirm') || '确认删除此自定义脚本？')) {
      const updated = userScripts.filter((s) => s.id !== id);
      setUserScripts(updated);
      localStorage.setItem('omniterminal_custom_scripts', JSON.stringify(updated));
    }
  };

  const handleRunScript = async () => {
    const targetId = selectedTargetId || activeTabId;
    if (!targetId) {
      alert(t('scriptRunner.selectTargetAlert') || '请先选择一个目标终端会话');
      return;
    }
    setRunning(true);
    setLogs([]);
    setStatusMsg(null);

    const logHandler = (msg: string) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      logHandler(t('scriptRunner.logStarted') || '🚀 脚本开始执行...');
      const result = await runTerminalScript(scriptCode, targetId, logHandler);
      logHandler(`✅ ${result}`);
      setStatusMsg(t('scriptRunner.statusSuccess') || '脚本执行成功');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
      logHandler(`${t('scriptRunner.logFailed') || '❌ 执行失败: '}${msg}`);
      setStatusMsg(t('scriptRunner.statusFailed') || '脚本执行异常中断');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-4xl flex flex-col text-[#cccccc] text-xs overflow-hidden h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('scriptRunner.title')}</h2>
              <span className="text-[11px] text-[#858585] font-normal">
                JavaScript / xsh Automation Script Console
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSavingModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors flex items-center space-x-1.5"
              title={t('scriptRunner.saveScript')}
            >
              <Save className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>{t('scriptRunner.saveScript')}</span>
            </button>
            <button 
              onClick={onClose} 
              className="text-[#858585] hover:text-[#cccccc] rounded p-1 hover:bg-[#333333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Target and template toolbar */}
        <div className="p-3 bg-[#252526] border-b border-[#2b2b2b] flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs flex items-center gap-2">
            <span className="text-[#858585] font-medium">{t('scriptRunner.targetTerminal')}</span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] rounded text-xs text-[#0078d4] font-medium outline-none"
            >
              {openTabs.length === 0 ? (
                <option value="">{t('scriptRunner.noActiveTerm')}</option>
              ) : (
                openTabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.host || 'local'}:{t.port || 22})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-[#858585]">{t('scriptRunner.presetSchemes')}</span>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const def = DEFAULT_TEMPLATES.find((t) => t.id === val);
                if (def) {
                  setScriptCode(def.code);
                  return;
                }
                const usr = userScripts.find((u) => u.id === val);
                if (usr) {
                  setScriptCode(usr.code);
                }
              }}
              className="px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <optgroup label={t('scriptRunner.officialPresets')}>
                {DEFAULT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
              {userScripts.length > 0 && (
                <optgroup label={t('scriptRunner.myScripts')}>
                  {userScripts.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Editor and log pane */}
        <div className="grid grid-cols-2 divide-x divide-[#2b2b2b] flex-1 min-h-0 bg-[#1e1e1e]">
          {/* Left: Code editor */}
          <div className="flex flex-col h-full bg-[#1e1e1e]">
            <div className="px-3 py-1.5 bg-[#252526] border-b border-[#2b2b2b] text-[11px] text-[#858585] font-mono font-medium flex items-center justify-between">
              <span>Script Editor (JavaScript / xsh)</span>
            </div>
            <textarea
              value={scriptCode}
              onChange={(e) => setScriptCode(e.target.value)}
              className="flex-1 w-full p-3 bg-transparent text-xs text-[#cccccc] font-mono resize-none focus:outline-none leading-relaxed custom-scrollbar"
              spellCheck={false}
            />
          </div>

          {/* Right: Output logs */}
          <div className="flex flex-col h-full bg-[#181818]">
            <div className="px-3 py-1.5 bg-[#252526] border-b border-[#2b2b2b] text-[11px] text-[#858585] font-mono font-medium flex justify-between items-center">
              <span>Execution Output & Live Logs</span>
              {logs.length > 0 && (
                <button onClick={() => setLogs([])} className="text-[#858585] hover:text-[#cccccc] text-[10px] px-1.5 py-0.5 rounded hover:bg-[#333333]">{t('common.clear')}</button>
              )}
            </div>
            <div className="flex-1 p-3 font-mono text-[11px] text-[#cccccc] overflow-y-auto space-y-1.5 select-text custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-[#858585] italic">{t('scriptRunner.readyToRun')}</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="break-all leading-normal">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] shrink-0">
          <div className="text-[11px] text-[#858585]">
            API: <code className="text-[#0078d4] font-mono">xsh.Screen.Send()</code>, <code className="text-[#0078d4] font-mono">xsh.Screen.WaitForString()</code>, <code className="text-[#0078d4] font-mono">xsh.Session.Sleep()</code>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunScript}
              disabled={running || (!selectedTargetId && !activeTabId)}
              className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-40 text-white font-medium text-xs rounded flex items-center space-x-1.5 transition-colors"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{running ? t('scriptRunner.running') : t('scriptRunner.run')}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] font-medium text-xs rounded transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>

        {/* Save Custom Script Modal Dialog */}
        {isSavingModalOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[#252526] border border-[#2b2b2b] shadow-2xl rounded-lg p-4 w-80 space-y-3 text-[#cccccc]">
              <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2">
                <Save className="w-3.5 h-3.5 text-[#0078d4]" />
                {t('scriptRunner.saveAsCustom')}
              </h4>
              <input
                type="text"
                placeholder="Redis Check..."
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSavingModalOpen(false)}
                  className="px-2.5 py-1 text-xs text-[#858585] hover:text-[#cccccc]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomScript}
                  className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium rounded"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

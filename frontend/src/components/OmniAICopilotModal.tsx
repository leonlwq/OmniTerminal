import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Terminal, AlertTriangle, ShieldCheck, ShieldAlert,
  Copy, Play, ArrowDownToLine, BookmarkPlus, Check, RefreshCw,
  Settings, X, Wand2, Bug, FileCode, Zap, ChevronRight, CornerDownLeft
} from 'lucide-react';
import { AIConfig, AIChatResponse } from '../types';

interface OmniAICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string | null;
  activeSessionName: string;
  terminalContextDir?: string;
  initialMode?: 'command' | 'diagnose' | 'script' | 'explain';
  initialErrorText?: string;
  initialLastCommand?: string;
  getTerminalBufferLines?: () => string[];
  onInsertToTerminal: (cmd: string) => void;
  onRunInTerminal: (cmd: string) => void;
  onSaveQuickCommand?: (label: string, cmd: string) => void;
  onOpenSettings?: () => void;
  onOpenAIConfigModal?: () => void;
  aiConfig: AIConfig;
  onSaveAIConfig?: (cfg: AIConfig) => void;
  onSwitchToChatDrawer?: () => void;
}

interface MarkdownViewerProps {
  content: string;
}

function MarkdownViewer({ content }: MarkdownViewerProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-200 select-text">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : '';
          const code = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);

          return (
            <div key={index} className="rounded-xl overflow-hidden border border-[#272e3d] bg-[#0b0d12] my-2 shadow-inner">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#141822] border-b border-[#272e3d] text-[10px] text-slate-400 font-mono">
                <span className="font-semibold text-blue-400">{lang || 'code'}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopiedIdx(index);
                    setTimeout(() => setCopiedIdx(null), 1500);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors px-1.5 py-0.5 rounded bg-white/5"
                >
                  {copiedIdx === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedIdx === index ? '已复制' : '复制代码'}</span>
                </button>
              </div>
              <pre className="p-3 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {code}
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-1" />;
              if (line.startsWith('### ')) {
                return <h4 key={lIdx} className="font-bold text-xs text-white pt-1">{line.slice(4)}</h4>;
              }
              if (line.startsWith('## ')) {
                return <h3 key={lIdx} className="font-bold text-xs text-blue-400 pt-1.5">{line.slice(3)}</h3>;
              }
              if (line.startsWith('# ')) {
                return <h2 key={lIdx} className="font-bold text-sm text-blue-300 pt-2">{line.slice(2)}</h2>;
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 pl-2">
                    <span className="text-blue-400 mt-0.5 font-bold">•</span>
                    <span>{line.slice(2)}</span>
                  </div>
                );
              }
              return <p key={lIdx} className="text-slate-300">{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function OmniAICopilotModal({
  isOpen,
  onClose,
  activeSessionId,
  activeSessionName,
  terminalContextDir,
  initialMode = 'command',
  initialErrorText = '',
  initialLastCommand = '',
  getTerminalBufferLines,
  onInsertToTerminal,
  onRunInTerminal,
  onSaveQuickCommand,
  onOpenSettings,
  onOpenAIConfigModal,
  aiConfig,
  onSaveAIConfig,
  onSwitchToChatDrawer,
}: OmniAICopilotModalProps) {
  const [mode, setMode] = useState<'command' | 'diagnose' | 'script' | 'explain'>(initialMode);
  const [prompt, setPrompt] = useState('');
  const [errorText, setErrorText] = useState(initialErrorText);
  const [lastCommand, setLastCommand] = useState(initialLastCommand);
  const [scriptType, setScriptType] = useState<'bash' | 'python' | 'sh'>('bash');

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [quickLabel, setQuickLabel] = useState('');
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  const [response, setResponse] = useState<AIChatResponse | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [tempConfig, setTempConfig] = useState<AIConfig>(aiConfig);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialErrorText) setErrorText(initialErrorText);
      if (initialLastCommand) setLastCommand(initialLastCommand);
      setResponse(null);
      setGeneratedScript('');
      setErrorMessage(null);
      setSavedSuccess(false);
      setIsSavingQuick(false);
      setTempConfig(aiConfig);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialMode, initialErrorText, initialLastCommand, aiConfig]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMessage(null);
    setResponse(null);
    setGeneratedScript('');
    setSavedSuccess(false);

    try {
      const appRpc = (window as any).go?.app?.App;
      if (!appRpc) throw new Error("Go backend runtime not found");

      const effectiveCfg = tempConfig;

      if (mode === 'command') {
        if (!prompt.trim()) throw new Error("请输入需求描述");
        const res = await appRpc.AIGenerateCommand(effectiveCfg, prompt.trim(), terminalContextDir || '', 'Linux / Unix');
        setResponse(res);
        setQuickLabel(prompt.trim().slice(0, 20));
      } else if (mode === 'diagnose') {
        if (!errorText.trim()) throw new Error("请输入或粘贴错误信息");
        const res = await appRpc.AIDiagnoseError(effectiveCfg, errorText.trim(), lastCommand.trim(), 'Linux / Unix');
        setResponse(res);
      } else if (mode === 'explain') {
        if (!errorText.trim()) throw new Error("请输入或载入待分析的终端输出/日志");
        const res = await (appRpc.AIExplainOutput 
          ? appRpc.AIExplainOutput(effectiveCfg, errorText.trim(), 'Linux / Unix')
          : appRpc.AIDiagnoseError(effectiveCfg, errorText.trim(), '终端输出/日志分析与解释', 'Linux / Unix'));
        setResponse(res);
      } else if (mode === 'script') {
        if (!prompt.trim()) throw new Error("请输入自动化脚本需求");
        const scriptRes = await appRpc.AIGenerateScript(effectiveCfg, prompt.trim(), scriptType);
        setGeneratedScript(scriptRes);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = () => {
    if (onSaveAIConfig) {
      onSaveAIConfig(tempConfig);
    }
    setShowConfigDrawer(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg w-full max-w-3xl shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc] max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#e0e0e0]">OmniAI 智能运维 Copilot</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2d2d2d] border border-[#3c3c3c] text-[#0078d4] font-mono">
                  {tempConfig.provider || 'openai'}: {tempConfig.model || 'gpt-4o-mini'}
                </span>
              </div>
              <p className="text-[11px] text-[#858585]">
                目标终端: <span className="text-[#0078d4] font-mono">{activeSessionName || '无活动终端'}</span>
                {terminalContextDir && <span className="ml-2 text-[#858585] font-mono">({terminalContextDir})</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onSwitchToChatDrawer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToChatDrawer();
                }}
                className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] text-[11px] font-medium flex items-center gap-1 transition-all"
                title="切换到右侧沉浸式 AI 对话面板 (Cmd+L)"
              >
                <span>侧边栏对话</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                if (onOpenAIConfigModal) {
                  onOpenAIConfigModal();
                } else {
                  setShowConfigDrawer(!showConfigDrawer);
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                showConfigDrawer
                  ? 'bg-[#04395e] text-white'
                  : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#333333]'
              }`}
              title="配置 AI 大模型参数"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#333333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-[#2b2b2b] bg-[#181818] px-4 pt-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => { setMode('command'); setResponse(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t flex items-center gap-1.5 transition-all ${
              mode === 'command'
                ? 'bg-[#252526] text-[#0078d4] border-t-2 border-t-[#0078d4] border-x border-[#2b2b2b]'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>自然语言转命令</span>
          </button>
          <button
            onClick={() => { setMode('diagnose'); setResponse(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t flex items-center gap-1.5 transition-all ${
              mode === 'diagnose'
                ? 'bg-[#252526] text-[#0078d4] border-t-2 border-t-[#0078d4] border-x border-[#2b2b2b]'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>终端报错智能诊断</span>
          </button>
          <button
            onClick={() => { setMode('explain'); setResponse(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t flex items-center gap-1.5 transition-all ${
              mode === 'explain'
                ? 'bg-[#252526] text-[#0078d4] border-t-2 border-t-[#0078d4] border-x border-[#2b2b2b]'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>输出/日志 AI 摘要解释</span>
          </button>
          <button
            onClick={() => { setMode('script'); setResponse(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t flex items-center gap-1.5 transition-all ${
              mode === 'script'
                ? 'bg-[#252526] text-[#0078d4] border-t-2 border-t-[#0078d4] border-x border-[#2b2b2b]'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>运维自动化脚本工坊</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#1e1e1e]">
          
          {/* Quick AI Configuration Drawer */}
          {showConfigDrawer && (
            <div className="p-3.5 rounded bg-[#252526] border border-[#2b2b2b] space-y-3 animate-in slide-in-from-top duration-150 text-xs">
              <div className="font-semibold text-[#e0e0e0] flex items-center justify-between border-b border-[#2b2b2b] pb-2">
                <span className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-[#0078d4]" />
                  大模型接入设置 (LLM Provider Config)
                </span>
                <span className="text-[10px] text-[#858585]">支持 OpenAI / DeepSeek / Ollama / Gemini / 自定义</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#858585] block mb-1">Provider:</label>
                  <select
                    value={tempConfig.provider || 'openai'}
                    onChange={e => {
                      const p = e.target.value;
                      let defaultModel = tempConfig.model;
                      let defaultBase = tempConfig.baseUrl;
                      if (p === 'deepseek') { defaultModel = 'deepseek-chat'; defaultBase = 'https://api.deepseek.com/v1'; }
                      else if (p === 'ollama') { defaultModel = 'llama3'; defaultBase = 'http://localhost:11434/v1'; }
                      else if (p === 'gemini') { defaultModel = 'gemini-1.5-flash'; defaultBase = 'https://generativelanguage.googleapis.com/v1beta/openai'; }
                      else if (p === 'openai') { defaultModel = 'gpt-4o-mini'; defaultBase = 'https://api.openai.com/v1'; }
                      setTempConfig({ ...tempConfig, provider: p, model: defaultModel, baseUrl: defaultBase });
                    }}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2.5 py-1 text-[#cccccc]"
                  >
                    <option value="deepseek">DeepSeek (超高性价比推荐)</option>
                    <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="ollama">Ollama (本地私有化大模型)</option>
                    <option value="custom">Custom (自定义兼容端点)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#858585] block mb-1">Model Name:</label>
                  <input
                    type="text"
                    value={tempConfig.model || ''}
                    onChange={e => setTempConfig({ ...tempConfig, model: e.target.value })}
                    placeholder="deepseek-chat / gpt-4o-mini / llama3"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2.5 py-1 text-[#cccccc] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#858585] block mb-1">API Key:</label>
                  <input
                    type="password"
                    value={tempConfig.apiKey || ''}
                    onChange={e => setTempConfig({ ...tempConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2.5 py-1 text-[#cccccc] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#858585] block mb-1">Base URL:</label>
                  <input
                    type="text"
                    value={tempConfig.baseUrl || ''}
                    onChange={e => setTempConfig({ ...tempConfig, baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com/v1"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2.5 py-1 text-[#cccccc] font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#2b2b2b]">
                <button
                  onClick={() => setShowConfigDrawer(false)}
                  className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-3.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded"
                >
                  保存设置
                </button>
              </div>
            </div>
          )}

          {/* Mode 1: Natural Language to Command */}
          {mode === 'command' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#cccccc] block mb-1 font-medium flex items-center justify-between">
                  <span>用自然语言描述您的运维操作需求:</span>
                  <span className="text-[11px] text-[#858585]">支持快捷键 Cmd+Enter 发送</span>
                </label>
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="例如: 查找 /var/log 下大于 50MB 且修改时间超过 7 天的文件并压缩打包为 old_logs.tar.gz"
                  rows={3}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded p-2.5 text-xs text-[#cccccc] placeholder-[#858585] outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[#858585] text-[10px]">快捷示例:</span>
                {[
                  '检查当前占用端口前5的进程',
                  '按内存占用排序查出最大的前10个进程',
                  '排查最近被误删的开放文件 (lsof +L1)',
                  '生成自签名 SSL 证书 (10年有效期)',
                  '查看 Nginx 访问日志中访问频次最高的 IP',
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setPrompt(item); setTimeout(() => handleGenerate(), 50); }}
                    className="px-2 py-0.5 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] text-[#cccccc] transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 2: Error Diagnosis */}
          {mode === 'diagnose' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#cccccc] block mb-1 font-medium">
                  报错信息与终端输出:
                </label>
                <textarea
                  ref={inputRef}
                  value={errorText}
                  onChange={e => setErrorText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="粘贴报错信息 (如: Permission denied, No space left on device, Port already in use 等)"
                  rows={4}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded p-2.5 text-xs text-[#f48771] font-mono placeholder-[#858585] outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="text-xs text-[#858585] block mb-1">
                  导致报错的命令 (可选):
                </label>
                <input
                  type="text"
                  value={lastCommand}
                  onChange={e => setLastCommand(e.target.value)}
                  placeholder="例如: docker run -p 80:80 nginx"
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-xs text-[#cccccc] font-mono outline-none"
                />
              </div>
            </div>
          )}

          {/* Mode 3: DevOps Script Studio */}
          {mode === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#cccccc] font-medium">
                  自动化巡检 / 部署脚本需求:
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#858585]">脚本语言:</span>
                  <select
                    value={scriptType}
                    onChange={e => setScriptType(e.target.value as any)}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-0.5 text-[#cccccc]"
                  >
                    <option value="bash">Bash (Linux 工业级脚本)</option>
                    <option value="python">Python 3 (自动化运维)</option>
                    <option value="sh">POSIX Shell</option>
                  </select>
                </div>
              </div>
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如: 编写一个定期检测磁盘剩余空间，超过 85% 时自动归档压缩历史日志并发送告警的健壮脚本"
                rows={3}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded p-2.5 text-xs text-[#cccccc] placeholder-[#858585] outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Mode 4: Terminal Output / Log AI Explain & Summarize */}
          {mode === 'explain' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#cccccc] font-medium flex items-center gap-2">
                  <span>待分析的终端输出或日志内容:</span>
                </label>
                {getTerminalBufferLines && (
                  <button
                    type="button"
                    onClick={() => {
                      const lines = getTerminalBufferLines();
                      if (lines && lines.length > 0) {
                        const snippet = lines.slice(-100).join('\n');
                        setErrorText(snippet);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-[11px] font-medium transition-colors"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    <span>载入当前终端最后 100 行</span>
                  </button>
                )}
              </div>
              <textarea
                ref={inputRef}
                value={errorText}
                onChange={e => setErrorText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="粘贴待解释分析的终端输出、命令运行结果、系统日志或配置文件内容..."
                rows={5}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded p-2.5 text-xs text-[#cca700] font-mono placeholder-[#858585] outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="flex justify-end items-center gap-2 pt-1">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${
                loading
                  ? 'bg-[#0078d4]/50 text-white cursor-not-allowed'
                  : 'bg-[#0078d4] hover:bg-[#006cbe] text-white active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 思考分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {mode === 'diagnose'
                      ? '开始智能诊断'
                      : mode === 'explain'
                      ? '开始 AI 摘要与解释'
                      : mode === 'script'
                      ? '生成自动化脚本'
                      : '生成 Shell 命令'}{' '}
                    (Cmd+Enter)
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 bg-[#a1260d]/15 border border-[#a1260d]/40 rounded text-xs text-[#f48771] flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-[#f48771] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">生成失败:</span> {errorMessage}
                <div className="mt-1 text-[11px] text-[#f48771]/80">
                  提示: 请点击右上角设置齿轮 ⚙️ 检查您的 API Key、Base URL 与大模型配置。
                </div>
              </div>
            </div>
          )}

          {/* Generated Command Result Card */}
          {response && (() => {
            const targetCmd = response.command || response.Command || '';
            const explanationStr = response.explanation || response.Explanation || '';
            const riskStr = response.riskLevel || response.RiskLevel || 'safe';

            return (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pt-2 border-t border-[#2b2b2b]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#89d185]" />
                      推荐执行命令:
                    </span>
                    {riskStr === 'danger' && (
                      <span className="px-2 py-0.5 bg-[#a1260d]/20 border border-[#a1260d]/40 text-[#f48771] rounded text-[10px] font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-[#f48771]" />
                        高危操作提醒
                      </span>
                    )}
                    {riskStr === 'caution' && (
                      <span className="px-2 py-0.5 bg-[#cca700]/20 border border-[#cca700]/40 text-[#cca700] rounded text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-[#cca700]" />
                        需谨慎执行
                      </span>
                    )}
                    {riskStr === 'safe' && (
                      <span className="px-2 py-0.5 bg-[#388a34]/20 border border-[#388a34]/40 text-[#89d185] rounded text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#89d185]" />
                        安全指令
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(targetCmd)}
                      className="px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-[11px] flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-[#89d185]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? '已复制' : '复制'}</span>
                    </button>
                    <button
                      onClick={() => {
                        onInsertToTerminal(targetCmd);
                        onClose();
                      }}
                      className="px-3 py-1 bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] text-[#cccccc] rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="填入终端输入行，暂不自动回车执行"
                    >
                      <ArrowDownToLine className="w-3 h-3 text-[#0078d4]" />
                      <span>填入终端</span>
                    </button>
                    <button
                      onClick={() => {
                        onRunInTerminal(targetCmd);
                        onClose();
                      }}
                      className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                      title="直接发送到活动终端执行"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>立即运行</span>
                    </button>
                  </div>
                </div>

                {/* Command syntax box */}
                <div className="p-3 bg-[#181818] border border-[#2b2b2b] rounded font-mono text-xs text-[#89d185] select-all break-all shadow-inner leading-relaxed">
                  {targetCmd}
                </div>

                {/* Explanation & Steps */}
                {explanationStr && (
                  <div className="p-3 bg-[#252526] border border-[#2b2b2b] rounded text-xs text-[#cccccc] space-y-1.5">
                    <div className="font-semibold text-[11px] flex items-center gap-1 text-[#0078d4]">
                      <Zap className="w-3 h-3 text-[#0078d4]" />
                      意图与参数解析:
                    </div>
                    <MarkdownViewer content={explanationStr} />
                  </div>
                )}

                {/* Save to quick command strip */}
                {onSaveQuickCommand && (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    {isSavingQuick ? (
                      <div className="flex items-center gap-2 flex-1 animate-in fade-in">
                        <input
                          type="text"
                          value={quickLabel}
                          onChange={e => setQuickLabel(e.target.value)}
                          placeholder="快捷命令名称..."
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1 text-[#cccccc] text-xs flex-1 outline-none"
                        />
                        <button
                          onClick={() => {
                            if (quickLabel.trim() && targetCmd) {
                              onSaveQuickCommand(quickLabel.trim(), targetCmd);
                              setSavedSuccess(true);
                              setIsSavingQuick(false);
                            }
                          }}
                          className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-semibold"
                        >
                          确认存盘
                        </button>
                        <button
                          onClick={() => setIsSavingQuick(false)}
                          className="px-2 py-1 bg-[#3c3c3c] text-[#cccccc] rounded text-xs"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsSavingQuick(true)}
                        className="text-[11px] text-[#0078d4] hover:underline flex items-center gap-1 transition-colors"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>{savedSuccess ? '✓ 已保存到快捷命令' : '+ 保存为常用快捷命令'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Generated Script Result */}
          {generatedScript && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pt-2 border-t border-[#2b2b2b]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#0078d4]" />
                  生成的自动化脚本 ({scriptType}):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(generatedScript)}
                    className="px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-[11px] flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#89d185]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? '已复制' : '复制代码'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onInsertToTerminal(generatedScript);
                      onClose();
                    }}
                    className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-all"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>送入终端</span>
                  </button>
                </div>
              </div>

              <pre className="p-3 bg-[#181818] border border-[#2b2b2b] rounded font-mono text-xs text-[#89d185] overflow-x-auto max-h-80 leading-relaxed shadow-inner">
                {generatedScript}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585] shrink-0">
          <div className="flex items-center gap-2">
            <span>按 <kbd className="px-1.5 py-0.5 bg-[#252526] border border-[#3c3c3c] rounded text-[10px] text-[#cccccc] font-mono">Esc</kbd> 退出</span>
            <span>·</span>
            <span>按 <kbd className="px-1.5 py-0.5 bg-[#252526] border border-[#3c3c3c] rounded text-[10px] text-[#cccccc] font-mono">Cmd+K</kbd> 随时唤起</span>
          </div>
          <div className="text-[#858585]">
            Powered by <span className="text-[#0078d4] font-semibold">OmniAI Engine</span>
          </div>
        </div>

      </div>
    </div>
  );
}

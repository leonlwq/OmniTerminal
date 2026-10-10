import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, CornerDownLeft, Play, Copy, Check, X,
  ShieldCheck, ShieldAlert, AlertTriangle, Settings,
  Wand2, Terminal, ExternalLink, RefreshCw
} from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { AIGenerateCommand, AIDiagnoseError } from '../../../wailsjs/go/app/App';

export interface InlineAICopilotPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToTerminal: (cmd: string) => void;
  onRunInTerminal: (cmd: string) => void;
  activeSessionId: string;
  activeSessionName: string;
  terminalContextDir?: string;
  osType?: string;
  shellType?: string;
  initialMode?: 'command' | 'diagnose';
  initialErrorText?: string;
  initialLastCommand?: string;
  aiConfig?: models.AIConfig;
  onOpenSettings?: () => void;
  onOpenFullCopilotModal?: () => void;
}

export const InlineAICopilotPopover: React.FC<InlineAICopilotPopoverProps> = ({
  isOpen,
  onClose,
  onInsertToTerminal,
  onRunInTerminal,
  activeSessionId: _activeSessionId,
  activeSessionName,
  terminalContextDir,
  osType = 'Linux / Unix',
  shellType: _shellType,
  initialMode = 'command',
  initialErrorText = '',
  initialLastCommand = '',
  aiConfig,
  onOpenSettings,
  onOpenFullCopilotModal,
}) => {
  const [mode, setMode] = useState<'command' | 'diagnose'>(initialMode);
  const [prompt, setPrompt] = useState('');
  const [errorText, setErrorText] = useState(initialErrorText);
  const [lastCommand, setLastCommand] = useState(initialLastCommand);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<models.AIChatResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 同步初始化模式与初始值
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setResult(null);
      if (initialMode === 'diagnose') {
        setErrorText(initialErrorText);
        setLastCommand(initialLastCommand);
        // 若有明确错误输出，自动触发诊断分析
        if (initialErrorText.trim()) {
          handleExecute('diagnose', initialErrorText, initialLastCommand);
        }
      } else {
        setPrompt('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 60);
      }
    }
  }, [isOpen, initialMode, initialErrorText, initialLastCommand]);

  // 全局快捷键监听 (Esc 关闭, Tab 填充, Enter 运行)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 当已经生成结果时，Tab 键一键填充
      if (e.key === 'Tab' && result?.command && !loading) {
        e.preventDefault();
        e.stopPropagation();
        handleAdoptCommand(result.command, false);
        return;
      }

      // Ctrl+Enter 或 ⌘+Enter 直接执行
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && result?.command && !loading) {
        e.preventDefault();
        e.stopPropagation();
        handleAdoptCommand(result.command, true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, result, loading]);

  if (!isOpen) return null;

  const hasApiKey = Boolean(aiConfig?.apiKey || aiConfig?.provider === 'ollama');

  const handleExecute = async (
    targetMode: 'command' | 'diagnose' = mode,
    diagError = errorText,
    diagCmd = lastCommand
  ) => {
    const currentCfg = aiConfig || new models.AIConfig({
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 0.2,
      maxTokens: 2048,
    });

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      if (targetMode === 'command') {
        if (!prompt.trim()) {
          setLoading(false);
          return;
        }
        const ctxText = terminalContextDir ? `Current directory: ${terminalContextDir}` : '';
        const res = await AIGenerateCommand(currentCfg, prompt.trim(), ctxText, osType);
        setResult(res);
      } else {
        if (!diagError.trim()) {
          setErrorMessage('暂无可分析的终端报错信息');
          setLoading(false);
          return;
        }
        const res = await AIDiagnoseError(currentCfg, diagError.trim(), diagCmd.trim(), osType);
        setResult(res);
      }
    } catch (err: any) {
      console.error('AI Copilot request error:', err);
      const msg = err?.message || String(err) || 'AI 服务请求异常';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAdoptCommand = (cmd: string, runImmediately: boolean) => {
    if (!cmd) return;
    if (runImmediately) {
      onRunInTerminal(cmd);
    } else {
      onInsertToTerminal(cmd);
    }
    onClose();
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const renderRiskBadge = (level: string) => {
    switch (level) {
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-700/50">
            <ShieldAlert className="w-3 h-3" />
            高危系统变更
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/50">
            <AlertTriangle className="w-3 h-3" />
            包含修改操作
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
            <ShieldCheck className="w-3 h-3" />
            安全只读/查询
          </span>
        );
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 w-[640px] max-w-[94%] bg-[#1f1f1f]/98 backdrop-blur-md border border-[#3c3c3c] shadow-[0_20px_50px_rgba(0,0,0,0.85)] rounded-lg text-[#cccccc] overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none font-sans"
    >
      {/* 顶栏 Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#252526] border-b border-[#2b2b2b]">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#0078d4] to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-white tracking-wide">
            OmniAI 行内终端副驾
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2d2d2d] border border-[#3c3c3c] text-[#858585] font-mono">
            {activeSessionName || '终端会话'} · {osType}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* 模式切换胶囊 */}
          <div className="flex items-center bg-[#181818] rounded border border-[#333333] p-0.5 text-[10px]">
            <button
              onClick={() => {
                setMode('command');
                setResult(null);
                setErrorMessage(null);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                mode === 'command'
                  ? 'bg-[#0078d4] text-white font-medium'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              命令生成
            </button>
            <button
              onClick={() => {
                setMode('diagnose');
                setResult(null);
                setErrorMessage(null);
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                mode === 'diagnose'
                  ? 'bg-purple-600 text-white font-medium'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              报错修复
            </button>
          </div>

          {onOpenFullCopilotModal && (
            <button
              onClick={() => {
                onClose();
                onOpenFullCopilotModal();
              }}
              className="p-1 hover:bg-[#333333] text-[#858585] hover:text-[#cccccc] rounded transition-colors"
              title="切换至全屏 AI 对话助手"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] text-[#858585] hover:text-white rounded transition-colors"
            title="关闭 (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 未配置 API Key 快速提示条 */}
      {!hasApiKey && (
        <div className="px-3.5 py-2 bg-amber-950/40 border-b border-amber-700/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>尚未配置 AI API Key，支持 DeepSeek、OpenAI 或本地 Ollama 离线模型。</span>
          </div>
          {onOpenSettings && (
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 rounded text-[10px] text-amber-100 flex items-center gap-1 transition-colors"
            >
              <Settings className="w-3 h-3" />
              前往配置
            </button>
          )}
        </div>
      )}

      {/* 主输入交互区 */}
      <div className="p-3.5 space-y-3">
        {mode === 'command' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecute('command');
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="用自然语言描述所需命令 (如: 统计 nginx 日志中访问量最高的前10个IP、查找并杀死3000端口)..."
                disabled={loading}
                className="w-full pl-8 pr-14 py-2 bg-[#181818] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded-md text-xs text-white placeholder:text-[#6e6e6e] outline-none transition-all shadow-inner"
              />
              <Wand2 className="w-3.5 h-3.5 text-[#0078d4] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6e6e6e] font-mono pointer-events-none">
                Enter ↵
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-3 py-2 bg-[#0078d4] hover:bg-[#006cbe] disabled:bg-[#333333] disabled:text-[#6e6e6e] text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>生成</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] text-[#858585] flex items-center justify-between">
                <span>捕获到的终端失败命令 / 报错片段:</span>
                <span className="text-[10px] text-purple-400 font-mono">{lastCommand || 'shell error'}</span>
              </label>
              <textarea
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder="粘贴报错输出或退出码信息..."
                rows={3}
                disabled={loading}
                className="w-full px-2.5 py-1.5 bg-[#181818] border border-[#3c3c3c] focus:border-purple-500 rounded text-xs font-mono text-red-300 placeholder:text-[#6e6e6e] outline-none transition-all resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleExecute('diagnose')}
                disabled={loading || !errorText.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-[#333333] disabled:text-[#6e6e6e] text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>智能分析并生成修复命令</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {errorMessage && (
          <div className="p-2.5 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="break-all">{errorMessage}</span>
          </div>
        )}

        {/* 生成结果卡片 */}
        {result && (
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-md p-3 space-y-2.5 shadow-md animate-in fade-in duration-150">
            {/* 指令代码块 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-[#0078d4]" />
                    建议 Shell 指令:
                  </span>
                  {renderRiskBadge(result.riskLevel)}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(result.command)}
                    className="p-1 hover:bg-[#2d2d2d] text-[#858585] hover:text-white rounded transition-colors flex items-center gap-1 text-[10px]"
                    title="复制到剪贴板"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? '已复制' : '复制'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-[#0e0e0e] border border-[#2b2b2b] rounded font-mono text-xs text-emerald-300 break-all select-text font-medium leading-relaxed shadow-inner">
                {result.command}
              </div>
            </div>

            {/* 解释说明 */}
            {result.explanation && (
              <div className="text-[11px] text-[#9d9d9d] leading-relaxed border-t border-[#252526] pt-2 whitespace-pre-wrap select-text">
                {result.explanation}
              </div>
            )}

            {/* 快速采纳操作按钮组 */}
            <div className="flex items-center justify-between pt-2 border-t border-[#252526]">
              <div className="flex items-center gap-2 text-[10px] text-[#6e6e6e] font-mono">
                <span>[Tab] 填充输入</span>
                <span>•</span>
                <span>[Ctrl+Enter] 直接运行</span>
                <span>•</span>
                <span>[Esc] 取消</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdoptCommand(result.command, false)}
                  className="px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3c3c3c] rounded text-xs text-[#cccccc] hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <CornerDownLeft className="w-3 h-3 text-sky-400" />
                  <span>填充到终端 [Tab]</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdoptCommand(result.command, true)}
                  className="px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>直接执行 [↵]</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

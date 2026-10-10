import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Send, Copy, Play, ArrowDownToLine, BookmarkPlus,
  Check, Trash2, Settings, X, Terminal, ChevronDown, ChevronRight,
  ShieldAlert, RefreshCw, Paperclip, Server, Folder, FileCode, Zap,
  Compass, AlertTriangle
} from 'lucide-react';
import { AIChat } from '../../wailsjs/go/app/App';
import { models } from '../../wailsjs/go/models';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachedContext?: {
    terminalSnippet?: string;
    sessionName?: string;
    cwd?: string;
  };
}

interface OmniAIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string | null;
  activeSessionName: string;
  terminalContextDir?: string;
  getTerminalBufferLines?: () => string[];
  onInsertToTerminal: (cmd: string) => void;
  onRunInTerminal: (cmd: string) => void;
  onSaveQuickCommand?: (label: string, cmd: string) => void;
  onOpenSettings?: () => void;
  onOpenAIConfigModal?: () => void;
  aiConfig: models.AIConfig;
  onSaveAIConfig?: (cfg: models.AIConfig) => void;
}

// 抽取并渲染 Markdown 代码块与文本
function ChatMarkdownViewer({
  content,
  onInsertToTerminal,
  onRunInTerminal,
  onSaveQuickCommand,
}: {
  content: string;
  onInsertToTerminal: (cmd: string) => void;
  onRunInTerminal: (cmd: string) => void;
  onSaveQuickCommand?: (label: string, cmd: string) => void;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);

  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-xs leading-relaxed text-slate-200 select-text">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : 'bash';
          const code = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);
          const cleanCode = code.trim();

          return (
            <div key={index} className="rounded-md overflow-hidden border border-[#2b2b2b] bg-[#181818] my-2.5 shadow-sm">
              {/* 代码块工具栏 */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] border-b border-[#2b2b2b] text-[10px] text-[#858585] font-mono">
                <span className="font-semibold text-[#3794ff] flex items-center gap-1">
                  <FileCode className="w-3 h-3" />
                  {lang || 'bash'}
                </span>

                <div className="flex items-center space-x-1">
                  {/* 填入终端 */}
                  <button
                    type="button"
                    onClick={() => onInsertToTerminal(cleanCode)}
                    className="flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded bg-[#0078d4]/15 hover:bg-[#0078d4]/30 text-blue-300 font-medium"
                    title="填入当前终端提示符（不立即执行）"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>填入</span>
                  </button>

                  {/* 直接运行 */}
                  <button
                    type="button"
                    onClick={() => onRunInTerminal(cleanCode)}
                    className="flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 font-medium"
                    title="在当前终端中直接回车执行"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>执行</span>
                  </button>

                  {/* 复制 */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(cleanCode);
                      setCopiedIndex(index);
                      setTimeout(() => setCopiedIndex(null), 1500);
                    }}
                    className="flex items-center gap-1 hover:text-white transition-colors px-2 py-0.5 rounded bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[#cccccc]"
                    title="复制到剪贴板"
                  >
                    {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === index ? '已复制' : '复制'}</span>
                  </button>

                  {/* 存为快捷命令 */}
                  {onSaveQuickCommand && (
                    <button
                      type="button"
                      onClick={() => {
                        const firstLine = cleanCode.split('\n')[0].slice(0, 20);
                        onSaveQuickCommand(firstLine, cleanCode);
                        setSavedIndex(index);
                        setTimeout(() => setSavedIndex(null), 1500);
                      }}
                      className="flex items-center gap-1 hover:text-amber-300 transition-colors px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 text-amber-300"
                      title="保存为底部快捷命令"
                    >
                      {savedIndex === index ? <Check className="w-3 h-3 text-amber-400" /> : <BookmarkPlus className="w-3 h-3" />}
                      <span>{savedIndex === index ? '已保存' : '存快捷'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 代码内容预览 */}
              <pre className="p-3 font-mono text-xs text-[#4ec9b0] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed custom-scrollbar bg-[#181818]">
                {cleanCode}
              </pre>
            </div>
          );
        }

        // 普通文本段落
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

export function OmniAIChatDrawer({
  isOpen,
  onClose,
  activeSessionId,
  activeSessionName,
  terminalContextDir,
  getTerminalBufferLines,
  onInsertToTerminal,
  onRunInTerminal,
  onSaveQuickCommand,
  onOpenSettings,
  onOpenAIConfigModal,
  aiConfig,
  onSaveAIConfig,
}: OmniAIChatDrawerProps) {
  // 抽屉宽度（支持拖拽伸缩，范围 320px ~ 650px）
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('omni_ai_drawer_width');
    return saved ? Math.max(320, Math.min(650, parseInt(saved, 10))) : 400;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('omni_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 上下文注入配置项
  const [includeBuffer, setIncludeBuffer] = useState(false);
  const [includeEnv, setIncludeEnv] = useState(true);

  // 清空会话二次确认状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 记忆对话历史
  useEffect(() => {
    localStorage.setItem('omni_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  // 记忆宽度
  useEffect(() => {
    localStorage.setItem('omni_ai_drawer_width', width.toString());
  }, [width]);

  // 自动滚动到底部
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // 左右拖拽调宽事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = startX - moveEvent.clientX; // 向左拖大，向右拖小
      const newWidth = Math.max(320, Math.min(650, startWidth + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width]);

  // 发送消息
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputPrompt).trim();
    if (!text || loading) return;

    setErrorMsg(null);

    // 组装上下文
    let bufferSnippet = '';
    if (includeBuffer && getTerminalBufferLines) {
      const lines = getTerminalBufferLines();
      if (lines.length > 0) {
        bufferSnippet = lines.slice(-60).join('\n');
      }
    }

    const newUserMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachedContext: {
        terminalSnippet: bufferSnippet || undefined,
        sessionName: includeEnv ? (activeSessionName || undefined) : undefined,
        cwd: includeEnv ? (terminalContextDir || undefined) : undefined,
      },
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputPrompt('');
    setLoading(true);

    try {
      // 组装发给后端的 AIChatMessage 数组
      const sysPrompt = "You are OmniAI, an expert DevOps engineer and Linux SRE assistant integrated into OmniTerminal. " +
        "Provide professional, production-ready, safe answers with executable commands in ```bash ... ``` code blocks. " +
        (includeEnv && activeSessionName ? `Current Target Host: ${activeSessionName}. ` : "") +
        (includeEnv && terminalContextDir ? `Current Working Directory: ${terminalContextDir}. ` : "");

      const rpcMessages: models.AIChatMessage[] = [
        new models.AIChatMessage({ role: 'system', content: sysPrompt }),
      ];

      // 添加历史会话（最多保留最近 8 轮以防 Token 超限）
      const recentHistory = updatedMessages.slice(-8);
      for (const m of recentHistory) {
        let textContent = m.content;
        if (m.attachedContext?.terminalSnippet) {
          textContent += `\n\n[Terminal Context Snippet (recent output)]:\n${m.attachedContext.terminalSnippet}`;
        }
        if (m.attachedContext?.cwd) {
          textContent += `\n[Working Directory]: ${m.attachedContext.cwd}`;
        }
        rpcMessages.push(new models.AIChatMessage({
          role: m.role,
          content: textContent,
        }));
      }

      const responseText = await AIChat(aiConfig, rpcMessages);

      const newAssistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: responseText || '抱歉，AI 未返回有效内容。',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, newAssistantMsg]);
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setShowClearConfirm(prev => !prev);
  };

  const confirmClearHistory = () => {
    setMessages([]);
    localStorage.removeItem('omni_ai_chat_history');
    setShowClearConfirm(false);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  if (!isOpen) return null;

  return (
    <aside
      style={{ width: `${width}px` }}
      className="h-full bg-[#181818] border-l border-[#2b2b2b] flex flex-col relative z-20 shadow-2xl select-none animate-in slide-in-from-right-2 duration-150 shrink-0"
    >
      {/* 左侧可拖拽调整宽度的边框把手 */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 bottom-0 -left-1 w-2 cursor-col-resize hover:bg-[#0078d4]/40 transition-colors z-30"
        title="拖动调整 AI 侧边栏宽度"
      />

      {/* 顶栏 Header */}
      <div className="px-3.5 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 rounded bg-[#0078d4] flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-xs text-white tracking-tight truncate">OmniAI 智能运维</span>
              <button
                type="button"
                onClick={onOpenAIConfigModal}
                className="text-[10px] px-2 py-0.5 rounded bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] text-[#cccccc] font-mono shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                title="点击快速打开大模型设置"
              >
                <span>{aiConfig.provider || 'deepseek'}</span>
                {aiConfig.model && (
                  <span className="text-[#858585] font-normal max-w-[80px] truncate">: {aiConfig.model}</span>
                )}
              </button>
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-[#858585] truncate">
              <span>终端:</span>
              <span className="text-[#3794ff] font-mono truncate">{activeSessionName || '无活动终端'}</span>
            </div>
          </div>
        </div>

        {/* 顶部操作按钮 */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={handleClearHistory}
            className={`p-1.5 rounded transition-colors ${
              showClearConfirm
                ? 'text-rose-400 bg-rose-500/20 ring-1 ring-rose-500/40'
                : 'text-[#858585] hover:text-rose-400 hover:bg-rose-500/10'
            }`}
            title="清空当前会话全部记录"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenAIConfigModal}
            className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-white/10 transition-colors"
            title="设置大模型接入与参数 (LLM Provider Config)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#858585] hover:text-white hover:bg-white/10 transition-colors"
            title="关闭侧边栏 (Cmd+L)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 清空全部对话确认条 */}
      {showClearConfirm && (
        <div className="px-3.5 py-2 bg-rose-950/40 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-200 animate-in slide-in-from-top-1 duration-150">
          <span className="flex items-center gap-1.5 font-medium text-[11px]">
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            确定清空全部对话历史？
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirmClearHistory}
              className="px-2.5 py-0.5 rounded bg-[#a1260d] hover:bg-[#b82a0e] text-white text-[10px] font-semibold shadow-sm transition-all active:scale-95"
            >
              确定清空
            </button>
          </div>
        </div>
      )}

      {/* 消息对话流区域 */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar select-text">
        {messages.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-10 h-10 rounded-md bg-[#252526] border border-[#2b2b2b] flex items-center justify-center mx-auto text-[#0078d4]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-white">随时随地，运维有伴</h3>
              <p className="text-[11px] text-[#858585] max-w-xs mx-auto leading-relaxed">
                无需遮挡终端视口。在右侧随时向 OmniAI 提问命令用法、分析复杂报错或撰写自动化运维脚本。
              </p>
            </div>

            {/* 快速开场提示胶囊 */}
            <div className="space-y-1.5 pt-2 max-w-xs mx-auto text-left">
              <span className="text-[10px] text-[#858585] font-semibold uppercase tracking-wider block mb-1">
                快捷提问示例
              </span>
              {[
                "诊断终端报错原因并生成修复命令",
                "查看 CPU 和内存占用最高的 5 个进程",
                "编写一个按日期轮转清理日志的 Shell 脚本",
                "排查当前服务器端口与监听服务状态",
              ].map((tip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(tip)}
                  className="w-full text-left px-3 py-2 rounded-md bg-[#252526] hover:bg-[#2a2d2e] border border-[#2b2b2b] hover:border-[#0078d4] text-xs text-[#cccccc] hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{tip}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#858585] group-hover:text-[#3794ff] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* 消息角色与时间 */}
              <div className="flex items-center justify-between w-full mb-1 px-1 text-[10px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  {msg.role === 'user' ? (
                    <>
                      <span>您</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-purple-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> OmniAI
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                  title="删除此条消息"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* 消息气泡主体 */}
              <div
                className={`px-3.5 py-2.5 max-w-[95%] shadow-sm rounded-md ${
                  msg.role === 'user'
                    ? 'bg-[#0078d4] text-white'
                    : 'bg-[#252526] border border-[#2b2b2b] text-[#cccccc]'
                }`}
              >
                {/* 如果附带了上下文标识 */}
                {msg.attachedContext && (
                  <div className="mb-2 pb-1.5 border-b border-white/10 text-[10px] space-y-1 opacity-85">
                    {msg.attachedContext.sessionName && (
                      <div className="flex items-center gap-1">
                        <Server className="w-3 h-3 text-cyan-300" />
                        <span>主机: {msg.attachedContext.sessionName}</span>
                      </div>
                    )}
                    {msg.attachedContext.cwd && (
                      <div className="flex items-center gap-1">
                        <Folder className="w-3 h-3 text-yellow-300" />
                        <span>路径: {msg.attachedContext.cwd}</span>
                      </div>
                    )}
                    {msg.attachedContext.terminalSnippet && (
                      <div className="flex items-center gap-1 text-slate-300">
                        <Paperclip className="w-3 h-3 text-blue-300" />
                        <span>已附加活动终端最近输出 (约 {msg.attachedContext.terminalSnippet.split('\n').length} 行)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 消息正文 */}
                {msg.role === 'assistant' ? (
                  <ChatMarkdownViewer
                    content={msg.content}
                    onInsertToTerminal={onInsertToTerminal}
                    onRunInTerminal={onRunInTerminal}
                    onSaveQuickCommand={onSaveQuickCommand}
                  />
                ) : (
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading 打字机指示器 */}
        {loading && (
          <div className="flex items-center space-x-2 text-[#858585] bg-[#252526] border border-[#2b2b2b] rounded-md px-3 py-2 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#0078d4] animate-spin" />
            <span className="text-xs text-[#cccccc] font-medium">OmniAI 正在深度思考中...</span>
          </div>
        )}

        {/* 错误提示 */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">请求发生错误:</span>
              <p className="text-[11px] leading-relaxed break-all opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入控制区 */}
      <div className="p-3 bg-[#1f1f1f] border-t border-[#2b2b2b] space-y-2 shrink-0">
        {/* 上下文选项勾选胶囊 */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setIncludeBuffer(!includeBuffer)}
              className={`px-2 py-0.5 rounded border text-[10px] transition-all flex items-center gap-1 ${
                includeBuffer
                  ? 'bg-[#0078d4]/20 border-[#0078d4] text-[#3794ff] font-semibold'
                  : 'bg-[#252526] border-[#3c3c3c] text-[#858585] hover:text-[#cccccc]'
              }`}
              title="提问时自动附带当前终端最后 50 行输出日志"
            >
              <Paperclip className="w-2.5 h-2.5" />
              <span>附带终端输出</span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeEnv(!includeEnv)}
              className={`px-2 py-0.5 rounded border text-[10px] transition-all flex items-center gap-1 ${
                includeEnv
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 font-semibold'
                  : 'bg-[#252526] border-[#3c3c3c] text-[#858585] hover:text-[#cccccc]'
              }`}
              title="提问时附带当前主机与工作路径信息"
            >
              <Server className="w-2.5 h-2.5" />
              <span>附带主机/路径</span>
            </button>
          </div>

          <span className="text-[10px] text-[#858585]">Enter 发送</span>
        </div>

        {/* 文本输入框与发送按钮 */}
        <div className="relative flex items-end bg-[#1e1e1e] border border-[#3c3c3c] focus-within:border-[#0078d4] rounded-md p-1.5 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="向 OmniAI 提问... (Shift+Enter 换行)"
            className="w-full bg-transparent text-xs text-[#cccccc] placeholder:text-[#858585] outline-none resize-none p-1 leading-relaxed custom-scrollbar"
          />

          <button
            type="button"
            disabled={!inputPrompt.trim() || loading}
            onClick={() => handleSendMessage()}
            className={`p-2 rounded transition-all shrink-0 ${
              inputPrompt.trim() && !loading
                ? 'bg-[#0078d4] hover:bg-[#006cbe] text-white shadow-sm active:scale-95'
                : 'bg-white/5 text-[#858585] cursor-not-allowed'
            }`}
            title="发送 (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

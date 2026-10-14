import { useI18n } from '../i18n/I18nContext';
import React, { useState } from 'react';
import { 
  Copy, Check, ChevronDown, ChevronRight, Bookmark, 
  Sparkles, Terminal, Clock, AlertTriangle, CheckCircle2,
  FileText, CornerDownRight, ExternalLink
} from 'lucide-react';

export interface CommandBlock {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  startTime: number;
  durationMs?: number;
  isCollapsed?: boolean;
  isRunning?: boolean;
  isBookmarked?: boolean;
}

interface CommandBlockOverlayProps {
  blocks: CommandBlock[];
  onToggleCollapse: (id: string) => void;
  onToggleBookmark?: (id: string) => void;
  onExplainWithAI?: (block: CommandBlock) => void;
  onJumpToBlock?: (blockId: string) => void;
}

export const CommandBlockOverlay: React.FC<CommandBlockOverlayProps> = ({
  blocks,
  onToggleCollapse,
  onToggleBookmark,
  onExplainWithAI,
  onJumpToBlock,
}) => {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!blocks || blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Terminal className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-slate-200">{t('cmdBlock.emptyTitle') || '暂无捕获到的命令块'}</p>
          <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
            {t('cmdBlock.emptyDesc') || '在终端中执行 Shell 命令后，命令与其输出流将自动解析为结构化块在此展示，支持块级单独复制、折叠与 AI 诊断。'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 p-2 font-mono text-xs select-text">
      {blocks.map((block, idx) => {
        const isSuccess = block.exitCode === 0;
        const isRunning = block.isRunning;
        const lines = block.output ? block.output.split('\n') : [];
        const isLongOutput = lines.length > 50;

        return (
          <div
            key={block.id}
            id={`cmd-block-${block.id}`}
            className={`group relative rounded-md border transition-all duration-150 overflow-hidden ${
              isRunning
                ? 'border-[#0078d4] bg-[#1e1e1e] shadow-lg shadow-[#0078d4]/10 ring-1 ring-[#0078d4]/40 animate-pulse'
                : !isSuccess
                ? 'border-[#be1100]/50 bg-[#1e1e1e] hover:border-[#be1100]/80 shadow-md'
                : 'border-[#2b2b2b] bg-[#1e1e1e] hover:border-[#3c3c3c] shadow-sm'
            }`}
          >
            {/* Block Header (Command & Floating Actions) */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#252526] border-b border-[#2b2b2b] select-none">
              <div className="flex items-center gap-2 truncate max-w-[65%]">
                <button
                  onClick={() => onToggleCollapse(block.id)}
                  className="p-0.5 rounded text-[#858585] hover:text-[#cccccc]"
                  title={block.isCollapsed ? (t('cmdBlock.expandOutput') || '展开输出') : (t('cmdBlock.collapseOutput') || '折叠输出')}
                >
                  {block.isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <Terminal className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'text-[#3794ff] animate-spin' : isSuccess ? 'text-[#89d185]' : 'text-[#f48771]'}`} />
                
                <span className="font-semibold text-[#cccccc] truncate select-all">
                  {block.command}
                </span>
              </div>

              {/* Badges & Floating Hover Toolbar */}
              <div className="flex items-center gap-1.5">
                {/* Duration */}
                {block.durationMs !== undefined && (
                  <span className="text-[10px] text-[#858585] flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {block.durationMs}ms
                  </span>
                )}

                {/* Exit Code Badge */}
                {isRunning ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#0078d4]/20 text-[#3794ff] border border-[#0078d4]/40">
                    RUNNING
                  </span>
                ) : isSuccess ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#1e3a1e]/40 text-[#89d185] border border-[#3fb950]/30">
                    EXIT 0
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#5a1d1d]/40 text-[#f48771] border border-[#be1100]/40 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    EXIT {block.exitCode}
                  </span>
                )}

                {/* Floating Actions on Hover */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-1">
                  {/* Bookmark Toggle */}
                  {onToggleBookmark && (
                    <button
                      onClick={() => onToggleBookmark(block.id)}
                      className={`p-1 rounded transition-colors ${
                        block.isBookmarked ? 'text-amber-400' : 'text-[#858585] hover:text-[#cccccc]'
                      }`}
                      title={block.isBookmarked ? (t('cmdBlock.removeBookmark') || '移除书签标记') : (t('cmdBlock.addBookmark') || '标记为书签 (Bookmark)')}
                    >
                      <Bookmark className="w-3.5 h-3.5" fill={block.isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  )}

                  {/* Copy Command */}
                  <button
                    onClick={() => copyText(block.command, `${block.id}_cmd`)}
                    className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]"
                    title={t('cmdBlock.copyCommand') || '复制命令'}
                  >
                    {copiedId === `${block.id}_cmd` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Copy Output */}
                  <button
                    onClick={() => copyText(block.output, `${block.id}_out`)}
                    className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]"
                    title={t('cmdBlock.copyOutput') || '复制输出结果'}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  {/* AI Explain if Error */}
                  {onExplainWithAI && !isSuccess && !isRunning && (
                    <button
                      onClick={() => onExplainWithAI(block)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 text-[10px]"
                      title={t('cmdBlock.aiDiagnoseTooltip') || '使用 OmniAI Copilot 智能诊断错误栈'}
                    >
                      <Sparkles className="w-3 h-3 text-purple-300" />
                      <span>{t('cmdBlock.aiDiagnose') || 'AI 诊断'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Block Output Body */}
            {!block.isCollapsed && (
              <div className="relative p-3 bg-[#181818] text-[#cccccc] whitespace-pre-wrap leading-relaxed select-text font-mono text-[12px] max-h-96 overflow-y-auto">
                {block.output ? (
                  block.output
                ) : isRunning ? (
                  <span className="text-slate-500 italic">{t('cmdBlock.running') || '命令运行中...'}</span>
                ) : (
                  <span className="text-slate-600 italic">{t('cmdBlock.noOutput') || '<无输出>'}</span>
                )}

                {/* Auto fold hint if > 50 lines */}
                {isLongOutput && (
                  <div className="sticky bottom-0 left-0 right-0 py-1 bg-gradient-to-t from-[#0d0f14] to-transparent flex justify-center">
                    <button
                      onClick={() => onToggleCollapse(block.id)}
                      className="px-2 py-0.5 rounded bg-[#1f242e] hover:bg-[#282e3b] text-slate-400 text-[10px] border border-[#2b313d]"
                    >
                      {(t('cmdBlock.collapseLongOutput') || '折叠长输出 ({count} 行)').replace('{count}', String(lines.length))}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

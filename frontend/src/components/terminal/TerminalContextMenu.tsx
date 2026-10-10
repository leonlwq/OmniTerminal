import React from 'react';
import { Bookmark, Sparkles } from 'lucide-react';

interface TerminalContextMenuProps {
  contextMenu: { x: number; y: number } | null;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSendClipboardToRemote: () => void;
  onAddBookmark: () => void;
  hasSelection: boolean;
  selectionText: string;
  onExplainText?: (text: string) => void;
  onTriggerAIDiagnose?: (err: string, cmd: string) => void;
  onOpenUrl: (url: string) => void;
  onSelectAll: () => void;
  onClearTerminal: () => void;
  showLiveHex: boolean;
  onToggleLiveHex: () => void;
  onFindFromMenu: () => void;
  onScreenshot: () => void;
  isCommandBlockMode?: boolean;
  onToggleCommandBlockMode?: () => void;
}

export function TerminalContextMenu({
  contextMenu,
  onClose,
  onCopy,
  onPaste,
  onSendClipboardToRemote,
  onAddBookmark,
  hasSelection,
  selectionText,
  onExplainText,
  onTriggerAIDiagnose,
  onOpenUrl,
  onSelectAll,
  onClearTerminal,
  showLiveHex,
  onToggleLiveHex,
  onFindFromMenu,
  onScreenshot,
  isCommandBlockMode,
  onToggleCommandBlockMode,
}: TerminalContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div 
      className="fixed bg-[#252526] border border-[#2b2b2b] rounded-md shadow-2xl py-1 z-50 w-52 text-xs text-[#cccccc] select-none animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
    >
      <button 
        onClick={() => { onCopy(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between"
      >
        <span>复制选中</span>
        <span className="text-[11px] text-[#858585] font-mono">⌘C</span>
      </button>
      <button 
        onClick={() => { onPaste(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between"
      >
        <span>粘贴字符</span>
        <span className="text-[11px] text-[#858585] font-mono">⌘V</span>
      </button>

      {/* 剪贴板反向同步至远端 */}
      <button 
        onClick={() => { onSendClipboardToRemote(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between text-[#3794ff]"
      >
        <span>📤 发送剪贴板到远端</span>
        <span className="text-[11px] text-[#858585] font-mono">OSC 52</span>
      </button>

      {/* 在当前行添加书签 */}
      <button 
        onClick={() => { onAddBookmark(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between text-amber-300"
      >
        <span className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span>在此处添加书签</span>
        </span>
        <span className="text-[11px] text-[#858585] font-mono">⌃⇧M</span>
      </button>

      {/* 切换 Warp 命令块交互模式 */}
      <button 
        onClick={() => { onToggleCommandBlockMode?.(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between text-[#3794ff]"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#3794ff]" />
          <span>{isCommandBlockMode ? '切回传统流式终端' : 'Warp 命令块模式'}</span>
        </span>
        <span className="text-[11px] text-[#858585] font-mono">⌘⇧B</span>
      </button>

      {hasSelection && (
        <>
          <div className="h-px bg-[#2b2b2b] my-1" />
          <button 
            onClick={() => {
              if (selectionText && onExplainText) {
                onExplainText(selectionText);
              } else if (selectionText && onTriggerAIDiagnose) {
                onTriggerAIDiagnose(selectionText, '');
              }
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between text-purple-300 group"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:text-white" />
              <span>AI 解释选中内容</span>
            </span>
            <span className="text-[11px] text-[#858585] group-hover:text-white font-mono">⌘K</span>
          </button>
          {/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(selectionText.trim()) && (
            <button 
              onClick={() => {
                const url = selectionText.trim();
                if (url) onOpenUrl(url);
                onClose();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between text-[#3794ff]"
            >
              <span>在浏览器中打开链接</span>
            </button>
          )}
        </>
      )}

      <div className="h-px bg-[#2b2b2b] my-1" />
      <button 
        onClick={() => { onSelectAll(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors"
      >
        选择全部文本
      </button>
      <button 
        onClick={() => { onClearTerminal(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors"
      >
        清空当前终端屏幕
      </button>
      <button 
        onClick={() => { onToggleLiveHex(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors"
      >
        {showLiveHex ? '关闭' : '打开'} Hex Live 视图
      </button>
      <button 
        onClick={() => { onFindFromMenu(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between"
      >
        <span>查找缓冲区...</span>
        <span className="text-[11px] text-[#858585] font-mono">⌘F</span>
      </button>
      <div className="h-px bg-[#2b2b2b] my-1" />
      <button 
        onClick={() => { onScreenshot(); onClose(); }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors"
      >
        一键截取屏幕并保存图片
      </button>
    </div>
  );
}

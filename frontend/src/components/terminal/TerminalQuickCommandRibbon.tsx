import React from 'react';
import { Sparkles, Filter, ChevronUp } from 'lucide-react';
import { models } from '../../../wailsjs/go/models';

interface TerminalQuickCommandRibbonProps {
  isOpen: boolean;
  quickCommands?: models.QuickCommand[];
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onClose: () => void;
  onSendCommand: (cmd: string) => void;
  onOpenQuickCommandManager?: () => void;
}

export const TerminalQuickCommandRibbon: React.FC<TerminalQuickCommandRibbonProps> = ({
  isOpen,
  quickCommands,
  isFilterOpen,
  onToggleFilter,
  onClose,
  onSendCommand,
  onOpenQuickCommandManager,
}) => {
  if (!isOpen) return null;

  const defaultCmds: Array<{ label: string; cmd: string }> = [
    { label: 'top', cmd: 'top' },
    { label: 'df -h', cmd: 'df -h' },
    { label: 'docker ps', cmd: 'docker ps' },
    { label: 'tail -f log', cmd: 'tail -f /var/log/syslog' },
    { label: 'netstat -tuln', cmd: 'netstat -tuln' },
    { label: 'ps aux', cmd: 'ps aux | head -20' },
  ];

  const commands = quickCommands && quickCommands.length > 0 ? quickCommands : defaultCmds;

  return (
    <div className="w-full bg-[#1f1f1f] border-b border-[#2b2b2b] px-2 py-1 flex items-center justify-between gap-2 shrink-0 z-10">
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
        <span className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider pl-1 pr-1.5 flex items-center gap-1 select-none">
          <Sparkles className="w-3 h-3 text-amber-400" />
          快捷命令:
        </span>
        {commands.map((cmd, idx) => (
          <button
            key={`${cmd.label}-${cmd.cmd}-${idx}`}
            type="button"
            onClick={() => onSendCommand(cmd.cmd)}
            className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#252526] hover:bg-[#0078d4] hover:text-white text-[#cccccc] border border-[#2b2b2b] hover:border-[#0078d4] transition-all shrink-0 active:scale-95 shadow-sm"
            title={`点击发送: ${cmd.cmd}`}
          >
            {cmd.label || cmd.cmd}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onOpenQuickCommandManager?.()}
          className="px-2 py-0.5 rounded text-[11px] text-[#858585] hover:text-[#cccccc] border border-dashed border-[#3c3c3c] hover:border-[#505050] hover:bg-[#2a2d2e] transition-all shrink-0"
          title="管理快捷命令集"
        >
          + 新增
        </button>
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        <button
          type="button"
          onClick={onToggleFilter}
          className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors ${
            isFilterOpen ? 'bg-[#0078d4] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
          }`}
          title="实时日志过滤器 (Cmd+Shift+F / Ctrl+Shift+F)"
        >
          <Filter className="w-3 h-3" />
          <span className="text-[10px]">实时过滤</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#858585] hover:text-[#cccccc] rounded hover:bg-[#2a2d2e]"
          title="收起快捷命令带"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

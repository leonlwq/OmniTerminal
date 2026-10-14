import { useI18n } from '../../i18n/I18nContext';
import React from 'react';
import { Sparkles } from 'lucide-react';
import { CommandBlockOverlay, CommandBlock } from '../CommandBlockOverlay';

interface TerminalCommandBlockViewProps {
  commandBlocks: CommandBlock[];
  isActive: boolean;
  isCommandBlockMode: boolean;
  onToggleMode: () => void;
  onCloseMode: () => void;
  onToggleCollapse: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onExplainWithAI?: (block: CommandBlock) => void;
}

export const TerminalCommandBlockView: React.FC<TerminalCommandBlockViewProps> = ({
  commandBlocks,
  isActive,
  isCommandBlockMode,
  onToggleMode,
  onCloseMode,
  onToggleCollapse,
  onToggleBookmark,
  onExplainWithAI,
}) => {
  const { t } = useI18n();
  // 当处于命令块模式时，支持 Esc 键快速切回传统终端
  React.useEffect(() => {
    if (!isCommandBlockMode || !isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandBlockMode, isActive, onCloseMode]);

  // 不在命令块模式时，不占用终端视口任何空间（0遮挡）
  if (!isCommandBlockMode) return null;

  return (
    <div className="absolute inset-0 z-30 bg-[#181818] overflow-y-auto p-4 select-text animate-in fade-in duration-100">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2b2b2b] sticky top-0 bg-[#181818]/95 backdrop-blur-md z-10">
        <span className="text-xs font-semibold text-[#3794ff] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3794ff]" />
          <span>{t('cmdBlock.title')}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0078d4]/10 border border-[#0078d4]/20 text-[#3794ff] font-normal">
            {t('cmdBlock.count').replace('{count}', String(commandBlocks.length))}
          </span>
        </span>
        <button
          onClick={onCloseMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252526] hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white text-xs border border-[#2b2b2b] transition-colors shadow-sm"
          title={t('cmdBlock.switchTooltip')}
        >
          <span>{t('cmdBlock.switchBtn')}</span>
          <span className="text-[10px] font-mono text-[#858585]">Esc</span>
        </button>
      </div>
      <CommandBlockOverlay
        blocks={commandBlocks}
        onToggleCollapse={onToggleCollapse}
        onToggleBookmark={onToggleBookmark}
        onExplainWithAI={onExplainWithAI}
      />
    </div>
  );
};

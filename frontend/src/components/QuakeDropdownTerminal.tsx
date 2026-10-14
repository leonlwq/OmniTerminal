import { useI18n } from '../i18n/I18nContext';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Pin, PinOff, Terminal, ChevronDown, MoveVertical, 
  Maximize2, Minimize2, Sparkles, Sliders
} from 'lucide-react';

interface QuakeDropdownTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  animationDurationMs?: number;
  children?: React.ReactNode;
}

export const QuakeDropdownTerminal: React.FC<QuakeDropdownTerminalProps> = ({
  isOpen,
  onClose,
  title: userTitle,
  animationDurationMs = 250,
  children,
}) => {
  const { t } = useI18n();
  const title = userTitle || t('quake.title');
  const [heightVh, setHeightVh] = useState<number>(45);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(45);

  // Esc 键关闭（未 Pin 时）
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPinned) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPinned, onClose]);

  // 拖拽底部把手调整高度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = heightVh;
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const windowH = window.innerHeight;
      const deltaVh = (deltaY / windowH) * 100;
      const newVh = Math.min(85, Math.max(20, startHeightRef.current + deltaVh));
      setHeightVh(newVh);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 遮罩点击关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPinned) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 pointer-events-none transition-colors duration-200 ${
        isOpen ? 'pointer-events-auto bg-black/40' : 'bg-transparent'
      }`}
    >
      <div
        style={{
          height: `${heightVh}vh`,
          transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
          transition: isResizing 
            ? 'none' 
            : `transform ${animationDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
        className="w-full flex flex-col bg-[#1e1e1e] border-b border-[#0078d4] shadow-2xl pointer-events-auto overflow-hidden"
      >
        {/* Top Handle / Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b] select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-[#0078d4]/15 text-[#3794ff] border border-[#0078d4]/30">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-[#cccccc] font-mono flex items-center gap-2">
              {title}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0078d4]/20 text-[#3794ff] border border-[#0078d4]/30 font-sans">
                {t('quake.hotkeyHint')}
              </span>
            </span>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            {/* Height Presets */}
            <div className="flex items-center gap-1 text-[11px] text-[#858585] bg-[#181818] px-1.5 py-0.5 rounded border border-[#2b2b2b]">
              <button
                onClick={() => setHeightVh(30)}
                className={`px-1.5 py-0.5 rounded hover:text-[#cccccc] ${heightVh === 30 ? 'text-[#3794ff] font-bold' : ''}`}
              >
                30%
              </button>
              <span className="text-[#3c3c3c]">/</span>
              <button
                onClick={() => setHeightVh(50)}
                className={`px-1.5 py-0.5 rounded hover:text-[#cccccc] ${heightVh === 50 ? 'text-[#3794ff] font-bold' : ''}`}
              >
                50%
              </button>
              <span className="text-[#3c3c3c]">/</span>
              <button
                onClick={() => setHeightVh(75)}
                className={`px-1.5 py-0.5 rounded hover:text-[#cccccc] ${heightVh === 75 ? 'text-[#3794ff] font-bold' : ''}`}
              >
                75%
              </button>
            </div>

            {/* Pin Toggle */}
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1 rounded transition-colors ${
                isPinned 
                  ? 'bg-[#0078d4]/20 text-[#3794ff] border border-[#0078d4]/40' 
                  : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
              title={isPinned ? t('quake.pinned') : t('quake.unpinned')}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]"
              title={t('quake.collapse')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-[#181818]">
          {children ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] space-y-2">
              <Sparkles className="w-8 h-8 opacity-30 text-[#0078d4]" />
              <p className="text-xs">Quake Dropdown Terminal 视口已激活</p>
            </div>
          )}
        </div>

        {/* Bottom Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="h-2 w-full bg-[#252526] hover:bg-[#0078d4]/30 border-t border-[#2b2b2b] cursor-row-resize flex items-center justify-center transition-colors group select-none"
          title={t('quake.resizeTooltip')}
        >
          <div className="w-12 h-1 rounded-full bg-[#3c3c3c] group-hover:bg-[#0078d4] transition-colors" />
        </div>
      </div>
    </div>
  );
};

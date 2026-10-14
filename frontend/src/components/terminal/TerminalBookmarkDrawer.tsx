import { useI18n } from '../../i18n/I18nContext';
import React from 'react';
import { Bookmark, X, Trash2 } from 'lucide-react';

export interface TerminalBookmark {
  id: string;
  line: number;
  previewText: string;
  createdAt: number;
  note?: string;
}

interface TerminalBookmarkDrawerProps {
  bookmarks: TerminalBookmark[];
  isOpen: boolean;
  isActive: boolean;
  toast: string | null;
  onOpen: () => void;
  onClose: () => void;
  onJumpTo: (line: number) => void;
  onDelete: (id: string) => void;
}

export const TerminalBookmarkDrawer: React.FC<TerminalBookmarkDrawerProps> = ({
  bookmarks,
  isOpen,
  isActive,
  toast,
  onOpen,
  onClose,
  onJumpTo,
  onDelete,
}) => {
  const { t } = useI18n();
  return (
    <>
      {/* 🚩 书签提示 Toast */}
      {toast && (
        <div className="absolute top-12 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded bg-[#252526] border border-amber-500/40 text-xs font-medium text-amber-300 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <span>{toast}</span>
        </div>
      )}

      {/* 🚩 书签管理浮标 / 抽屉触发器 */}
      {bookmarks.length > 0 && isActive && (
        <div className="absolute top-12 right-4 z-20 flex items-center gap-1">
          <button
            onClick={onOpen}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-amber-500/40 text-[11px] text-amber-300 shadow-lg transition-colors"
            title={t('bookmark.titleTooltip')}
          >
            <Bookmark className="w-3 h-3 text-amber-400" fill="currentColor" />
            <span>{t('bookmark.badge').replace('{count}', String(bookmarks.length))}</span>
          </button>
        </div>
      )}

      {/* 🚩 书签抽屉面板 (Bookmark Drawer) */}
      {isOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-80 z-40 bg-[#181818] border-l border-[#2b2b2b] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b]">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" fill="currentColor" />
              <span className="text-xs font-semibold text-[#cccccc]">{t("bookmark.listTitle").replace("{count}", String(bookmarks.length))}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => onJumpTo(bm.line)}
                className="group p-2.5 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#2b2b2b] hover:border-amber-500/50 cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-400">
                    {t('bookmark.line').replace('{num}', String(bm.line + 1))}
                  </span>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                    <span className="text-[10px] text-[#858585]">
                      {new Date(bm.createdAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(bm.id);
                      }}
                      className="p-0.5 rounded text-[#858585] hover:text-[#f48771]"
                      title={t('bookmark.delete')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-mono text-[#cccccc] truncate select-all">
                  {bm.previewText || t('bookmark.emptyLine')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

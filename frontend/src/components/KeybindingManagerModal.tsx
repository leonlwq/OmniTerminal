import React, { useState, useEffect } from 'react';
import {
  X,
  Keyboard,
  Search,
  RotateCcw,
  AlertTriangle,
  Edit2,
  Check,
  Flame,
} from 'lucide-react';
import {
  DEFAULT_KEYBINDINGS,
  KeybindingDef,
  normalizeKeyEvent,
  formatKeyDisplay,
} from '../hooks/useKeybindingManager';

interface KeybindingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customKeybindings: Record<string, string>;
  onSaveKeybindings: (bindings: Record<string, string>) => void;
}

export const KeybindingManagerModal: React.FC<KeybindingManagerModalProps> = ({
  isOpen,
  onClose,
  customKeybindings,
  onSaveKeybindings,
}) => {
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<{
    id: string;
    key: string;
    conflictsWith: string[];
  } | null>(null);

  useEffect(() => {
    setBindings(customKeybindings || {});
  }, [customKeybindings, isOpen]);

  // 按键录制监听
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingId(null);
        return;
      }

      const keyCombo = normalizeKeyEvent(e);
      if (!keyCombo) return; // 仅按下了辅助键 (Ctrl/Shift/Alt)

      // 冲突检测
      const conflictingActions: string[] = [];
      for (const def of DEFAULT_KEYBINDINGS) {
        if (def.id === recordingId) continue;
        const currentKey = (bindings[def.id] || def.defaultKey).toLowerCase();
        if (currentKey === keyCombo.toLowerCase()) {
          conflictingActions.push(def.label);
        }
      }

      if (conflictingActions.length > 0) {
        setConflictWarning({
          id: recordingId,
          key: keyCombo,
          conflictsWith: conflictingActions,
        });
      }

      setBindings(prev => ({
        ...prev,
        [recordingId]: keyCombo,
      }));
      setRecordingId(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingId, bindings]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'session', label: '会话管理' },
    { id: 'tabs', label: '标签导航' },
    { id: 'panels', label: '工作区面板' },
    { id: 'terminal', label: '终端交互' },
    { id: 'tools', label: '高阶工具' },
  ];

  const filteredBindings = DEFAULT_KEYBINDINGS.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const activeKey = (bindings[item.id] || item.defaultKey).toLowerCase();
    return (
      item.label.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      activeKey.includes(term)
    );
  });

  const handleResetSingle = (id: string) => {
    setBindings(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResetAll = () => {
    setBindings({});
    setConflictWarning(null);
  };

  const handleSave = () => {
    onSaveKeybindings(bindings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] w-full max-w-3xl h-[82%] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2b2b2b] bg-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Keyboard className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0]">快捷键与按键重映射 (Keyboard Shortcuts)</h2>
              <p className="text-[11px] text-[#858585]">自定义全系统快捷键映射，自动检测键位冲突并支持即时恢复默认</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-[#e0e0e0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter and Category Bar */}
        <div className="px-5 py-2.5 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#04395e] text-white border-l-2 border-l-[#0078d4]'
                    : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#3c3c3c] focus-within:border-[#0078d4] rounded px-2.5 py-1 w-56">
            <Search className="w-3.5 h-3.5 text-[#858585]" />
            <input
              type="text"
              placeholder="搜索按键或功能..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Conflict Alert Banner */}
        {conflictWarning && (
          <div className="bg-[#332a15] border-b border-[#5a481d] px-5 py-2 flex items-center justify-between text-xs text-[#cca700] animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#cca700] flex-shrink-0" />
              <span>
                按键 <strong className="font-mono text-white">{formatKeyDisplay(conflictWarning.key)}</strong> 同时绑定到了：{conflictWarning.conflictsWith.join('、')}
              </span>
            </div>
            <button
              onClick={() => setConflictWarning(null)}
              className="text-[11px] text-[#cca700] hover:underline ml-4"
            >
              忽略
            </button>
          </div>
        )}

        {/* Keybinding List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2b2b2b] px-5 py-2 bg-[#1e1e1e]">
          {filteredBindings.map(item => {
            const isCustom = Boolean(bindings[item.id]);
            const currentKey = bindings[item.id] || item.defaultKey;
            const isRecording = recordingId === item.id;

            return (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between hover:bg-[#252526] px-2 rounded transition-colors group"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#e0e0e0]">{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2d2d2d] text-[#858585] border border-[#3c3c3c]">
                      {item.categoryLabel}
                    </span>
                    {isCustom && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#04395e] text-white border border-[#0078d4]/50">
                        自定义
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#858585] mt-0.5">{item.description}</p>
                </div>

                {/* Key badge & Actions */}
                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-[#04395e]/40 border border-[#0078d4] text-[#a9cce3] text-xs font-mono animate-pulse">
                      <Flame className="w-3.5 h-3.5 text-[#0078d4]" />
                      <span>请直接按下按键... (Esc 取消)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRecordingId(item.id)}
                      className={`px-2.5 py-1 rounded border font-mono text-xs transition-all flex items-center gap-1.5 ${
                        isCustom
                          ? 'bg-[#04395e]/20 border-[#0078d4] text-[#a9cce3] hover:bg-[#04395e]/40'
                          : 'bg-[#2d2d2d] border-[#3c3c3c] text-[#cccccc] hover:border-[#555555]'
                      }`}
                      title="点击录制新快捷键"
                    >
                      <span>{formatKeyDisplay(currentKey)}</span>
                      <Edit2 className="w-3 h-3 text-[#858585] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {isCustom && !isRecording && (
                    <button
                      onClick={() => handleResetSingle(item.id)}
                      className="p-1 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#333333] transition-colors"
                      title="恢复为默认按键"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredBindings.length === 0 && (
            <div className="text-center py-12 text-[#858585] text-xs">
              没有找到匹配的快捷键
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2b2b2b] bg-[#1f1f1f] flex items-center justify-between">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-xs text-[#cccccc] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复所有默认
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-xs font-medium text-[#cccccc] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              保存快捷键
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

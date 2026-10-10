import React, { useState } from 'react';
import { Trash2, Plus, Code, X } from 'lucide-react';
import { models } from '../../wailsjs/go/models';

interface MacroManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  setSettings: (val: any) => void;
}

export function MacroManagerModal({ isOpen, onClose, settings, setSettings }: MacroManagerModalProps) {
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);

  if (!isOpen) return null;

  const macros = settings?.macros || [];

  const handleDelete = (id: string) => {
    if (confirm("确定要删除此宏方案吗？")) {
      const newSettings = new models.AppSettings({
        ...settings,
        macros: macros.filter((m: any) => m.id !== id)
      });
      setSettings(newSettings);
      if (selectedMacroId === id) setSelectedMacroId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[500px] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Code className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">终端宏交互管理器</h2>
              <span className="text-[11px] text-[#858585] font-normal">Terminal Action Macro Manager</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-[#e0e0e0] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col h-[340px] bg-[#1e1e1e]">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs text-[#858585] font-medium">已保存的宏脚本方案</span>
          </div>

          <div className="flex-1 border border-[#2b2b2b] rounded bg-[#252526] overflow-y-auto">
            {macros.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-[#858585] space-y-2 p-6 text-center">
                <Code className="w-8 h-8 opacity-20" />
                <p>暂无已保存的宏记录</p>
                <p className="text-[11px] text-[#666666]">使用终端下方的录制工具可录制按键交互序列并保存为宏。</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1f1f1f] sticky top-0 border-b border-[#2b2b2b] text-[#858585] text-[11px]">
                  <tr>
                    <th className="font-medium px-3.5 py-2 w-1/2">方案名称</th>
                    <th className="font-medium px-3.5 py-2 w-1/4">动作步数</th>
                    <th className="font-medium px-3.5 py-2 w-1/4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b]">
                  {macros.map((macro: any) => (
                    <tr 
                      key={macro.id}
                      onClick={() => setSelectedMacroId(macro.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedMacroId === macro.id ? 'bg-[#04395e] text-white' : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                      }`}
                    >
                      <td className="px-3.5 py-2 truncate font-medium">{macro.name}</td>
                      <td className="px-3.5 py-2 text-[#858585] font-mono text-[11px]">{macro.actions?.length || 0} 步</td>
                      <td className="px-3.5 py-2 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(macro.id); }}
                          className="p-1 text-[#858585] hover:text-[#f14c4c] hover:bg-[#331c19] rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b]">
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}


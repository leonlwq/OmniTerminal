import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, X, Sliders } from 'lucide-react';

interface ParamTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawTemplate: string;
  onExecute: (finalCommand: string) => void;
}

interface TemplateParam {
  name: string;
  defaultValue: string;
  placeholder: string;
}

export function ParamTemplateModal({
  isOpen,
  onClose,
  rawTemplate,
  onExecute,
}: ParamTemplateModalProps) {
  const [paramValues, setParamValues] = useState<{ [key: string]: string }>({});
  const [params, setParams] = useState<TemplateParam[]>([]);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // 解析模板中的 {{param:default}} 或 {{param}}
  useEffect(() => {
    if (!isOpen || !rawTemplate) return;

    const regex = /\{\{([a-zA-Z0-9_-]+)(?::([^}]*))?\}\}/g;
    const extracted: TemplateParam[] = [];
    const initialVals: { [key: string]: string } = {};
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawTemplate)) !== null) {
      const name = match[1];
      const defVal = match[2] !== undefined ? match[2] : '';
      if (!seen.has(name)) {
        seen.add(name);
        extracted.push({
          name,
          defaultValue: defVal,
          placeholder: defVal ? `默认: ${defVal}` : `请输入 ${name}`,
        });
        initialVals[name] = defVal;
      }
    }

    setParams(extracted);
    setParamValues(initialVals);

    setTimeout(() => {
      firstInputRef.current?.focus();
      firstInputRef.current?.select();
    }, 50);
  }, [isOpen, rawTemplate]);

  // 计算渲染后的最终命令
  const computeFinalCommand = () => {
    let rendered = rawTemplate;
    params.forEach(p => {
      const val = paramValues[p.name] !== undefined && paramValues[p.name] !== '' 
        ? paramValues[p.name] 
        : p.defaultValue;
      const paramRegex = new RegExp(`\\{\\{${p.name}(?::[^}]*)?\\}\\}`, 'g');
      rendered = rendered.replace(paramRegex, val);
    });
    return rendered;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCmd = computeFinalCommand();
    onExecute(finalCmd);
    onClose();
  };

  if (!isOpen) return null;

  const finalCmd = computeFinalCommand();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-lg flex flex-col text-[#cccccc] text-xs overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">参数化指令填参执行</h2>
              <span className="text-[11px] text-[#858585] font-normal">Parametric Command Template Runner</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#858585] hover:text-[#cccccc] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-4 space-y-3.5 bg-[#1e1e1e]">
          <div className="text-xs text-[#858585]">
            该命令包含动态变量参数，请确认或修改以下变量取值：
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {params.map((p, idx) => (
              <div key={p.name} className="flex items-center space-x-3 bg-[#252526] border border-[#2b2b2b] p-2 rounded">
                <label className="w-24 shrink-0 text-xs font-mono text-[#0078d4] truncate text-right font-medium">
                  {p.name}:
                </label>
                <input
                  ref={idx === 0 ? firstInputRef : null}
                  type="text"
                  value={paramValues[p.name] ?? ''}
                  placeholder={p.placeholder}
                  onChange={(e) => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                  className="flex-1 px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
                />
              </div>
            ))}
          </div>

          {/* Command Preview */}
          <div className="space-y-1.5 pt-2 border-t border-[#2b2b2b]">
            <div className="text-[11px] text-[#858585] font-medium flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>最终执行命令实时预览:</span>
            </div>
            <div className="p-2.5 bg-[#181818] border border-[#2b2b2b] rounded font-mono text-xs text-[#4ec9b0] break-all select-text leading-relaxed">
              {finalCmd}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#2b2b2b]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] font-medium text-xs rounded transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium text-xs rounded flex items-center space-x-1.5 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>立即投递执行 (Enter)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


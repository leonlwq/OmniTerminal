import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, X, Gauge, Clock, Zap, Check } from 'lucide-react';
import { models } from '../../wailsjs/go/models';

interface SafePasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  textToPaste: string;
  onConfirm: (finalText: string, options?: { charDelayMs?: number; lineDelayMs?: number }) => void;
  dangerousRules?: models.DangerousCommandRule[];
  defaultCharDelay?: number;
  defaultLineDelay?: number;
}

const FLOW_PRESETS = [
  { label: '即时发送 (0ms)', char: 0, line: 0, desc: '无延时瞬间全部投递' },
  { label: '平滑流控 (5ms/100ms)', char: 5, line: 100, desc: '适合常规服务器脚本' },
  { label: '设备安全 (15ms/300ms)', char: 15, line: 300, desc: '适合交换机/路由器/串口' },
  { label: '慢速防吞 (30ms/800ms)', char: 30, line: 800, desc: '适合低缓冲 Bootloader' },
];

export const SafePasteModal: React.FC<SafePasteModalProps> = ({
  isOpen,
  onClose,
  textToPaste,
  onConfirm,
  dangerousRules = [],
  defaultCharDelay = 0,
  defaultLineDelay = 0,
}) => {
  const [content, setContent] = useState(textToPaste);
  const [enablePacing, setEnablePacing] = useState(defaultCharDelay > 0 || defaultLineDelay > 0);
  const [charDelayMs, setCharDelayMs] = useState(defaultCharDelay);
  const [lineDelayMs, setLineDelayMs] = useState(defaultLineDelay);

  useEffect(() => {
    setContent(textToPaste);
    if (defaultCharDelay > 0 || defaultLineDelay > 0) {
      setEnablePacing(true);
      setCharDelayMs(defaultCharDelay);
      setLineDelayMs(defaultLineDelay);
    }
  }, [textToPaste, isOpen, defaultCharDelay, defaultLineDelay]);

  // 检查是否匹配任何危险命令规则
  const matchedRules = useMemo(() => {
    if (!content || !dangerousRules || dangerousRules.length === 0) return [];
    const matches: { pattern: string; desc: string }[] = [];
    
    for (const rule of dangerousRules) {
      if (!rule.enabled || !rule.pattern) continue;
      try {
        const regex = new RegExp(rule.pattern, 'im');
        if (regex.test(content)) {
          matches.push({ pattern: rule.pattern, desc: rule.desc || rule.pattern });
        }
      } catch (e) {
        // 忽略无效正则
      }
    }
    return matches;
  }, [content, dangerousRules]);

  if (!isOpen) return null;

  const lines = content.split(/\r\n|\r|\n/);
  const lineCount = lines.length;
  const charCount = content.length;
  const isDangerous = matchedRules.length > 0;

  const handleSingleLinePaste = () => {
    const singleLine = lines.map(l => l.trim()).filter(Boolean).join(' ');
    onConfirm(singleLine, enablePacing ? { charDelayMs, lineDelayMs } : undefined);
    onClose();
  };

  const handleNormalPaste = () => {
    onConfirm(content, enablePacing ? { charDelayMs, lineDelayMs } : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div 
        className={`w-[660px] max-w-[95vw] bg-[#252526] border ${
          isDangerous ? 'border-[#a1260d] shadow-[0_16px_36px_rgba(161,38,13,0.35)]' : 'border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)]'
        } rounded-lg flex flex-col text-[#cccccc] overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${
          isDangerous ? 'bg-[#1f1f1f] border-[#a1260d]/40 text-[#f48771]' : 'bg-[#1f1f1f] border-[#2b2b2b] text-[#e0e0e0]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-7 h-7 rounded border flex items-center justify-center shadow-sm ${
              isDangerous ? 'bg-[#2d2d2d] border-[#a1260d]/40 text-[#f48771]' : 'bg-[#2d2d2d] border-[#3c3c3c] text-[#cca700]'
            }`}>
              {isDangerous ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight text-[#e0e0e0]">
                {isDangerous ? '高危命令安全粘贴拦截' : '多行文本安全粘贴与流控确认'}
              </h2>
              <span className="text-[11px] text-[#858585] font-normal">
                {isDangerous ? 'Dangerous Command Interception' : 'Safe Multi-line Paste & Delay Pacing'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#858585] hover:text-[#e0e0e0] p-1.5 hover:bg-[#333333] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 危险告警提示栏 */}
        {isDangerous && (
          <div className="px-5 py-2.5 bg-[#a1260d]/15 border-b border-[#a1260d]/40 text-xs text-[#f48771] flex flex-col space-y-1.5 shrink-0">
            <div className="font-semibold flex items-center space-x-1.5">
              <span>⚠️ 安全警告：检测到待粘贴内容命中危险命令安全防护规则！</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              {matchedRules.map((r, i) => (
                <li key={i}>
                  <span className="font-mono bg-[#252526] px-2 py-0.5 rounded border border-[#a1260d]/40">{r.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 内容编辑与预览区 */}
        <div className="p-5 flex flex-col space-y-3 bg-[#1e1e1e]">
          <div className="flex items-center justify-between text-xs text-[#858585]">
            <span>您可以在发送前直接编辑下方缓冲区文本：</span>
            <div className="flex items-center space-x-3 font-mono text-[11px]">
              <span>行数: <strong className="text-[#0078d4]">{lineCount}</strong></span>
              <span>字符数: <strong className="text-[#0078d4]">{charCount}</strong></span>
            </div>
          </div>

          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            rows={7}
            className="w-full bg-[#1e1e1e] text-[#cccccc] font-mono text-xs p-2.5 border border-[#3c3c3c] focus:border-[#0078d4] rounded outline-none resize-y leading-relaxed"
            placeholder="待粘贴内容..."
          />

          {/* SecureCRT 风格：防吞字延时流控配置区 */}
          <div className="bg-[#252526] border border-[#2b2b2b] rounded p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-[#cccccc]">
                <input 
                  type="checkbox"
                  checked={enablePacing}
                  onChange={(e) => setEnablePacing(e.target.checked)}
                  className="rounded accent-[#0078d4] w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1.5 text-[#e0e0e0]">
                  <Gauge className="w-3.5 h-3.5 text-[#0078d4]" />
                  防丢包延时流控发送模式 (Inter-Character / Line Send Delay)
                </span>
              </label>
              <span className="text-[10px] text-[#858585]">
                防止路由器/串口/交换机吞字丢命令
              </span>
            </div>

            {enablePacing && (
              <div className="space-y-2.5 pt-1 text-xs animate-in fade-in duration-100">
                {/* 预设方案按钮 */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-[#858585] mr-1">快捷方案:</span>
                  {FLOW_PRESETS.map((p) => {
                    const isSelected = charDelayMs === p.char && lineDelayMs === p.line;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setCharDelayMs(p.char);
                          setLineDelayMs(p.line);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                          isSelected
                            ? 'bg-[#04395e] border-[#0078d4] text-white font-semibold'
                            : 'bg-[#3c3c3c] border-[#3c3c3c] text-[#cccccc] hover:bg-[#484848]'
                        }`}
                        title={p.desc}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* 精确微调输入 */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#2b2b2b]">
                  <div className="flex items-center justify-between bg-[#1e1e1e] px-2.5 py-1 rounded border border-[#3c3c3c]">
                    <span className="text-[11px] text-[#858585] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#0078d4]" />
                      字符间延时 (Char Delay):
                    </span>
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number"
                        min={0}
                        max={200}
                        step={1}
                        value={charDelayMs}
                        onChange={(e) => setCharDelayMs(Math.max(0, Number(e.target.value)))}
                        className="w-12 bg-transparent text-right font-mono text-[#cccccc] text-xs outline-none"
                      />
                      <span className="text-[10px] text-[#858585]">ms</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#1e1e1e] px-2.5 py-1 rounded border border-[#3c3c3c]">
                    <span className="text-[11px] text-[#858585] flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#cca700]" />
                      行间延时 (Line Delay):
                    </span>
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number"
                        min={0}
                        max={3000}
                        step={50}
                        value={lineDelayMs}
                        onChange={(e) => setLineDelayMs(Math.max(0, Number(e.target.value)))}
                        className="w-14 bg-transparent text-right font-mono text-[#cccccc] text-xs outline-none"
                      />
                      <span className="text-[10px] text-[#858585]">ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-[#858585]">
            按 <kbd className="px-1.5 py-0.5 bg-[#252526] border border-[#3c3c3c] rounded font-mono text-[10px] text-[#cccccc]">Esc</kbd> 取消
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium transition-colors"
            >
              取消
            </button>
            {lineCount > 1 && (
              <button
                onClick={handleSingleLinePaste}
                className="px-3.5 py-1 bg-[#252526] border border-[#3c3c3c] hover:bg-[#2a2d2e] text-[#cccccc] rounded font-medium transition-colors"
                title="移除换行符合并为单行后再发送"
              >
                合并单行粘贴
              </button>
            )}
            <button
              onClick={handleNormalPaste}
              className={`px-4 py-1 font-semibold rounded text-white transition-all shadow-sm ${
                isDangerous 
                  ? 'bg-[#a1260d] hover:bg-[#b82a0e]' 
                  : 'bg-[#0078d4] hover:bg-[#006cbe]'
              }`}
            >
              {isDangerous 
                ? '已知晓风险并强制粘贴' 
                : enablePacing 
                  ? '🐢 启动流控延时粘贴' 
                  : '确认粘贴'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

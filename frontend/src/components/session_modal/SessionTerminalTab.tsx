import React from 'react';
import { Terminal, Gauge } from 'lucide-react';

interface SessionTerminalTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function SessionTerminalTab({ formData, setFormData }: SessionTerminalTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
          终端仿真与协议参数
        </h4>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">字符集编码 (Encoding)</label>
            <select
              value={formData.encoding || 'utf-8'}
              onChange={(e) => setFormData({ ...formData, encoding: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="utf-8">UTF-8 (万国码推荐)</option>
              <option value="gbk">GBK (中文简体)</option>
              <option value="gb18030">GB18030 (中文大字符集)</option>
              <option value="euc-kr">EUC-KR (韩文)</option>
              <option value="euc-jp">EUC-JP (日文)</option>
              <option value="iso-8859-1">ISO-8859-1 (西欧)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">终端类型 (Terminal Type)</label>
            <select
              value={formData.termType || 'xterm-256color'}
              onChange={(e) => setFormData({ ...formData, termType: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="xterm-256color">xterm-256color (推荐)</option>
              <option value="xterm">xterm</option>
              <option value="vt100">vt100</option>
              <option value="vt220">vt220</option>
              <option value="linux">linux</option>
              <option value="ansi">ansi</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">独立回滚历史行数 (Scrollback)</label>
            <input
              type="number"
              min="0"
              placeholder="0 代表继承全局配置"
              value={formData.overrideScrollback || 0}
              onChange={(e) => setFormData({ ...formData, overrideScrollback: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">声音提示 (Bell)</label>
            <select
              value={formData.overrideEnableBell || 0}
              onChange={(e) => setFormData({ ...formData, overrideEnableBell: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value={0}>[ 继承全局配置 ]</option>
              <option value={1}>开启声音 (Bell)</option>
              <option value={2}>禁用声音 (Bell)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#2b2b2b]">
          <label className="text-[11px] font-medium text-[#858585]">选中自动复制 (Copy on Select)</label>
          <select
            value={formData.overrideCopyOnSelect || 0}
            onChange={(e) => setFormData({ ...formData, overrideCopyOnSelect: Number(e.target.value) })}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
          >
            <option value={0}>[ 继承全局配置 ]</option>
            <option value={1}>开启自动复制</option>
            <option value={2}>禁用自动复制</option>
          </select>
        </div>
      </div>

      {/* SecureCRT 延时流控会话级覆盖 */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
          <span className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-[#0078d4]" />
            防丢包延时流控 (Inter-Character & Line Send Delay)
          </span>
          <span className="text-[10px] text-[#858585] font-normal">
            对标 SecureCRT
          </span>
        </h4>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">字符间延时覆盖 (Char Delay)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="200"
                placeholder="0 (继承全局)"
                value={formData.overrideCharSendDelayMs || ''}
                onChange={(e) => setFormData({ ...formData, overrideCharSendDelayMs: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
              />
              <span className="text-xs text-[#858585] shrink-0">ms</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">行间回车延时覆盖 (Line Delay)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="3000"
                step="50"
                placeholder="0 (继承全局)"
                value={formData.overrideLineSendDelayMs || ''}
                onChange={(e) => setFormData({ ...formData, overrideLineSendDelayMs: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
              />
              <span className="text-xs text-[#858585] shrink-0">ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

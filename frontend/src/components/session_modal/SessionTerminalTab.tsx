import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Terminal, Gauge } from 'lucide-react';

interface SessionTerminalTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function SessionTerminalTab({ formData, setFormData }: SessionTerminalTabProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionTerminal.protoParams')}
        </h4>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.encoding')}</label>
            <select
              value={formData.encoding || 'utf-8'}
              onChange={(e) => setFormData({ ...formData, encoding: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="utf-8">{t("sessionTerminal.charsetUtf8")}</option>
              <option value="gbk">{t("sessionTerminal.charsetGbk")}</option>
              <option value="gb18030">{t("sessionTerminal.charsetGb18030")}</option>
              <option value="euc-kr">{t("sessionTerminal.charsetEucKr")}</option>
              <option value="euc-jp">{t("sessionTerminal.charsetEucJp")}</option>
              <option value="iso-8859-1">{t("sessionTerminal.charsetIso88591")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.termType')}</label>
            <select
              value={formData.termType || 'xterm-256color'}
              onChange={(e) => setFormData({ ...formData, termType: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="xterm-256color">{t("sessionTerminal.termXterm256")}</option>
              <option value="xterm">xterm</option>
              <option value="vt100">vt100</option>
              <option value="vt220">vt220</option>
              <option value="linux">linux</option>
              <option value="ansi">ansi</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.scrollback')}</label>
            <input
              type="number"
              min="0"
              placeholder={t("sessionAppearance.inheritGlobal")}
              value={formData.overrideScrollback || 0}
              onChange={(e) => setFormData({ ...formData, overrideScrollback: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.bell')}</label>
            <select
              value={formData.overrideEnableBell || 0}
              onChange={(e) => setFormData({ ...formData, overrideEnableBell: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value={0}>{t('sessionModal.inheritGlobal')}</option>
              <option value={1}>{t("sessionTerminal.soundBellEnable")}</option>
              <option value={2}>{t("sessionTerminal.soundBellDisable")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#2b2b2b]">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.copyOnSelect')}</label>
          <select
            value={formData.overrideCopyOnSelect || 0}
            onChange={(e) => setFormData({ ...formData, overrideCopyOnSelect: Number(e.target.value) })}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
          >
            <option value={0}>{t('sessionModal.inheritGlobal')}</option>
            <option value={1}>{t("sessionTerminal.autoCopyEnable")}</option>
            <option value={2}>{t("sessionTerminal.autoCopyDisable")}</option>
          </select>
        </div>
      </div>

      {/* SecureCRT 延时流控会话级覆盖 */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
          <span className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionTerminal.flowControlTitle')}
          </span>
          <span className="text-[10px] text-[#858585] font-normal">
            {t('sessionTerminal.secureCrtRef')}
          </span>
        </h4>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.charDelay')}</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="200"
                placeholder={t("sessionTerminal.inheritGlobalShort")}
                value={formData.overrideCharSendDelayMs || ''}
                onChange={(e) => setFormData({ ...formData, overrideCharSendDelayMs: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
              />
              <span className="text-xs text-[#858585] shrink-0">ms</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.lineDelay')}</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="3000"
                step="50"
                placeholder={t("sessionTerminal.inheritGlobalShort")}
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

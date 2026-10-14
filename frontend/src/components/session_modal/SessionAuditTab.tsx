import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { FileText } from 'lucide-react';

interface SessionAuditTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function SessionAuditTab({ formData, setFormData }: SessionAuditTabProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <FileText className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionAudit.title')}
        </h4>

        <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={formData.logConfig?.enable || false}
            onChange={(e) => setFormData({ 
              ...formData, 
              logConfig: { 
                ...(formData.logConfig || { format: 'TEXT', pathTemplate: '', maxBytes: 0 }), 
                enable: e.target.checked 
              } 
            })}
            className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
          />
          <div>
            <span className="text-xs text-[#cccccc] font-medium block">{t('sessionModal.enableAudit')}</span>
            <span className="text-[10px] text-[#858585]">{t('sessionModal.enableAuditDesc')}</span>
          </div>
        </label>

        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.customCiphers')}</label>
          <input
            type="text"
            placeholder={t("sessionAudit.cipherPlaceholder")}
            value={(formData.ciphers || []).join(',')}
            onChange={(e) => setFormData({ ...formData, ciphers: e.target.value ? e.target.value.split(',') : [] })}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.customMacs')}</label>
          <input
            type="text"
            placeholder={t("sessionAudit.macPlaceholder")}
            value={(formData.macs || []).join(',')}
            onChange={(e) => setFormData({ ...formData, macs: e.target.value ? e.target.value.split(',') : [] })}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
          />
        </div>
      </div>
    </div>
  );
}

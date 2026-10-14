import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Key, Terminal, Sparkles, X } from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { GetIdentityKeys } from '../../../wailsjs/go/app/App';

interface SessionAuthTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function SessionAuthTab({ formData, setFormData }: SessionAuthTabProps) {
  const { t } = useI18n();
  const [newExpectInput, setNewExpectInput] = useState('');
  const [newSendInput, setNewSendInput] = useState('');
  const [newTriggerExpect, setNewTriggerExpect] = useState('');
  const [newTriggerSend, setNewTriggerSend] = useState('');
  const [newTriggerRegex, setNewTriggerRegex] = useState(false);
  const [identityKeys, setIdentityKeys] = useState<models.IdentityKey[]>([]);
  const [totpEntries, setTotpEntries] = useState<any[]>([]);

  useEffect(() => {
    GetIdentityKeys().then(keys => setIdentityKeys(keys || [])).catch(() => {});
    if (typeof window !== 'undefined' && (window as any).go?.app?.App?.ListTOTPEntries) {
      (window as any).go.app.App.ListTOTPEntries().then((res: any) => setTotpEntries(res || [])).catch(() => {});
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* 凭证配置 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Key className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionAuth.credsTitle')}
        </h4>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.authPassword')}</label>
          <input
            type="password"
            placeholder={t('sessionModal.passwordPlaceholder')}
            value={formData.password || ''}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.authKey')}</label>
          <select
            value={formData.identityKeyId || ''}
            onChange={(e) => setFormData({ ...formData, identityKeyId: e.target.value, privateKey: '' })}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
          >
            <option value="">{t('sessionModal.noGlobalKey')}</option>
            {identityKeys.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.totpBind')}</label>
          <select
            value={(formData as any).totpEntryId || ''}
            onChange={(e) => setFormData({ ...formData, totpEntryId: e.target.value } as any)}
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
          >
            <option value="">{t('sessionModal.noTotp')}</option>
            {totpEntries.map(t => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.issuer ? `${t.issuer} · ` : ''}{t.digits}{t('sessionAuth.digits')})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-[#858585]">
            {t('sessionModal.totpHint')}
          </p>
        </div>

        {!formData.identityKeyId && (
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.privateKey')}</label>
              <textarea
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                value={formData.privateKey || ''}
                onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                className="w-full h-20 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono resize-none outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.userCert')}</label>
              <textarea
                placeholder={t("sessionAuth.certPlaceholder")}
                value={formData.certificate || ''}
                onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                className="w-full h-16 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono resize-none outline-none"
              />
            </div>

            <div className="pt-2 border-t border-[#2b2b2b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-[#e0e0e0]">{t('sessionModal.useSshAgent')}</label>
                  <p className="text-[11px] text-[#858585]">{t('sessionModal.useSshAgentDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.useSshAgent || false}
                  onChange={(e) => setFormData({ ...formData, useSshAgent: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#0078d4] focus:ring-0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#858585]">{t('sessionAuth.pkcsLabel')}</label>
                <input
                  type="text"
                  placeholder={t("sessionAuth.pkcsPlaceholder")}
                  value={(formData as any).pkcs11Provider || ''}
                  onChange={(e) => setFormData({ ...formData, pkcs11Provider: e.target.value } as any)}
                  className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#858585]">{t('sessionAuth.gssapiLabel')}</label>
                <input
                  type="text"
                  placeholder="host/server.domain.com"
                  value={(formData as any).gssapiServerPrincipal || ''}
                  onChange={(e) => setFormData({ ...formData, gssapiServerPrincipal: e.target.value } as any)}
                  className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors font-mono"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 自动交互 Expect 脚本 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionAuth.expectTitle')}
        </h4>

        <div className="space-y-1.5 max-h-28 overflow-y-auto bg-[#1e1e1e] rounded p-2 border border-[#3c3c3c] divide-y divide-[#2b2b2b]">
          {(formData.loginScripts || []).length === 0 ? (
            <p className="text-xs text-[#858585] italic py-2 text-center">{t('sessionModal.noExpect')}</p>
          ) : (
            (formData.loginScripts || []).map((script: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-1.5 text-xs">
                <div className="truncate flex-1 min-w-0 pr-2">
                  <span className="text-[#0078d4] font-medium">{t("sessionAuth.whenMatch")}</span>
                  <span className="font-mono text-[#cccccc]">{script.expect}</span>
                  <span className="text-[#0078d4] font-medium ml-3">{t("sessionAuth.thenSend")}</span>
                  <span className="font-mono text-[#cccccc]">{script.send}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(formData.loginScripts || [])];
                    list.splice(idx, 1);
                    setFormData({ ...formData, loginScripts: list });
                  }}
                  className="text-[#858585] hover:text-red-400 p-1 rounded hover:bg-[#333333] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder={t("sessionAuth.matchPlaceholder")}
            value={newExpectInput}
            onChange={(e) => setNewExpectInput(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
          />
          <input
            type="text"
            placeholder={t("sessionAuth.sendPlaceholder")}
            value={newSendInput}
            onChange={(e) => setNewSendInput(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!newExpectInput.trim()) return;
              const newItem = { expect: newExpectInput, send: newSendInput };
              setFormData({
                ...formData,
                loginScripts: [...(formData.loginScripts || []), newItem]
              });
              setNewExpectInput('');
              setNewSendInput('');
            }}
            className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-xs font-medium text-white transition-colors"
          >
            {t('sessionAuth.addBtn')}
          </button>
        </div>
      </div>

      {/* 运行期触发器 Triggers Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionAuth.triggersTitle')}
        </h4>

        <div className="space-y-1.5 max-h-28 overflow-y-auto bg-[#1e1e1e] rounded p-2 border border-[#3c3c3c] divide-y divide-[#2b2b2b]">
          {(formData.triggers || []).length === 0 ? (
            <p className="text-xs text-[#858585] italic py-2 text-center">{t('sessionModal.noTriggers')}</p>
          ) : (
            (formData.triggers || []).map((trigger: models.TriggerRule, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-1.5 text-xs">
                <div className="truncate flex-1 min-w-0 pr-2">
                  {trigger.isRegex && <span className="px-1.5 py-0.5 bg-[#0078d4]/20 text-[#0078d4] border border-[#0078d4]/30 rounded text-[10px] mr-1.5">{t("sessionAuth.regexBadge")}</span>}
                  <span className="text-[#0078d4] font-medium">{t("sessionAuth.triggerMatch")}</span>
                  <span className="font-mono text-[#cccccc]">{trigger.expect}</span>
                  <span className="text-[#0078d4] font-medium ml-3">{t("sessionAuth.triggerExec")}</span>
                  <span className="font-mono text-[#cccccc]">{trigger.send}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(formData.triggers || [])];
                    list.splice(idx, 1);
                    setFormData({ ...formData, triggers: list });
                  }}
                  className="text-[#858585] hover:text-red-400 p-1 rounded hover:bg-[#333333] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <label className="flex items-center space-x-1.5 shrink-0 text-xs text-[#cccccc] cursor-pointer">
            <input
              type="checkbox"
              checked={newTriggerRegex}
              onChange={(e) => setNewTriggerRegex(e.target.checked)}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
            />
            <span>{t("sessionAuth.regexBadge")}</span>
          </label>
          <input
            type="text"
            placeholder={t("sessionAuth.triggerMatchPlaceholder")}
            value={newTriggerExpect}
            onChange={(e) => setNewTriggerExpect(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
          />
          <input
            type="text"
            placeholder={t("sessionAuth.triggerExecPlaceholder")}
            value={newTriggerSend}
            onChange={(e) => setNewTriggerSend(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!newTriggerExpect.trim()) return;
              const newItem = { expect: newTriggerExpect, send: newTriggerSend, isRegex: newTriggerRegex };
              setFormData({
                ...formData,
                triggers: [...(formData.triggers || []), newItem]
              });
              setNewTriggerExpect('');
              setNewTriggerSend('');
            }}
            className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-xs font-medium text-white transition-colors"
          >
            {t('sessionAuth.addBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

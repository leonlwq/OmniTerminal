import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Share2, X } from 'lucide-react';

interface SessionTunnelTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function SessionTunnelTab({ formData, setFormData }: SessionTunnelTabProps) {
  const { t } = useI18n();
  const [newTunnelType, setNewTunnelType] = useState<'local' | 'remote' | 'dynamic'>('local');
  const [newTunnelLocal, setNewTunnelLocal] = useState('');
  const [newTunnelRemote, setNewTunnelRemote] = useState('');

  return (
    <div className="space-y-4">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Share2 className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionTunnel.title')}
        </h4>

        <div className="space-y-1.5 max-h-32 overflow-y-auto bg-[#1e1e1e] rounded p-2 border border-[#3c3c3c] divide-y divide-[#2b2b2b]">
          {(formData.tunnels || []).length === 0 ? (
            <p className="text-xs text-[#858585] italic py-2 text-center">{t('sessionModal.noTunnels')}</p>
          ) : (
            (formData.tunnels || []).map((tunnel: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-1.5 text-xs">
                <div className="truncate flex-1 min-w-0 pr-2">
                  <span className="text-[#0078d4] font-semibold uppercase">[{tunnel.type}] </span>
                  <span className="font-mono text-[#cccccc]">{tunnel.localAddr}</span>
                  {tunnel.type !== 'dynamic' && (
                    <>
                      <span className="text-[#858585]"> → </span>
                      <span className="font-mono text-[#cccccc]">{tunnel.remoteAddr}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(formData.tunnels || [])];
                    list.splice(idx, 1);
                    setFormData({ ...formData, tunnels: list });
                  }}
                  className="text-[#858585] hover:text-red-400 p-1 rounded hover:bg-[#333333] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 p-2.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={newTunnelType}
              onChange={(e) => setNewTunnelType(e.target.value as 'local' | 'remote' | 'dynamic')}
              className="px-2.5 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="local">{t("sessionTunnel.typeLocal")}</option>
              <option value="remote">{t("sessionTunnel.typeRemote")}</option>
              <option value="dynamic">{t("sessionTunnel.typeDynamic")}</option>
            </select>
            <input
              type="text"
              placeholder={t("sessionTunnel.localListenPlaceholder")}
              value={newTunnelLocal}
              onChange={(e) => setNewTunnelLocal(e.target.value)}
              className="px-2.5 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            />
            <input
              type="text"
              placeholder={t("sessionTunnel.remoteTargetPlaceholder")}
              value={newTunnelRemote}
              onChange={(e) => setNewTunnelRemote(e.target.value)}
              disabled={newTunnelType === 'dynamic'}
              className="px-2.5 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none disabled:opacity-40"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newTunnelLocal.trim()) return;
              if (newTunnelType !== 'dynamic' && !newTunnelRemote.trim()) return;
              const newItem = {
                type: newTunnelType,
                localAddr: newTunnelLocal.trim(),
                remoteAddr: newTunnelType === 'dynamic' ? '' : newTunnelRemote.trim()
              };
              setFormData({
                ...formData,
                tunnels: [...(formData.tunnels || []), newItem]
              });
              setNewTunnelLocal('');
              setNewTunnelRemote('');
            }}
            className="w-full py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-xs font-medium text-white transition-colors"
          >
            {t('sessionTunnel.addBtn')}
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#2b2b2b]">
          <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.enableAgentForwarding || false}
              onChange={(e) => setFormData({ ...formData, enableAgentForwarding: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div>
              <span className="text-xs text-[#cccccc] font-medium block">{t('sessionModal.agentForwarding')}</span>
              <span className="text-[10px] text-[#858585]">{t('sessionModal.agentForwardingDesc')}</span>
            </div>
          </label>

          <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={formData.enableX11Forwarding || false}
              onChange={(e) => setFormData({ ...formData, enableX11Forwarding: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div>
              <span className="text-xs text-[#cccccc] font-medium block">{t('sessionModal.x11Forwarding')}</span>
              <span className="text-[10px] text-[#858585]">{t('sessionModal.x11ForwardingDesc')}</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

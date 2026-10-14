import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Network, RefreshCw, X, Square, AlertCircle, Plus, Copy, Check, ExternalLink } from 'lucide-react';

export interface TunnelStatusInfo {
  id: string;
  sessionId: string;
  sessionName: string;
  type: string;
  localAddr: string;
  remoteAddr: string;
  status: string;
  activeConns: number;
  createdAt: string;
}

interface TunnelMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string | null;
  openTabs?: { id: string; name: string }[];
}

export function TunnelMonitorModal({
  isOpen,
  onClose,
  activeSessionId,
  openTabs = [],
}: TunnelMonitorModalProps) {
  const { t: translate } = useI18n();
  const [tunnels, setTunnels] = useState<TunnelStatusInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New tunnel form
  const [targetSessionId, setTargetSessionId] = useState<string>(activeSessionId || '');
  const [newTunnelType, setNewTunnelType] = useState<'local' | 'remote' | 'dynamic'>('local');
  const [newLocalPort, setNewLocalPort] = useState<string>('8080');
  const [newRemoteHost, setNewRemoteHost] = useState<string>('127.0.0.1');
  const [newRemotePort, setNewRemotePort] = useState<string>('80');

  useEffect(() => {
    if (activeSessionId) {
      setTargetSessionId(activeSessionId);
    } else if (openTabs.length > 0) {
      setTargetSessionId(openTabs[0].id);
    }
  }, [activeSessionId, openTabs]);

  const fetchTunnels = () => {
    setLoading(true);
    setError(null);
    const getFn = (window as any).go?.app?.App?.GetActiveTunnels;
    if (!getFn) {
      setLoading(false);
      return;
    }
    getFn()
      .then((res: TunnelStatusInfo[]) => {
        setTunnels(res || []);
      })
      .catch((err: any) => {
        setError(typeof err === 'string' ? err : err.message || JSON.stringify(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchTunnels();
      const interval = setInterval(fetchTunnels, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleStopTunnel = (sessionId: string, localAddr: string) => {
    const stopFn = (window as any).go?.app?.App?.StopTunnel;
    if (!stopFn) return;
    stopFn(sessionId, localAddr)
      .then(() => {
        fetchTunnels();
      })
      .catch((err: any) => {
        alert("Error: " + err);
      });
  };

  const handleAddTunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSessionId) {
      alert("请选择要绑定的已连接会话");
      return;
    }

    const localAddr = `127.0.0.1:${newLocalPort}`;
    const remoteAddr = newTunnelType === 'dynamic' ? '' : `${newRemoteHost}:${newRemotePort}`;

    const addFn = (window as any).go?.app?.App?.AddActiveTunnel;
    if (!addFn) {
      alert("动态添加隧道接口不可用");
      return;
    }

    try {
      await addFn(targetSessionId, newTunnelType, localAddr, remoteAddr);
      setIsAdding(false);
      fetchTunnels();
    } catch (err: any) {
      alert("Error: " + (err?.message || err));
    }
  };

  const handleCopyAddr = (tun: TunnelStatusInfo) => {
    const text = tun.type === 'dynamic' ? `socks5://${tun.localAddr}` : `http://${tun.localAddr}`;
    navigator.clipboard.writeText(text);
    setCopiedId(tun.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-4xl flex flex-col text-[#cccccc] text-xs overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#e0e0e0] leading-tight">{translate('tunnels.modalTitle') || 'SSH 端口转发与隧道监控增强'}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Active Port Forwarding, Dynamic SOCKS5 & Runtime Tunnel Manager</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1 px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translate('tunnels.addBtn') || '动态添加隧道'}</span>
            </button>
            <button
              onClick={fetchTunnels}
              className="p-1 text-[#858585] hover:text-white hover:bg-[#333333] rounded transition-colors"
              title={translate('common.refresh') || '立即刷新'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#858585] hover:text-white hover:bg-[#333333] rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Add Tunnel Form Drawer */}
        {isAdding && (
          <form onSubmit={handleAddTunnel} className="p-4 bg-[#252526] border-b border-[#2b2b2b] space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="text-xs font-semibold text-[#e0e0e0] flex items-center justify-between">
              <span>{translate('tunnels.createHeader') || '➕ 运行时动态创建端口转发 (无需断开重连)'}</span>
              <button type="button" onClick={() => setIsAdding(false)} className="text-[#858585] hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-[#858585] block mb-1">{translate('tunnels.targetSession') || '目标会话'}</label>
                <select
                  value={targetSessionId}
                  onChange={e => setTargetSessionId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                  required
                >
                  {openTabs.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {openTabs.length === 0 && <option value="">{translate('tunnels.noActiveSession') || '无活动会话 (请先连接)'}</option>}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#858585] block mb-1">{translate('tunnels.forwardType') || '转发类型'}</label>
                <select
                  value={newTunnelType}
                  onChange={e => setNewTunnelType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                >
                  <option value="local">{translate('tunnels.typeLocal') || '本地转发 (Local → Remote)'}</option>
                  <option value="remote">{translate('tunnels.typeRemote') || '远程转发 (Remote → Local)'}</option>
                  <option value="dynamic">{translate('tunnels.typeDynamic') || '动态代理 (Dynamic SOCKS5)'}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#858585] block mb-1">{translate('tunnels.localPort') || '本地监听端口'}</label>
                <input
                  type="number"
                  value={newLocalPort}
                  onChange={e => setNewLocalPort(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs font-mono text-[#cccccc] outline-none"
                  placeholder="8080"
                  required
                />
              </div>

              {newTunnelType !== 'dynamic' ? (
                <div>
                  <label className="text-[10px] text-[#858585] block mb-1">{translate('tunnels.targetAddrPort') || '目标地址与端口'}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newRemoteHost}
                      onChange={e => setNewRemoteHost(e.target.value)}
                      className="w-2/3 px-2.5 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs font-mono text-[#cccccc] outline-none"
                      placeholder="127.0.0.1"
                      required
                    />
                    <input
                      type="number"
                      value={newRemotePort}
                      onChange={e => setNewRemotePort(e.target.value)}
                      className="w-1/3 px-2 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs font-mono text-[#cccccc] outline-none"
                      placeholder="80"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-end">
                  <div className="text-[11px] text-[#3794ff] bg-[#0078d4]/10 border border-[#0078d4]/30 px-3 py-1.5 rounded w-full">
                    SOCKS5 127.0.0.1:{newLocalPort}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
              >
                {translate('common.cancel') || '取消'}
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors"
              >
                {translate('tunnels.startTunnel') || '启动隧道'}
              </button>
            </div>
          </form>
        )}

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-950/40 border-b border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto bg-[#1e1e1e]">
          {tunnels.length === 0 ? (
            <div className="text-center py-14 text-[#858585] space-y-2.5">
              <div className="w-12 h-12 rounded-lg bg-[#252526] border border-[#2b2b2b] flex items-center justify-center text-[#0078d4] mx-auto mb-2">
                <Network className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#cccccc] font-medium">{translate('tunnels.emptyTitle') || '当前无运行中的端口转发或 SOCKS5 代理隧道'}</p>
              <p className="text-[11px] text-[#858585] max-w-md mx-auto">{translate('tunnels.emptyDesc') || '点击右上角「动态添加隧道」可立即向已连接的 SSH 会话挂载端口转发规则，无需断开重连。'}</p>
            </div>
          ) : (
            <div className="border border-[#2b2b2b] rounded overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1f1f1f] border-b border-[#2b2b2b] text-[#858585] text-[11px] font-medium">
                    <th className="py-2 px-3">{translate('tunnels.colSession') || '所属会话'}</th>
                    <th className="py-2 px-3">{translate('tunnels.colType') || '转发类型'}</th>
                    <th className="py-2 px-3">{translate('tunnels.colLocal') || '本地监听地址'}</th>
                    <th className="py-2 px-3">{translate('tunnels.colTarget') || '远端目标地址'}</th>
                    <th className="py-2 px-3">{translate('tunnels.colStatus') || '状态'}</th>
                    <th className="py-2 px-3">{translate('tunnels.colCreated') || '创建时间'}</th>
                    <th className="py-2 px-3 text-right">{translate('tunnels.colActions') || '操作'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b] bg-[#252526]">
                  {tunnels.map((t) => (
                    <tr key={t.id} className="hover:bg-[#2a2d2e] transition-colors">
                      <td className="py-2 px-3 font-medium text-[#e0e0e0]">{t.sessionName || t.sessionId}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                          t.type === 'dynamic' ? 'bg-[#0078d4]/10 text-[#3794ff] border-[#0078d4]/30' :
                          t.type === 'remote' ? 'bg-amber-950/40 text-amber-300 border-amber-500/30' : 'bg-[#0078d4]/10 text-[#3794ff] border-[#0078d4]/30'
                        }`}>
                          {t.type === 'dynamic' ? 'Dynamic (SOCKS5)' : (t.type === 'remote' ? 'Remote' : 'Local')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                        <span>{t.localAddr}</span>
                        <button
                          onClick={() => handleCopyAddr(t)}
                          className="p-0.5 text-[#858585] hover:text-emerald-300 transition-colors"
                          title={translate('common.copy') || '复制'}
                        >
                          {copiedId === t.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-[#cccccc] font-mono">{t.remoteAddr || '— (SOCKS5)'}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                          {translate('tunnels.statusActive') || '活跃中'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#858585] font-mono text-[11px]">{t.createdAt}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleStopTunnel(t.sessionId, t.localAddr)}
                          className="px-2 py-0.5 bg-[#a1260d] hover:bg-[#b82d0f] text-white rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                          title={translate('tunnels.stopBtn') || '停止'}
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                          <span>{translate('tunnels.stopBtn') || '停止'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] text-xs text-[#858585]">
          <span>{(translate('tunnels.totalCount') || '活动隧道总数: {count} 条').replace('{count}', String(tunnels.length))}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] font-medium rounded transition-colors"
          >
            {translate('common.close') || '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

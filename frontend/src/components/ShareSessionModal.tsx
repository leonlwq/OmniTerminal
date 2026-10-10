import React, { useState, useEffect } from 'react';
import {
  Radio,
  Copy,
  Check,
  Shield,
  Clock,
  Users,
  Eye,
  Terminal,
  ExternalLink,
  Power,
  X,
  AlertCircle
} from 'lucide-react';
import { EventsOn } from '../../wailsjs/runtime/runtime';

interface ShareSessionStatus {
  sessionId: string;
  isSharing: boolean;
  token: string;
  mode: 'readonly' | 'readwrite';
  shareUrl: string;
  localUrl: string;
  hasPassword: boolean;
  viewerCount: number;
  maxViewers: number;
  startTime: number;
  expireTime: number;
  remainingSecs: number;
}

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
  onOpenLocalViewer?: (url: string) => void;
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  onOpenLocalViewer
}) => {
  const [status, setStatus] = useState<ShareSessionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'readonly' | 'readwrite'>('readonly');
  const [password, setPassword] = useState('');
  const [maxViewers, setMaxViewers] = useState(5);
  const [timeoutMin, setTimeoutMin] = useState(30);

  const [copiedLan, setCopiedLan] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStatus = async () => {
    if (!sessionId) return;
    try {
      if (typeof window !== 'undefined' && (window as any).go?.app?.App?.GetShareSessionStatus) {
        const res = await (window as any).go.app.App.GetShareSessionStatus(sessionId);
        setStatus(res);
        if (res && res.isSharing) {
          setMode(res.mode);
        }
      }
    } catch (err: any) {
      console.error('Failed to get share status:', err);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      loadStatus();
      setErrorMsg(null);
    }
  }, [isOpen, sessionId]);

  // 监听后端推送的状态与观众变化事件
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const unsubStatus = EventsOn(`share-status-changed:${sessionId}`, (newStatus: any) => {
      setStatus(newStatus);
    });

    const unsubViewers = EventsOn(`share-viewers-changed:${sessionId}`, (data: any) => {
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          viewerCount: data.viewerCount
        };
      });
    });

    return () => {
      if (typeof unsubStatus === 'function') unsubStatus();
      if (typeof unsubViewers === 'function') unsubViewers();
    };
  }, [isOpen, sessionId]);

  // 剩余时间倒计时
  useEffect(() => {
    if (!isOpen || !status?.isSharing) return;

    const timer = setInterval(() => {
      setStatus(prev => {
        if (!prev || !prev.isSharing || prev.remainingSecs <= 0) return prev;
        return {
          ...prev,
          remainingSecs: prev.remainingSecs - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, status?.isSharing]);

  const handleStartShare = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if ((window as any).go?.app?.App?.StartShareSession) {
        const res = await (window as any).go.app.App.StartShareSession(
          sessionId,
          mode,
          password.trim(),
          maxViewers,
          timeoutMin
        );
        setStatus(res);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStopShare = async () => {
    setLoading(true);
    try {
      if ((window as any).go?.app?.App?.StopShareSession) {
        await (window as any).go.app.App.StopShareSession(sessionId);
        setStatus(prev => (prev ? { ...prev, isSharing: false, viewerCount: 0 } : null));
      }
    } catch (err: any) {
      alert('停止共享失败: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'lan' | 'local') => {
    navigator.clipboard.writeText(text);
    if (type === 'lan') {
      setCopiedLan(true);
      setTimeout(() => setCopiedLan(false), 2000);
    } else {
      setCopiedLocal(true);
      setTimeout(() => setCopiedLocal(false), 2000);
    }
  };

  const formatRemainingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins} 分 ${s < 10 ? '0' : ''}${s} 秒`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] w-full max-w-lg flex flex-col overflow-hidden text-[#cccccc]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2b2b2b] flex items-center justify-between bg-[#1f1f1f] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] shadow-sm">
              <Radio className={`w-3.5 h-3.5 ${status?.isSharing ? 'animate-pulse text-[#89d185]' : ''}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0]">终端会话实时共享与协同</h2>
              <p className="text-[11px] text-[#858585] truncate max-w-[280px]">
                当前会话: {sessionName || sessionId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#858585] hover:text-[#e0e0e0] rounded hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-[#a1260d]/15 border border-[#a1260d]/40 rounded flex items-center space-x-2 text-xs text-[#f48771] shrink-0">
            <AlertCircle className="w-4 h-4 text-[#f48771] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 主体区域 */}
        <div className="p-5 space-y-4 bg-[#1e1e1e]">
          {status?.isSharing ? (
            /* 运行中状态卡片 */
            <div className="space-y-4">
              <div className="bg-[#252526] border border-[#2b2b2b] rounded p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#89d185] animate-ping" />
                  <div>
                    <span className="text-xs font-semibold text-[#e0e0e0]">正在实时广播共享中</span>
                    <p className="text-[11px] text-[#89d185] mt-0.5">
                      模式: {status.mode === 'readwrite' ? '⌨️ 读写协同控制' : '👁️ 仅只读观察'} · 
                      {status.hasPassword ? ' 已开启密码保护' : ' 免密访问'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 bg-[#1e1e1e] border border-[#3c3c3c] px-2.5 py-0.5 rounded text-[11px] font-mono text-[#cccccc]">
                  <Users className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>{status.viewerCount} / {status.maxViewers} 人在线</span>
                </div>
              </div>

              {/* 局域网链接 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#cccccc] block">
                  局域网分享链接 (团队成员在同一 Wi-Fi 或局域网即可打开)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={status.shareUrl}
                    className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs font-mono text-[#cccccc] select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(status.shareUrl, 'lan')}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors"
                  >
                    {copiedLan ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLan ? '已复制' : '复制'}</span>
                  </button>
                </div>
              </div>

              {/* 本地回环链接 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#858585] block">
                  本地回环链接 (本机浏览器打开)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={status.localUrl}
                    className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs font-mono text-[#858585] select-all outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(status.localUrl, 'local')}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
                  >
                    {copiedLocal ? <Check className="w-3.5 h-3.5 text-[#89d185]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLocal ? '已复制' : '复制'}</span>
                  </button>
                  {onOpenLocalViewer && (
                    <button
                      onClick={() => onOpenLocalViewer(status.localUrl)}
                      className="p-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded"
                      title="在应用内打开观察窗口"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 倒计时 */}
              <div className="flex items-center justify-between text-xs text-[#858585] bg-[#252526] p-2.5 rounded border border-[#2b2b2b]">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#858585]" />
                  <span>剩余共享有效时间:</span>
                </div>
                <span className="font-mono text-[#cca700] font-medium">
                  {formatRemainingTime(status.remainingSecs)}
                </span>
              </div>
            </div>
          ) : (
            /* 配置表单 */
            <div className="space-y-4">
              {/* 共享模式选择 */}
              <div>
                <label className="text-xs font-medium text-[#cccccc] block mb-2">协同控制模式</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start space-x-3 p-3 rounded border cursor-pointer transition-colors ${
                      mode === 'readonly'
                        ? 'bg-[#04395e] border-[#0078d4] text-white'
                        : 'bg-[#252526] border-[#2b2b2b] text-[#858585] hover:border-[#3c3c3c]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareMode"
                      checked={mode === 'readonly'}
                      onChange={() => setMode('readonly')}
                      className="mt-0.5 accent-[#0078d4]"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#e0e0e0]">
                        <Eye className="w-3.5 h-3.5 text-[#0078d4]" />
                        <span>只读观察模式</span>
                      </div>
                      <p className="text-[11px] text-[#858585] mt-1">
                        观众仅可实时观看终端画面，无法敲击键盘或输入任何指令
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-3 p-3 rounded border cursor-pointer transition-colors ${
                      mode === 'readwrite'
                        ? 'bg-[#04395e] border-[#0078d4] text-white'
                        : 'bg-[#252526] border-[#2b2b2b] text-[#858585] hover:border-[#3c3c3c]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareMode"
                      checked={mode === 'readwrite'}
                      onChange={() => setMode('readwrite')}
                      className="mt-0.5 accent-[#0078d4]"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#e0e0e0]">
                        <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
                        <span>读写协作模式</span>
                      </div>
                      <p className="text-[11px] text-[#858585] mt-1">
                        观众可在外部浏览器直接敲击键盘输入命令，与你共同控制终端
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 访问密码 */}
              <div>
                <label className="text-xs font-medium text-[#cccccc] block mb-1">
                  访问密码 (可选，留空则免密进入)
                </label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="设置临时访问密码..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded pl-9 pr-3 py-1.5 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                  />
                </div>
              </div>

              {/* 最大人数与超时 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#cccccc] block mb-1">
                    最大允许观众人数
                  </label>
                  <select
                    value={maxViewers}
                    onChange={e => setMaxViewers(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] focus:outline-none focus:border-[#0078d4]"
                  >
                    <option value={2}>2 人 (对排模式)</option>
                    <option value={5}>5 人 (推荐默认)</option>
                    <option value={10}>10 人 (演示广播)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#cccccc] block mb-1">
                    超时自动注销时间
                  </label>
                  <select
                    value={timeoutMin}
                    onChange={e => setTimeoutMin(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] focus:outline-none focus:border-[#0078d4]"
                  >
                    <option value={15}>15 分钟</option>
                    <option value={30}>30 分钟 (默认)</option>
                    <option value={60}>1 小时</option>
                    <option value={120}>2 小时</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer 操作栏 */}
        <div className="px-5 py-3 border-t border-[#2b2b2b] bg-[#1f1f1f] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#858585] flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>基于本地内置 WebSocket 服务 · 无需任何第三方云端转发</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
            >
              关闭
            </button>
            {status?.isSharing ? (
              <button
                onClick={handleStopShare}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3.5 py-1 bg-[#a1260d] hover:bg-[#b82a0e] text-white rounded text-xs font-medium transition-all disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{loading ? '正在停止...' : '停止共享'}</span>
              </button>
            ) : (
              <button
                onClick={handleStartShare}
                disabled={loading}
                className="flex items-center space-x-1.5 px-4 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-all disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{loading ? '正在启动...' : '启动实时共享'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

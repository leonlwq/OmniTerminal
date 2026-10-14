import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import {
  ShieldCheck,
  Plus,
  Key,
  Copy,
  Check,
  Trash2,
  Edit2,
  Clock,
  RefreshCw,
  QrCode,
  Link,
  Search,
  X,
  AlertCircle
} from 'lucide-react';

interface TOTPEntry {
  id: string;
  label: string;
  issuer: string;
  accountName: string;
  secretEnc: string;
  algorithm: string;
  digits: number;
  period: number;
  createdAt: number;
  updatedAt: number;
}

interface TOTPCodeResult {
  entryId: string;
  label: string;
  code: string;
  remainingSecs: number;
  period: number;
}

interface TOTPManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCode?: (code: string) => void;
}

export const TOTPManagerModal: React.FC<TOTPManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectCode
}) => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<TOTPEntry[]>([]);
  const [codes, setCodes] = useState<{ [id: string]: TOTPCodeResult }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 新增/导入状态
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'uri'>('manual');
  const [label, setLabel] = useState('');
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [secret, setSecret] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA1');
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState(30);
  const [otpUri, setOtpUri] = useState('');

  // 编辑状态
  const [editingEntry, setEditingEntry] = useState<TOTPEntry | null>(null);

  const loadEntries = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).go?.app?.App?.ListTOTPEntries) {
        const list = await (window as any).go.app.App.ListTOTPEntries();
        setEntries(list || []);
        refreshCodes(list || []);
      }
    } catch (err: any) {
      console.error('Failed to load TOTP entries:', err);
    }
  };

  const refreshCodes = async (entryList: TOTPEntry[]) => {
    if (typeof window === 'undefined' || !(window as any).go?.app?.App?.GenerateTOTPCode) return;
    const newCodes: { [id: string]: TOTPCodeResult } = {};
    for (const entry of entryList) {
      try {
        const res = await (window as any).go.app.App.GenerateTOTPCode(entry.id);
        if (res) {
          newCodes[entry.id] = res;
        }
      } catch (e) {
        // ignore single failure
      }
    }
    setCodes(newCodes);
  };

  useEffect(() => {
    if (isOpen) {
      loadEntries();
      setErrorMsg(null);
    }
  }, [isOpen]);

  // 倒计时刷新器：每秒更新剩余秒数，并在倒计时归零时重新计算动态码
  useEffect(() => {
    if (!isOpen || entries.length === 0) return;

    const timer = setInterval(() => {
      setCodes(prev => {
        let needFullRefresh = false;
        const updated = { ...prev };
        for (const id of Object.keys(updated)) {
          if (updated[id].remainingSecs <= 1) {
            needFullRefresh = true;
          } else {
            updated[id] = {
              ...updated[id],
              remainingSecs: updated[id].remainingSecs - 1
            };
          }
        }
        if (needFullRefresh) {
          refreshCodes(entries);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, entries]);

  const handleCopyCode = (id: string, code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (onSelectCode) {
      onSelectCode(code);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !secret.trim()) {
      setErrorMsg(t('totp.requireFields'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if ((window as any).go?.app?.App?.AddTOTPEntry) {
        await (window as any).go.app.App.AddTOTPEntry(
          label.trim(),
          secret.trim(),
          issuer.trim(),
          accountName.trim(),
          algorithm,
          digits,
          period
        );
        resetForm();
        setIsAdding(false);
        await loadEntries();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImportUri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpUri.trim()) {
      setErrorMsg(t('totp.invalidUri'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if ((window as any).go?.app?.App?.ImportTOTPFromURI) {
        await (window as any).go.app.App.ImportTOTPFromURI(otpUri.trim());
        setOtpUri('');
        setIsAdding(false);
        await loadEntries();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('totp.deleteConfirm'))) return;
    try {
      if ((window as any).go?.app?.App?.DeleteTOTPEntry) {
        await (window as any).go.app.App.DeleteTOTPEntry(id);
        await loadEntries();
      }
    } catch (err: any) {
      alert('Delete failed: ' + (err?.message || String(err)));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    try {
      if ((window as any).go?.app?.App?.UpdateTOTPEntry) {
        await (window as any).go.app.App.UpdateTOTPEntry(editingEntry);
        setEditingEntry(null);
        await loadEntries();
      }
    } catch (err: any) {
      alert('Update failed: ' + (err?.message || String(err)));
    }
  };

  const resetForm = () => {
    setLabel('');
    setIssuer('');
    setAccountName('');
    setSecret('');
    setAlgorithm('SHA1');
    setDigits(6);
    setPeriod(30);
    setOtpUri('');
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const filteredEntries = entries.filter(e =>
    e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.accountName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden text-[#cccccc]">
        {/* 顶部标题栏 */}
        <div className="px-5 py-3 border-b border-[#2b2b2b] flex items-center justify-between bg-[#1f1f1f]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] tracking-wide">{t('totp.modalTitle')}</h2>
              <p className="text-xs text-[#858585]">{t('totp.modalSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                resetForm();
              }}
              className="flex items-center space-x-1.5 px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? t('totp.backToList') : t('totp.addTokenBtn')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#858585] hover:text-[#cccccc] rounded hover:bg-[#333333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 bg-[#f14c4c]/10 border border-[#f14c4c]/30 rounded flex items-center space-x-2 text-xs text-[#f14c4c]">
            <AlertCircle className="w-4 h-4 text-[#f14c4c] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 内容主体 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#1e1e1e] custom-scrollbar">
          {isAdding ? (
            /* 添加表单 */
            <div className="bg-[#252526] border border-[#2b2b2b] rounded p-4 space-y-3.5">
              <div className="flex space-x-2 border-b border-[#2b2b2b] pb-2.5">
                <button
                  type="button"
                  onClick={() => setAddMode('manual')}
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                    addMode === 'manual'
                      ? 'bg-[#04395e] text-white'
                      : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{t('totp.tabManual')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('uri')}
                  className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                    addMode === 'uri'
                      ? 'bg-[#04395e] text-white'
                      : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{t('totp.tabUri')}</span>
                </button>
              </div>

              {addMode === 'manual' ? (
                <form onSubmit={handleAddManual} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">
                        {t('totp.labelTag')} <span className="text-[#f14c4c]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={t('totp.tagPlaceholder')}
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">
                        {t('totp.issuer')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('totp.issuerPlaceholder')}
                        value={issuer}
                        onChange={e => setIssuer(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">
                        {t('totp.account')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('totp.accountPlaceholder')}
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">
                        {t('totp.secretKey')} <span className="text-[#f14c4c]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="JBSWY3DPEHPK3PXP..."
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] font-mono placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t('totp.algorithm')}</label>
                      <select
                        value={algorithm}
                        onChange={e => setAlgorithm(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] focus:outline-none focus:border-[#0078d4]"
                      >
                        <option value="SHA1">SHA1</option>
                        <option value="SHA256">SHA256</option>
                        <option value="SHA512">SHA512</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t('totp.digits')}</label>
                      <select
                        value={digits}
                        onChange={e => setDigits(Number(e.target.value))}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] focus:outline-none focus:border-[#0078d4]"
                      >
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t('totp.period')}</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={period}
                        onChange={e => setPeriod(Number(e.target.value))}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] focus:outline-none focus:border-[#0078d4]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? t('totp.saving') : t('totp.saveToken')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleImportUri} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#e0e0e0] mb-1">
                      otpauth:// URI
                    </label>
                    <textarea
                      rows={3}
                      placeholder="otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example..."
                      value={otpUri}
                      onChange={e => setOtpUri(e.target.value)}
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc] font-mono placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                      required
                    />
                    <p className="mt-1 text-[11px] text-[#858585]">
                      {t('totp.uriDesc')}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? t('totp.importing') : t('totp.importBtn')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* 搜索与卡片列表 */
            <>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t('totp.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded pl-8 pr-3 py-1.5 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#0078d4]"
                  />
                </div>
                <button
                  onClick={() => refreshCodes(entries)}
                  className="p-1.5 bg-[#252526] border border-[#2b2b2b] hover:bg-[#2a2d2e] text-[#cccccc] rounded transition-colors"
                  title={t('common.refresh')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#2b2b2b] rounded">
                  <Key className="w-10 h-10 text-[#858585] mx-auto mb-3 stroke-[1.5]" />
                  <h3 className="text-xs font-semibold text-[#e0e0e0] mb-1">{t('totp.emptyTitle')}</h3>
                  <p className="text-xs text-[#858585] mb-4 max-w-sm mx-auto">
                    {t('totp.emptyDesc')}
                  </p>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors"
                  >
                    {t('totp.addFirst')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredEntries.map(entry => {
                    const codeData = codes[entry.id];
                    const remaining = codeData ? codeData.remainingSecs : 30;
                    const periodSec = entry.period || 30;
                    const progress = (remaining / periodSec) * 100;
                    const isUrgent = remaining <= 5;
                    const codeStr = codeData ? codeData.code : '------';

                    // 拆分为前后两段展示 (如 123 456)
                    const half = Math.floor(codeStr.length / 2);
                    const formattedCode = codeStr.length >= 6
                      ? `${codeStr.slice(0, half)} ${codeStr.slice(half)}`
                      : codeStr;

                    return (
                      <div
                        key={entry.id}
                        className="bg-[#252526] border border-[#2b2b2b] hover:border-[#0078d4]/60 rounded p-3.5 transition-all shadow-sm group relative flex flex-col justify-between"
                      >
                        {/* 卡片头部 */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 pr-2">
                            <h4 className="text-xs font-semibold text-[#e0e0e0] truncate tracking-wide">
                              {entry.label}
                            </h4>
                            <p className="text-[11px] text-[#858585] truncate">
                              {entry.issuer ? `${entry.issuer} · ` : ''}
                              {entry.accountName || t('totp.noAccount')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1 text-[#858585] hover:text-[#cccccc] rounded hover:bg-[#333333]"
                              title={t('common.edit')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-1 text-[#858585] hover:text-[#f14c4c] rounded hover:bg-[#333333]"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 动态验证码与倒计时进度 */}
                        <div className="flex items-center justify-between my-2 bg-[#181818] border border-[#2b2b2b] rounded p-2.5">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-xl font-mono font-semibold tracking-wider text-[#0078d4] select-all">
                              {formattedCode}
                            </span>
                          </div>

                          {/* 倒计时圆环进度 */}
                          <div className="flex items-center space-x-2">
                            <div className="relative w-7 h-7 flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-[#333333]"
                                  strokeWidth="3.5"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className={`transition-all duration-500 ease-linear ${
                                    isUrgent ? 'text-[#f14c4c]' : 'text-[#0078d4]'
                                  }`}
                                  strokeDasharray={`${progress}, 100`}
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <span
                                className={`absolute text-[9px] font-mono font-semibold ${
                                  isUrgent ? 'text-[#f14c4c]' : 'text-[#858585]'
                                }`}
                              >
                                {remaining}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCopyCode(entry.id, codeStr)}
                              className="p-1 bg-[#252526] hover:bg-[#0078d4] text-[#cccccc] hover:text-white rounded border border-[#2b2b2b] transition-colors"
                              title={t('totp.copyCode')}
                            >
                              {copiedId === entry.id ? (
                                <Check className="w-3.5 h-3.5 text-[#4ec9b0]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 底部元信息 */}
                        <div className="flex items-center justify-between text-[11px] text-[#858585] pt-1">
                          <span>{entry.algorithm} · {entry.digits}</span>
                          <span>{entry.period}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 编辑对话框浮层 */}
          {editingEntry && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 w-full max-w-md space-y-3.5 shadow-2xl">
                <h3 className="text-xs font-semibold text-[#e0e0e0]">{t('totp.editLabel')}</h3>
                <form onSubmit={handleUpdate} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t('totp.labelTag')}</label>
                    <input
                      type="text"
                      value={editingEntry.label}
                      onChange={e => setEditingEntry({ ...editingEntry, label: e.target.value })}
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t('totp.issuer')}</label>
                    <input
                      type="text"
                      value={editingEntry.issuer}
                      onChange={e => setEditingEntry({ ...editingEntry, issuer: e.target.value })}
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#e0e0e0] mb-1">{t('totp.account')}</label>
                    <input
                      type="text"
                      value={editingEntry.accountName}
                      onChange={e => setEditingEntry({ ...editingEntry, accountName: e.target.value })}
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-[#cccccc]"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingEntry(null)}
                      className="px-2.5 py-1 text-xs text-[#858585] hover:text-[#cccccc]"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium"
                    >
                      {t('totp.saveUpdate')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* 底部功能条 */}
        <div className="px-5 py-3 border-t border-[#2b2b2b] bg-[#1f1f1f] flex items-center justify-between text-xs text-[#858585]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#4ec9b0]"></span>
            <span>{t('totp.footerInfo').replace('{count}', String(entries.length))}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

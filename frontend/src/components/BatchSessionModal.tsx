import React, { useState, useEffect } from 'react';
import { X, Layers, Save, CheckSquare, Square } from 'lucide-react';
import { app, models } from '../../wailsjs/go/models';
import { SaveSessionsBatch, GetAuthProfiles } from '../../wailsjs/go/app/App';
import { THEMES } from './TerminalInstance';
import { useI18n } from '../i18n/I18nContext';

interface BatchSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSessions: app.SessionConfig[];
  authProfiles?: models.AuthProfile[];
  customThemes?: models.CustomThemeConfig[];
  onSaveBatch?: (updatedSessions: app.SessionConfig[]) => Promise<void>;
  onSaved?: () => void;
}

export const BatchSessionModal: React.FC<BatchSessionModalProps> = ({
  isOpen,
  onClose,
  selectedSessions,
  authProfiles: propAuthProfiles,
  customThemes = [],
  onSaveBatch,
  onSaved,
}) => {
  const { t } = useI18n();
  const [internalAuthProfiles, setInternalAuthProfiles] = useState<models.AuthProfile[]>([]);
  const authProfiles = propAuthProfiles || internalAuthProfiles;

  useEffect(() => {
    if (!propAuthProfiles && isOpen) {
      GetAuthProfiles().then(res => setInternalAuthProfiles(res || [])).catch(() => {});
    }
  }, [isOpen, propAuthProfiles]);
  // 勾选哪些字段需要被批量覆盖
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Record<string, boolean>>({
    port: false,
    user: false,
    authProfileId: false,
    encoding: false,
    overrideTheme: false,
    overrideFontSize: false,
    termType: false,
    overrideScrollback: false,
    overrideTerminalOpacity: false,
  });

  // 待应用的值
  const [port, setPort] = useState(22);
  const [user, setUser] = useState('');
  const [authProfileId, setAuthProfileId] = useState('');
  const [encoding, setEncoding] = useState('UTF-8');
  const [overrideTheme, setOverrideTheme] = useState('');
  const [overrideFontSize, setOverrideFontSize] = useState(14);
  const [termType, setTermType] = useState('xterm-256color');
  const [overrideScrollback, setOverrideScrollback] = useState(10000);
  const [overrideTerminalOpacity, setOverrideTerminalOpacity] = useState(1.0);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleField = (field: string) => {
    setFieldsToUpdate(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedList = selectedSessions.map(sess => {
        const copy = new app.SessionConfig({ ...sess });
        if (fieldsToUpdate.port) copy.port = Number(port);
        if (fieldsToUpdate.user) copy.user = user;
        if (fieldsToUpdate.authProfileId) copy.authProfileId = authProfileId;
        if (fieldsToUpdate.encoding) copy.encoding = encoding;
        if (fieldsToUpdate.overrideTheme) copy.overrideTheme = overrideTheme;
        if (fieldsToUpdate.overrideFontSize) copy.overrideFontSize = Number(overrideFontSize);
        if (fieldsToUpdate.termType) copy.termType = termType;
        if (fieldsToUpdate.overrideScrollback) copy.overrideScrollback = Number(overrideScrollback);
        if (fieldsToUpdate.overrideTerminalOpacity) copy.overrideTerminalOpacity = Number(overrideTerminalOpacity);
        return copy;
      });

      if (onSaveBatch) {
        await onSaveBatch(updatedList);
      } else {
        await SaveSessionsBatch(updatedList);
      }
      if (onSaved) onSaved();
      else onClose();
    } catch (err) {
      console.error("Batch update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-[660px] max-w-[95vw] bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('batchSession.title')}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Batch Edit Multi-Session Properties</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#858585] hover:text-[#cccccc] p-1 hover:bg-[#333333] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-5 py-2 bg-[#04395e]/25 border-b border-[#0078d4]/30 text-xs text-[#cccccc]">
          {t('batchSession.desc').replace('{count}', String(selectedSessions.length))}
        </div>

        {/* Form area */}
        <form onSubmit={handleSave} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto text-xs bg-[#1e1e1e] custom-scrollbar">
          {/* Port and User */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.port ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.port} 
                  onChange={() => toggleField('port')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.port')}</span>
              </label>
              <input 
                type="number"
                disabled={!fieldsToUpdate.port}
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              />
            </div>

            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.user ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.user} 
                  onChange={() => toggleField('user')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.user')}</span>
              </label>
              <input 
                type="text"
                disabled={!fieldsToUpdate.user}
                value={user}
                placeholder="root / ubuntu..."
                onChange={(e) => setUser(e.target.value)}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              />
            </div>
          </div>

          {/* Auth Profile and Encoding */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.authProfileId ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.authProfileId} 
                  onChange={() => toggleField('authProfileId')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.authProfile')}</span>
              </label>
              <select 
                disabled={!fieldsToUpdate.authProfileId}
                value={authProfileId}
                onChange={(e) => setAuthProfileId(e.target.value)}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              >
                <option value="">(None)</option>
                {authProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.user})</option>
                ))}
              </select>
            </div>

            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.encoding ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.encoding} 
                  onChange={() => toggleField('encoding')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.encoding')}</span>
              </label>
              <select 
                disabled={!fieldsToUpdate.encoding}
                value={encoding}
                onChange={(e) => setEncoding(e.target.value)}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              >
                <option value="UTF-8">Unicode (UTF-8)</option>
                <option value="GBK">GBK / GB2312</option>
                <option value="GB18030">GB18030</option>
                <option value="BIG5">Big5</option>
                <option value="EUC-JP">EUC-JP</option>
                <option value="Shift-JIS">Shift-JIS</option>
                <option value="EUC-KR">EUC-KR</option>
                <option value="ISO-8859-1">ISO-8859-1</option>
              </select>
            </div>
          </div>

          {/* Theme and Terminal Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.overrideTheme ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.overrideTheme} 
                  onChange={() => toggleField('overrideTheme')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.colorTheme')}</span>
              </label>
              <select 
                disabled={!fieldsToUpdate.overrideTheme}
                value={overrideTheme}
                onChange={(e) => setOverrideTheme(e.target.value)}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              >
                <option value="">Default</option>
                {customThemes && customThemes.length > 0 && (
                  <optgroup label="Custom Themes">
                    {customThemes.map((t: any) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Built-in Themes">
                  {Object.keys(THEMES).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.termType ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.termType} 
                  onChange={() => toggleField('termType')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.terminalType')}</span>
              </label>
              <select 
                disabled={!fieldsToUpdate.termType}
                value={termType}
                onChange={(e) => setTermType(e.target.value)}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              >
                <option value="xterm-256color">xterm-256color</option>
                <option value="xterm">xterm</option>
                <option value="vt100">vt100</option>
                <option value="vt220">vt220</option>
                <option value="linux">linux</option>
                <option value="ansi">ansi</option>
              </select>
            </div>
          </div>

          {/* Scrollback and Font Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.overrideScrollback ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.overrideScrollback} 
                  onChange={() => toggleField('overrideScrollback')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.scrollback')}</span>
              </label>
              <input 
                type="number"
                disabled={!fieldsToUpdate.overrideScrollback}
                value={overrideScrollback}
                onChange={(e) => setOverrideScrollback(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              />
            </div>

            <div className={`p-3 border rounded flex flex-col space-y-2 transition-all ${
              fieldsToUpdate.overrideFontSize ? 'border-[#0078d4]/50 bg-[#04395e]/20' : 'border-[#2b2b2b] bg-[#252526]'
            }`}>
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-[#e0e0e0]">
                <input 
                  type="checkbox" 
                  checked={fieldsToUpdate.overrideFontSize} 
                  onChange={() => toggleField('overrideFontSize')}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs">{t('batchSession.fontSize')}</span>
              </label>
              <input 
                type="number"
                disabled={!fieldsToUpdate.overrideFontSize}
                value={overrideFontSize}
                onChange={(e) => setOverrideFontSize(Number(e.target.value))}
                className="w-full bg-[#1e1e1e] px-3 py-1.5 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] text-xs rounded text-[#cccccc] disabled:opacity-30 outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] text-xs rounded font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !Object.values(fieldsToUpdate).some(Boolean)}
            className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-40 text-white text-xs font-medium rounded transition-colors flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? t('common.saving') : t('batchSession.saveBtn').replace('{count}', String(selectedSessions.length))}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


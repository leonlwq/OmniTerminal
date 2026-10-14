import React, { useState } from 'react';
import { X, Upload, Check, FolderInput, FileCode, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { ImportExternalSessions, ScanLocalSSHConfig, SaveSessionsBatch } from '../../wailsjs/go/app/App';
import { useI18n } from '../i18n/I18nContext';

interface ImportSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
  onImportComplete?: () => void;
}

const IMPORT_SOURCES = [
  { id: 'ssh_config', name: 'OpenSSH (~/.ssh/config)', desc: 'OpenSSH Config' },
  { id: 'xshell', name: 'Xshell (.xsh)', desc: 'Xshell Session' },
  { id: 'securecrt', name: 'SecureCRT (XML / .ini)', desc: 'SecureCRT XML/INI' },
  { id: 'mobaxterm', name: 'MobaXterm (.mxtpro)', desc: 'MobaXterm Session' },
  { id: 'putty', name: 'PuTTY (.reg)', desc: 'PuTTY Registry Reg' },
  { id: 'termius', name: 'Termius (JSON)', desc: 'Termius JSON Export' },
];

export const ImportSessionsModal: React.FC<ImportSessionsModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onImportComplete,
}) => {
  const { t } = useI18n();
  const [selectedFormat, setSelectedFormat] = useState('ssh_config');
  const [rawText, setRawText] = useState('');
  const [parsedSessions, setParsedSessions] = useState<app.SessionConfig[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleScanLocal = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const results = await ScanLocalSSHConfig();
      if (results && results.length > 0) {
        setParsedSessions(results);
        const sel: Record<number, boolean> = {};
        results.forEach((_: app.SessionConfig, i: number) => (sel[i] = true));
        setSelectedIndices(sel);
        setSuccessMsg(t('importSessions.scannedCount').replace('{count}', String(results.length)));
      } else {
        setErrorMsg(t('importSessions.noConfigFound'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleParseContent = async () => {
    if (!rawText.trim()) {
      setErrorMsg(t('importSessions.pasteRequired'));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const results = await ImportExternalSessions(selectedFormat, rawText, '');
      if (results && results.length > 0) {
        setParsedSessions(results);
        const sel: Record<number, boolean> = {};
        results.forEach((_: app.SessionConfig, i: number) => (sel[i] = true));
        setSelectedIndices(sel);
        setSuccessMsg(t('importSessions.parsedCount').replace('{count}', String(results.length)));
      } else {
        setErrorMsg(t('importSessions.noSessionsParsed'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
    };
    reader.readAsText(file);
  };

  const handleSaveImported = async () => {
    const toImport = parsedSessions.filter((_, idx) => selectedIndices[idx]);
    if (toImport.length === 0) {
      setErrorMsg(t('importSessions.selectAtLeastOne'));
      return;
    }

    setLoading(true);
    try {
      await SaveSessionsBatch(toImport);
      if (onImportSuccess) onImportSuccess();
      if (onImportComplete) onImportComplete();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-[720px] max-w-[95vw] bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('importSessions.title')}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Cross-Client Session Migration & Import Wizard</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#858585] hover:text-[#cccccc] p-1 hover:bg-[#333333] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs bg-[#1e1e1e] custom-scrollbar">
          {/* Format selection */}
          <div className="space-y-2">
            <label className="block font-semibold text-xs text-[#e0e0e0]">
              {t('importSessions.step1')}
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {IMPORT_SOURCES.map((src) => (
                <button
                  key={src.id}
                  onClick={() => {
                    setSelectedFormat(src.id);
                    setParsedSessions([]);
                  }}
                  className={`p-3 border text-left rounded transition-all flex flex-col space-y-1 ${
                    selectedFormat === src.id 
                      ? 'border-[#0078d4]/60 bg-[#04395e]/30 text-white font-medium' 
                      : 'border-[#2b2b2b] bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
                  }`}
                >
                  <div className={`font-semibold text-xs ${selectedFormat === src.id ? 'text-[#0078d4]' : 'text-[#e0e0e0]'}`}>{src.name}</div>
                  <div className="text-[11px] text-[#858585] leading-tight">{src.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration source */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-[#e0e0e0]">
                {t('importSessions.step2')}
              </label>
              {selectedFormat === 'ssh_config' && (
                <button
                  onClick={handleScanLocal}
                  disabled={loading}
                  className="px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs rounded flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('importSessions.scanSshConfig')}</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2.5">
              <label className="px-3 py-1.5 bg-[#3c3c3c] border border-[#3c3c3c] hover:bg-[#484848] cursor-pointer text-xs rounded transition-colors flex items-center space-x-2 text-[#cccccc] font-medium">
                <Upload className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>{t('importSessions.chooseFile')}</span>
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
              <span className="text-xs text-[#858585]">{t('importSessions.orPaste')}</span>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={4}
              placeholder="Host server1&#10;  HostName 192.168.1.10..."
              className="w-full bg-[#1e1e1e] font-mono text-xs p-3 border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] rounded outline-none text-[#cccccc] resize-none leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                onClick={handleParseContent}
                disabled={loading || !rawText.trim()}
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] disabled:opacity-40 text-xs rounded text-[#cccccc] font-medium transition-colors"
              >
                {t('importSessions.parseContent')}
              </button>
            </div>
          </div>

          {/* Status feedback */}
          {errorMsg && (
            <div className="p-2.5 bg-[#f14c4c]/10 border border-[#f14c4c]/30 text-[#f14c4c] text-xs rounded">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-[#4ec9b0]/10 border border-[#4ec9b0]/30 text-[#4ec9b0] text-xs rounded">
              {successMsg}
            </div>
          )}

          {/* Parsed results preview */}
          {parsedSessions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#e0e0e0] font-semibold">
                <span>{t('importSessions.step3').replace('{selected}', String(parsedSessions.filter((_, i) => selectedIndices[i]).length)).replace('{total}', String(parsedSessions.length))}</span>
                <div className="space-x-3 text-xs">
                  <button 
                    onClick={() => {
                      const all: Record<number, boolean> = {};
                      parsedSessions.forEach((_, i) => (all[i] = true));
                      setSelectedIndices(all);
                    }}
                    className="text-[#0078d4] hover:underline"
                  >
                    {t('common.selectAll')}
                  </button>
                  <button 
                    onClick={() => setSelectedIndices({})}
                    className="text-[#858585] hover:text-[#cccccc]"
                  >
                    {t('common.deselectAll', '全不选')}
                  </button>
                </div>
              </div>

              <div className="border border-[#2b2b2b] rounded max-h-48 overflow-y-auto divide-y divide-[#2b2b2b] bg-[#1e1e1e] custom-scrollbar">
                {parsedSessions.map((s, idx) => (
                  <label key={idx} className="flex items-center space-x-2.5 px-3 py-2 hover:bg-[#2a2d2e] cursor-pointer text-xs transition-colors">
                    <input 
                      type="checkbox"
                      checked={!!selectedIndices[idx]}
                      onChange={() => setSelectedIndices(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span className="font-semibold text-[#0078d4] w-36 truncate">{s.name}</span>
                    <span className="font-mono text-[#858585] flex-1 truncate text-[11px]">{s.user}@{s.host}:{s.port}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-end space-x-2 text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSaveImported}
            disabled={loading || parsedSessions.filter((_, i) => selectedIndices[i]).length === 0}
            className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-40 text-white font-medium rounded transition-colors"
          >
            {t('importSessions.importBtn').replace('{count}', String(parsedSessions.filter((_, i) => selectedIndices[i]).length))}
          </button>
        </div>
      </div>
    </div>
  );
};


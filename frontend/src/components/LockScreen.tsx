import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { UnlockSessions, GetAuthProfiles } from '../../wailsjs/go/app/App';

interface LockScreenProps {
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  loadSessions: () => void;
  loadSettings: () => void;
  setAuthProfiles: (profiles: any[]) => void;
  t: (key: any) => string;
}

export function LockScreen({
  isLocked,
  setIsLocked,
  loadSessions,
  loadSettings,
  setAuthProfiles,
  t
}: LockScreenProps) {
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState('');

  if (!isLocked) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setLockError('');
    UnlockSessions(lockPassword)
      .then((ok) => {
        if (ok) {
          setIsLocked(false);
          loadSessions();
          loadSettings();
          GetAuthProfiles().then(p => setAuthProfiles(p||[]));
        } else {
          setLockError(t('lockScreen.errorFailed') || "主密码校验失败，请重试");
        }
      })
      .catch(err => {
        setLockError(typeof err === 'string' ? err : err.message || "解密失败");
      });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#090b0e]/95 backdrop-blur-xl text-slate-100 select-none font-sans p-4 animate-in fade-in duration-300">
      {/* Background glow effects */}
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="max-w-md w-full bg-[#252526] border border-[#2b2b2b] shadow-2xl rounded-md p-8 z-10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="inline-flex p-3 bg-[#0078d4]/15 border border-[#0078d4]/30 text-[#3794ff] rounded shadow-sm">
          <Lock className="h-7 w-7 animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#cccccc] tracking-tight">{t('lockScreen.title') || 'OmniTerminal 已加密锁定'}</h2>
          <p className="text-xs text-[#858585] mt-1.5 leading-relaxed">{t('lockScreen.subtitle') || '请输入主密码 (Master Password) 以解锁本地安全凭据库与会话配置'}</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 pt-2">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-[#858585]" />
            <input 
              type="password"
              placeholder={t('lockScreen.pwdPlaceholder') || '请输入主密码...'}
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded outline-none text-[#cccccc] transition-all font-mono placeholder-[#858585]"
              required
              autoFocus
            />
          </div>
          {lockError && (
            <p className="text-xs text-[#f48771] flex items-center justify-center space-x-1.5 bg-[#5a1d1d]/30 border border-[#be1100]/40 py-2 rounded">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{lockError}</span>
            </p>
          )}
          <button 
            type="submit"
            className="w-full py-2 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] text-xs font-medium text-white rounded shadow-sm transition-all"
          >
            {t('nav.unlock') || '解锁工作台 (Unlock)'}
          </button>
        </form>
      </div>
    </div>
  );
}


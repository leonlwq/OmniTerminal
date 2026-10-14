import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { KeyRound, ShieldAlert, Check, X } from 'lucide-react';

export const NetworkPrompts: React.FC = () => {
  const { t } = useI18n();
  // --- Keyboard Interactive Auth ---
  const [kiChallenge, setKiChallenge] = useState<any>(null);
  const [kiAnswers, setKiAnswers] = useState<string[]>([]);
  const [autofillTotpMsg, setAutofillTotpMsg] = useState<string | null>(null);
  const [totpList, setTotpList] = useState<any[]>([]);

  useEffect(() => {
    const unsub = EventsOn("keyboard-interactive-challenge", async (data: any) => {
      setKiChallenge(data);
      setAutofillTotpMsg(null);
      const qCount = data && data.questions ? data.questions.length : 0;
      const initialAnswers = new Array(qCount).fill('');

      // 尝试加载所有 TOTP 列表供选择
      if (typeof window !== 'undefined' && (window as any).go?.app?.App?.ListTOTPEntries) {
        try {
          const list = await (window as any).go.app.App.ListTOTPEntries();
          setTotpList(list || []);
        } catch (_) {}
      }

      // 检查当前会话是否有关联的 TOTP
      if (data && data.sessionId && typeof window !== 'undefined' && (window as any).go?.app?.App?.GetTOTPCodeForSession) {
        try {
          const totpRes = await (window as any).go.app.App.GetTOTPCodeForSession(data.sessionId);
          if (totpRes && totpRes.code) {
            // 检查哪个问题是在询问 TOTP / 验证码
            let targetIdx = -1;
            const otpKeywords = ['verification', 'otp', 'token', 'one-time', 'passcode', '两步验证', '动态码', '验证码'];
            data.questions?.forEach((q: string, idx: number) => {
              const lower = q.toLowerCase();
              if (otpKeywords.some(k => lower.includes(k))) {
                targetIdx = idx;
              }
            });

            // 如果只有一个问题且包含 code 或无明确关键字，也尝试填入
            if (targetIdx === -1 && qCount === 1) {
              const lower = (data.questions[0] || '').toLowerCase();
              if (lower.includes('code') || lower.includes('码')) {
                targetIdx = 0;
              }
            }

            if (targetIdx >= 0) {
              initialAnswers[targetIdx] = totpRes.code;
              setAutofillTotpMsg(t('netPrompt.autofilledTotp').replace('{label}', totpRes.label).replace('{code}', totpRes.code));
            }
          }
        } catch (_) {
          // 该会话未绑定 TOTP，不报错
        }
      }

      setKiAnswers(initialAnswers);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const injectTotpCode = async (entryId: string, questionIdx: number) => {
    if (typeof window === 'undefined' || !(window as any).go?.app?.App?.GenerateTOTPCode) return;
    try {
      const res = await (window as any).go.app.App.GenerateTOTPCode(entryId);
      if (res && res.code) {
        const newAns = [...kiAnswers];
        newAns[questionIdx] = res.code;
        setKiAnswers(newAns);
        setAutofillTotpMsg(t('netPrompt.autofilledTotp').replace('{label}', res.label).replace('{code}', res.code));
      }
    } catch (e: any) {
      alert('计算动态码失败: ' + (e?.message || String(e)));
    }
  };

  const submitKiAnswers = () => {
    if (!kiChallenge) return;
    if (typeof window !== 'undefined' && (window as any).go) {
      (window as any).runtime.EventsEmit(`ki-answer-${kiChallenge.sessionId}`, kiAnswers);
    }
    setKiChallenge(null);
  };

  const cancelKi = () => {
    if (!kiChallenge) return;
    if (typeof window !== 'undefined' && (window as any).go) {
      (window as any).runtime.EventsEmit(`ki-answer-${kiChallenge.sessionId}`, null);
    }
    setKiChallenge(null);
  };

  // --- Host Key Verify ---
  const [hkChallenge, setHkChallenge] = useState<any>(null);

  useEffect(() => {
    const unsub = EventsOn("host-key-verify", (data: any) => {
      setHkChallenge(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const acceptHk = () => {
    if (!hkChallenge) return;
    if (typeof window !== 'undefined' && (window as any).go) {
      (window as any).runtime.EventsEmit(`hk-answer-${hkChallenge.sessionId}`, true);
    }
    setHkChallenge(null);
  };

  const rejectHk = () => {
    if (!hkChallenge) return;
    if (typeof window !== 'undefined' && (window as any).go) {
      (window as any).runtime.EventsEmit(`hk-answer-${hkChallenge.sessionId}`, false);
    }
    setHkChallenge(null);
  };

  return (
    <>
      {/* Keyboard Interactive Modal */}
      {kiChallenge && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] border border-[#2b2b2b] shadow-2xl w-[480px] rounded-md flex flex-col overflow-hidden text-[#cccccc]">
            <div className="px-5 py-3 border-b border-[#2b2b2b] flex items-center space-x-3 bg-[#1f1f1f]">
              <div className="w-7 h-7 rounded bg-[#0078d4]/15 border border-[#0078d4]/30 flex items-center justify-center text-[#3794ff] shadow-sm">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-[#cccccc]">{t('netPrompt.twoFactorTitle')}</h2>
                <span className="text-[11px] text-[#858585]">Keyboard Interactive Authentication Challenge</span>
              </div>
            </div>
            <div className="p-5 space-y-4 bg-[#1e1e1e]">
              <p className="text-xs text-[#cccccc]">{t('netPrompt.remotePromptNotice')}</p>
              {autofillTotpMsg && (
                <div className="p-2.5 bg-[#0078d4]/15 border border-[#0078d4]/30 rounded flex items-center space-x-2 text-xs text-[#3794ff] animate-in fade-in">
                  <span className="text-sm">🔐</span>
                  <span className="font-medium">{autofillTotpMsg}</span>
                </div>
              )}
              {kiChallenge.instruction && (
                <div className="p-2.5 bg-[#181818] border border-[#2b2b2b] rounded text-xs text-[#cccccc] font-mono whitespace-pre-wrap">
                  {kiChallenge.instruction}
                </div>
              )}
              {kiChallenge.questions?.map((q: string, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#cccccc] block">{q}</label>
                    {totpList.length > 0 && (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-[#858585]">{t('netPrompt.quickFill')}</span>
                        <select
                          onChange={(e) => {
                            if (e.target.value) injectTotpCode(e.target.value, idx);
                          }}
                          defaultValue=""
                          className="bg-[#252526] border border-[#3c3c3c] rounded px-2 py-0.5 text-[11px] text-[#cccccc] outline-none cursor-pointer hover:border-[#0078d4]"
                        >
                          <option value="" disabled>{t('netPrompt.selectTotp')}</option>
                          {totpList.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <input
                    type={kiChallenge.echos && kiChallenge.echos[idx] ? "text" : "password"}
                    value={kiAnswers[idx] || ''}
                    onChange={(e) => {
                      const newAns = [...kiAnswers];
                      newAns[idx] = e.target.value;
                      setKiAnswers(newAns);
                    }}
                    className="w-full bg-[#181818] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-xs text-[#cccccc] font-mono outline-none transition-all"
                    autoFocus={idx === 0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitKiAnswers();
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#2b2b2b] bg-[#1f1f1f] flex justify-end space-x-2">
              <button 
                onClick={cancelKi} 
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] rounded text-[#cccccc] text-xs font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={submitKiAnswers} 
                className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] rounded text-white text-xs font-medium shadow-sm transition-all"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Key Verify Modal */}
      {hkChallenge && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] border border-[#2b2b2b] shadow-2xl w-[520px] rounded-md flex flex-col overflow-hidden text-[#cccccc]">
            <div className="px-5 py-3 border-b border-[#2b2b2b] flex items-center space-x-3 bg-[#1f1f1f]">
              <div className="w-7 h-7 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-[#cccccc]">首次连接主机指纹校验</h2>
                <span className="text-[11px] text-[#858585]">SSH Host Key Verification Prompt</span>
              </div>
            </div>
            <div className="p-5 space-y-4 bg-[#1e1e1e]">
              <p className="text-xs text-[#cccccc] leading-relaxed">
                您正在建立与主机 <strong className="text-white font-semibold">{hkChallenge.hostname}</strong> 的连接。系统无法从本地 Known Hosts 库验证此主机的真实性。
              </p>
              <div className="p-3 bg-[#181818] border border-[#2b2b2b] rounded font-mono text-[11px] text-[#cccccc] break-all space-y-1.5">
                <p><span className="text-[#858585]">算法类型:</span> <span className="text-[#cccccc] font-semibold">{hkChallenge.keyType}</span></p>
                <p><span className="text-[#858585]">公钥指纹:</span> <span className="text-amber-400 font-semibold">{hkChallenge.fingerprint}</span></p>
              </div>
              <p className="text-[11px] text-[#858585] leading-relaxed">
                如果您确认此指纹来自您的目标主机，请点击“信任并保存”，该指纹将被安全记录至受信任主机库。
              </p>
            </div>
            <div className="px-5 py-3 border-t border-[#2b2b2b] bg-[#1f1f1f] flex justify-end space-x-2">
              <button 
                onClick={rejectHk} 
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] rounded text-[#cccccc] text-xs font-medium transition-colors"
              >
                拒绝连接
              </button>
              <button 
                onClick={acceptHk} 
                className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] rounded text-white text-xs font-medium shadow-sm transition-all"
              >
                信任并保存 (Trust)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


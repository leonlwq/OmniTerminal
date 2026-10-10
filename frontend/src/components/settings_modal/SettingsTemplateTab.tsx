import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Sliders, Check, Command } from 'lucide-react';
import { app, models } from '../../../wailsjs/go/models';
import { GetSessions, SaveSessionsBatch } from '../../../wailsjs/go/app/App';
import { THEMES } from '../TerminalInstance';

interface SettingsTemplateTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
}

export function SettingsTemplateTab({
  settings,
  setSettings,
}: SettingsTemplateTabProps) {
  const [templateSuccess, setTemplateSuccess] = useState('');
  const [templateApplying, setTemplateApplying] = useState(false);

  return (
              <div className="space-y-4">
                <div className="p-3 bg-[#04395e]/25 border border-[#0078d4]/40 rounded-md text-xs text-[#cccccc] flex items-start space-x-2.5">
                  <Command className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">全局默认会话模板</strong>：所有新建会话将自动继承下方配置作为初始预设。你也可以随时将该模板一键批量推送到所有已保存的会话。
                  </div>
                </div>

                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">默认终端类型 (Terminal Type)</label>
                      <select 
                        value={(settings.defaultSessionTemplate?.termType as string) || 'xterm-256color'}
                        onChange={(e) => {
                          const tmpl = { ...(settings.defaultSessionTemplate || {}), termType: e.target.value };
                          setSettings(new models.AppSettings({ ...settings, defaultSessionTemplate: tmpl }));
                        }}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="xterm-256color">xterm-256color (推荐)</option>
                        <option value="xterm">xterm</option>
                        <option value="vt100">vt100</option>
                        <option value="vt220">vt220</option>
                        <option value="linux">linux</option>
                        <option value="ansi">ansi</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">默认字符集编码 (Encoding)</label>
                      <select 
                        value={(settings.defaultSessionTemplate?.encoding as string) || 'UTF-8'}
                        onChange={(e) => {
                          const tmpl = { ...(settings.defaultSessionTemplate || {}), encoding: e.target.value };
                          setSettings(new models.AppSettings({ ...settings, defaultSessionTemplate: tmpl }));
                        }}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="UTF-8">Unicode (UTF-8)</option>
                        <option value="GBK">简体中文 (GBK)</option>
                        <option value="GB18030">简体中文 (GB18030)</option>
                        <option value="BIG5">繁体中文 (Big5)</option>
                        <option value="EUC-JP">日文 (EUC-JP)</option>
                        <option value="EUC-KR">韩文 (EUC-KR)</option>
                        <option value="ISO-8859-1">西欧语言 (ISO-8859-1)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">默认配色主题 (Color Theme)</label>
                      <select 
                        value={(settings.defaultSessionTemplate?.overrideTheme as string) || ''}
                        onChange={(e) => {
                          const tmpl = { ...(settings.defaultSessionTemplate || {}), overrideTheme: e.target.value };
                          setSettings(new models.AppSettings({ ...settings, defaultSessionTemplate: tmpl }));
                        }}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="">跟随全局配色方案</option>
                        {Object.keys(THEMES).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">默认回滚历史行数</label>
                      <input 
                        type="number" 
                        value={Number(settings.defaultSessionTemplate?.overrideScrollback) || 10000}
                        onChange={(e) => {
                          const tmpl = { ...(settings.defaultSessionTemplate || {}), overrideScrollback: Number(e.target.value) };
                          setSettings(new models.AppSettings({ ...settings, defaultSessionTemplate: tmpl }));
                        }}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#2b2b2b] flex items-center justify-between">
                    <span className="text-[11px] text-[#858585]">
                      一键应用会将上述属性批量覆盖到全部现有会话中。
                    </span>
                    <button
                      type="button"
                      disabled={templateApplying}
                      onClick={async () => {
                        setTemplateApplying(true);
                        setTemplateSuccess('');
                        try {
                          const allSessions = await GetSessions();
                          if (allSessions && allSessions.length > 0) {
                            const tmpl = settings.defaultSessionTemplate || {};
                            const updated = allSessions.map(s => {
                              const c = new app.SessionConfig({ ...s });
                              if (tmpl.termType) c.termType = tmpl.termType as string;
                              if (tmpl.encoding) c.encoding = tmpl.encoding as string;
                              if (tmpl.overrideTheme !== undefined) c.overrideTheme = tmpl.overrideTheme as string;
                              if (tmpl.overrideScrollback) c.overrideScrollback = Number(tmpl.overrideScrollback);
                              return c;
                            });
                            await SaveSessionsBatch(updated);
                            setTemplateSuccess(`🎉 已成功将默认模板推送到全部 ${updated.length} 个会话！`);
                          }
                        } catch (err: any) {
                          console.error("Apply template failed:", err);
                        } finally {
                          setTemplateApplying(false);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-50 text-white font-medium text-xs rounded transition-all shadow-sm"
                    >
                      {templateApplying ? '正在批量应用...' : '一键应用模板到所有会话'}
                    </button>
                  </div>
                </div>

                {templateSuccess && (
                  <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-2.5 rounded-md">
                    {templateSuccess}
                  </p>
                )}
              </div>
  );
}

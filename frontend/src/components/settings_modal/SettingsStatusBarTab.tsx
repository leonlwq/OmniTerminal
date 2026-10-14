import React from 'react';
import { Sliders, Gauge, Clock, Zap, Terminal, Globe, Code, Link } from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsStatusBarTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
}

export function SettingsStatusBarTab({
  settings,
  setSettings,
}: SettingsStatusBarTabProps) {
  const { t } = useI18n();
  return (
              <div className="space-y-4">
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.statusBar.title') || '底部状态栏信息展示项 (Status Bar Display Items)'}
                  </h4>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.statusBarConfig?.showConnectionState ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({
                          ...settings,
                          statusBarConfig: { ...(settings.statusBarConfig || {}), showConnectionState: e.target.checked }
                        }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.statusBar.connectionState') || '连接状态指示灯 (🟢 在线 / 🔴 断开 / 🟡 重连中)'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.statusBarConfig?.showUptime ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({
                          ...settings,
                          statusBarConfig: { ...(settings.statusBarConfig || {}), showUptime: e.target.checked }
                        }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.statusBar.uptime') || '会话在线时长计时器 (如: 01:23:45)'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.statusBarConfig?.showTerminalSize ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({
                          ...settings,
                          statusBarConfig: { ...(settings.statusBarConfig || {}), showTerminalSize: e.target.checked }
                        }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.statusBar.terminalSize') || '当前终端行列尺寸 (如: 120 × 35)'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.statusBarConfig?.showEncoding ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({
                          ...settings,
                          statusBarConfig: { ...(settings.statusBarConfig || {}), showEncoding: e.target.checked }
                        }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.statusBar.encoding') || '字符集编码 (如: UTF-8 / GBK)'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.statusBarConfig?.showTraffic ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({
                          ...settings,
                          statusBarConfig: { ...(settings.statusBarConfig || {}), showTraffic: e.target.checked }
                        }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.statusBar.traffic') || '网络吞吐流量实时统计 (TX / RX 字节流速)'}</span>
                    </label>
                  </div>
                </div>
              </div>
  );
}

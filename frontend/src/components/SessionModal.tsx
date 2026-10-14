import { useI18n } from '../i18n/I18nContext';
import React from 'react';
import { 
  X, Server, Terminal, Key, Palette, FileText, Share2, Sparkles, Folder
} from 'lucide-react';
import { app, models } from '../../wailsjs/go/models';
import { SessionConnectionTab } from './session_modal/SessionConnectionTab';
import { SessionAuthTab } from './session_modal/SessionAuthTab';
import { SessionTerminalTab } from './session_modal/SessionTerminalTab';
import { SessionAppearanceTab } from './session_modal/SessionAppearanceTab';
import { SessionTunnelTab } from './session_modal/SessionTunnelTab';
import { SessionAuditTab } from './session_modal/SessionAuditTab';

interface SessionModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  modalMode: 'create' | 'edit';
  formData: any;
  setFormData: (data: any) => void;
  foldersOnly: app.SessionConfig[];
  sessions: app.SessionConfig[];
  handleSaveSession: (e: React.FormEvent) => void;
  sessionModalTab: string;
  setSessionModalTab: (tab: any) => void;
  getColorLabelClass: (colorStr: string | undefined, isConnected: boolean) => string;
  customThemes?: models.CustomThemeConfig[];
}

export function SessionModal({
  isModalOpen,
  setIsModalOpen,
  modalMode,
  formData,
  setFormData,
  foldersOnly,
  sessions,
  handleSaveSession,
  sessionModalTab,
  setSessionModalTab,
  getColorLabelClass,
  customThemes = [],
}: SessionModalProps) {
  const { t } = useI18n();
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] max-w-[780px] w-full flex flex-col h-[600px] overflow-hidden rounded-lg text-[#cccccc]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              {formData.isFolder ? <Folder className="w-4 h-4" /> : <Server className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#e0e0e0] leading-tight">
                {modalMode === 'create'
                  ? (formData.isFolder ? t('sessionModal.newFolder') : t('sessionModal.newSession'))
                  : (formData.isFolder ? t('sessionModal.renameFolder') : t('sessionModal.editSession'))}
              </h3>
              <span className="text-[11px] text-[#858585] font-normal">
                {formData.isFolder ? 'Folder Organization' : 'Session Properties & Parameters'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-[#858585] hover:text-white rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSaveSession} className="flex flex-col flex-1 overflow-hidden text-xs">

          {formData.isFolder ? (
            <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#1e1e1e]">
              <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
                  <Folder className="w-3.5 h-3.5 text-[#0078d4]" />
                  {t('sessionModal.folderBasicInfo')}
                </h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.folderName')}</label>
                    <input
                      type="text"
                      placeholder={t('sessionModal.folderNamePlaceholder')}
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.parentFolder')}</label>
                    <select
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
                    >
                      <option value="">{t('sessionModal.rootFolder')}</option>
                      {foldersOnly.map(f => (
                        f.id !== formData.id && (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        )
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 级联继承默认模板 */}
              <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-5 space-y-4 shadow-sm">
                <div className="border-b border-[#2b2b2b] pb-2.5">
                  <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('sessionModal.cascadeDefaults')}
                  </h4>
                  <p className="text-[10px] text-[#858585] pt-1">
                    {t('sessionModal.cascadeDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.defaultUserLabel') || '默认登录用户 (User)'}</label>
                    <input
                      type="text"
                      placeholder={t('sessionModal.defaultUserPlaceholder') || '如: root / ubuntu (留空不预设)'}
                      value={formData.user || ''}
                      onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.defaultPortLabel') || '默认端口 (Port)'}</label>
                    <input
                      type="number"
                      placeholder="22"
                      value={formData.port || 22}
                      onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.defaultJumpHost')}</label>
                    <select
                      value={formData.jumpHostSessionId || ''}
                      onChange={(e) => setFormData({ ...formData, jumpHostSessionId: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    >
                      <option value="">{t('sessionModal.directNoJump')}</option>
                      {sessions.filter(s => !s.isFolder && s.id !== formData.id).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.host}:{s.port})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.defaultEncoding')}</label>
                    <select
                      value={formData.encoding || 'utf-8'}
                      onChange={(e) => setFormData({ ...formData, encoding: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    >
                      <option value="utf-8">{t('sessionModal.charsetUtf8') || 'UTF-8 (Unicode 标准)'}</option>
                      <option value="gbk">{t('sessionModal.charsetGbk') || 'GBK (简体中文)'}</option>
                      <option value="gb2312">{t('sessionModal.charsetGb2312') || 'GB2312 (国标简中)'}</option>
                      <option value="big5">{t('sessionModal.charsetBig5') || 'Big5 (繁体中文)'}</option>
                      <option value="euc-kr">{t('sessionModal.charsetEucKr') || 'EUC-KR (韩文)'}</option>
                      <option value="shift-jis">{t('sessionModal.charsetShiftJis') || 'Shift-JIS (日文)'}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.defaultTheme')}</label>
                    <select
                      value={formData.overrideTheme || ''}
                      onChange={(e) => setFormData({ ...formData, overrideTheme: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    >
                      <option value="">{t('sessionModal.followGlobal')}</option>
                      {customThemes && customThemes.length > 0 && (
                        <optgroup label={t('sessionModal.customThemesGroup') || '🎨 自定义配色方案 (Custom Themes)'}>
                          {customThemes.map((t: any) => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={t('sessionModal.darkThemesGroup') || '🌙 暗黑极客主题 (Dark Themes)'}>
                        <option value="VS Code Dark Modern">{t('sessionModal.themeVsCode') || 'VS Code Dark Modern (官方默认)'}</option>
                        <option value="Classic Dark">{t('sessionModal.themeClassicDark') || 'Classic Dark (极客暗黑)'}</option>
                        <option value="Tokyo Night">{t('sessionModal.themeTokyoNight') || 'Tokyo Night (东京暗夜)'}</option>
                        <option value="Catppuccin Mocha">{t('sessionModal.themeCatppuccin') || 'Catppuccin Mocha (摩卡柔和)'}</option>
                        <option value="Nord">{t('sessionModal.themeNord') || 'Nord (北欧极光)'}</option>
                        <option value="One Dark Pro">{t('sessionModal.themeOneDark') || 'One Dark Pro (经典 Atom)'}</option>
                        <option value="Dracula">{t('sessionModal.themeDracula') || 'Dracula (德拉库拉)'}</option>
                        <option value="Monokai">{t('sessionModal.themeMonokai') || 'Monokai (复古原野)'}</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.defaultTermType')}</label>
                    <select
                      value={formData.termType || 'xterm-256color'}
                      onChange={(e) => setFormData({ ...formData, termType: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    >
                      <option value="xterm-256color">{t('sessionModal.termTypeRecommended') || 'xterm-256color (推荐)'}</option>
                      <option value="xterm">xterm</option>
                      <option value="vt100">vt100</option>
                      <option value="linux">linux</option>
                      <option value="ansi">ansi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              
              {/* Sidebar Tabs */}
              <div className="w-44 bg-[#181818] border-r border-[#2b2b2b] p-2 space-y-0.5 shrink-0 overflow-y-auto">
                <button 
                  type="button" 
                  onClick={() => setSessionModalTab('connection')} 
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                    sessionModalTab === 'connection' 
                      ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                      : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('sessionModal.tabConnection')}</span>
                </button>
                
                {(!formData.protocol || formData.protocol === 'ssh') && (
                  <button 
                    type="button" 
                    onClick={() => setSessionModalTab('auth')} 
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                      sessionModalTab === 'auth' 
                        ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                        : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('sessionModal.tabAuth')}</span>
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={() => setSessionModalTab('terminal')} 
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                    sessionModalTab === 'terminal' 
                      ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                      : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('sessionModal.tabTerminal')}</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => setSessionModalTab('appearance')} 
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                    sessionModalTab === 'appearance' 
                      ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                      : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('sessionModal.tabAppearance')}</span>
                </button>

                {(!formData.protocol || formData.protocol === 'ssh') && (
                  <button 
                    type="button" 
                    onClick={() => setSessionModalTab('tunnel')} 
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                      sessionModalTab === 'tunnel' 
                        ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                        : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('sessionModal.tabTunnel')}</span>
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={() => setSessionModalTab('audit')} 
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                    sessionModalTab === 'audit' 
                      ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                      : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('sessionModal.tabAudit')}</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e] space-y-4 text-xs text-[#cccccc]">
                
                {/* 1. Connection */}
                {sessionModalTab === "connection" && (
                  <SessionConnectionTab
                    formData={formData}
                    setFormData={setFormData}
                    foldersOnly={foldersOnly}
                    sessions={sessions}
                    getColorLabelClass={getColorLabelClass}
                  />
                )}

                {/* 2. Authentication */}
                {sessionModalTab === "auth" && (
                  <SessionAuthTab
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {/* 3. Terminal */}
                {sessionModalTab === "terminal" && (
                  <SessionTerminalTab
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {/* 4. Appearance */}
                {sessionModalTab === "appearance" && (
                  <SessionAppearanceTab
                    formData={formData}
                    setFormData={setFormData}
                    customThemes={customThemes}
                  />
                )}

                {/* 5. Tunnels */}
                {sessionModalTab === "tunnel" && (
                  <SessionTunnelTab
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

                {/* 6. Audit & Security */}
                {sessionModalTab === "audit" && (
                  <SessionAuditTab
                    formData={formData}
                    setFormData={setFormData}
                  />
                )}

              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2.5 px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] shrink-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-xs font-medium rounded text-[#cccccc] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] text-xs font-semibold rounded text-white transition-colors"
            >
              {t('sessionModal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

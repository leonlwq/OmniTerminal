import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Key, Lock, ArrowUpRight, CheckCircle2, Sliders, AlertTriangle, Check, X,
  Gauge, Clock, Zap 
} from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { ChangeMasterPassword, ExportBackup, ImportBackup } from '../../../wailsjs/go/app/App';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsSecurityTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
  onEnableMasterPassword: (pwd: string) => Promise<void>;
  onDisableMasterPassword: (pwd: string) => Promise<void>;
}

export function SettingsSecurityTab({
  settings,
  setSettings,
  onEnableMasterPassword,
  onDisableMasterPassword,
}: SettingsSecurityTabProps) {
  const { t } = useI18n();
  const [masterPwdInput, setMasterPwdInput] = useState('');
  const [masterPwdError, setMasterPwdError] = useState('');

  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  const [oldPwdInput, setOldPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');
  const [updatePwdError, setUpdatePwdError] = useState('');
  const [updatePwdSuccess, setUpdatePwdSuccess] = useState('');

  const handleUpdateMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatePwdError('');
    setUpdatePwdSuccess('');
    if (!oldPwdInput || !newPwdInput) return;

    if (newPwdInput.length < 4) {
      setUpdatePwdError(t('settings.security.pwdMinLength') || '主密码长度不能少于 4 位');
      return;
    }

    ChangeMasterPassword(oldPwdInput, newPwdInput)
      .then(() => {
        setUpdatePwdSuccess(t('settings.security.pwdUpdated') || '主密码已成功修改，本地所有会话已自动重密！');
        setOldPwdInput('');
        setNewPwdInput('');
      })
      .catch(err => {
        setUpdatePwdError(err.message || err || 'Failed to update master password');
      });
  };

  const [backupPwd, setBackupPwd] = useState('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupMode, setBackupMode] = useState<'export' | 'import'>('export');
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');

  const handleBackupActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBackupError('');
    setBackupSuccess('');
    if (!backupPwd.trim()) return;

    if (backupMode === 'export') {
      ExportBackup(backupPwd)
        .then((path) => {
          if (path) {
            setBackupSuccess(`${t('settings.security.backupSuccess') || '🎉 备份成功导出至: '} ${path}`);
            setBackupPwd('');
            setIsBackupModalOpen(false);
          } else {
            setBackupError(t('settings.security.backupCancelled') || '备份保存操作已被用户取消。');
          }
        })
        .catch((err) => {
          setBackupError(`Export backup failed: ${err.message || err}`);
        });
    } else {
      ImportBackup(backupPwd)
        .then(() => {
          setBackupSuccess(t('settings.security.restoreSuccess') || '🎉 成功解密并恢复了所有的会话及快捷指令集配置！');
          setBackupPwd('');
          setIsBackupModalOpen(false);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        })
        .catch((err) => {
          setBackupError(`Decryption and restore failed: ${err.message || err}`);
        });
    }
  };

  const handleEnableMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMasterPwdError('');
    if (!masterPwdInput.trim()) return;

    onEnableMasterPassword(masterPwdInput)
      .then(() => {
        setMasterPwdInput('');
      })
      .catch(err => {
        setMasterPwdError(err.message || String(err));
      });
  };

  const handleDisableMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMasterPwdError('');
    if (!masterPwdInput.trim()) return;

    onDisableMasterPassword(masterPwdInput)
      .then(() => {
        setMasterPwdInput('');
      })
      .catch(err => {
        setMasterPwdError(err.message || String(err));
      });
  };

  return (
    <>
              <div className="space-y-4">
                
                {/* 主密码状态 Card */}
                <div className={`p-4 rounded-md border flex items-start space-x-3.5 ${
                  settings.hasMasterPassword 
                    ? 'bg-[#252526] border-emerald-500/40 text-emerald-300' 
                    : 'bg-[#252526] border-amber-500/40 text-amber-300'
                }`}>
                  {settings.hasMasterPassword ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <h4 className="font-semibold text-xs text-[#cccccc]">
                      {settings.hasMasterPassword ? (t('settings.security.vaultEnabled') || '主密码安全保险箱：已启用 (AES-256-GCM)') : (t('settings.security.vaultDisabled') || '本地凭证保护：未启用 (明文存储)')}
                    </h4>
                    <p className="text-[11px] text-[#858585] leading-relaxed">
                      {t('settings.security.vaultDesc') || '启用主密码后，所有存储的服务器密码、私钥和凭证均基于 AES-256-GCM 高强度加密，启动或超时后需输入密码解锁。'}
                    </p>
                  </div>
                </div>

                {!settings.hasMasterPassword ? (
                  <form onSubmit={handleEnableMasterPassword} className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                    <h4 className="text-xs font-semibold text-[#cccccc]">{t('settings.security.enableProtection') || '开启主密码加密保护'}</h4>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="password"
                        placeholder={t('settings.security.newPwd') || '设置主密码 (至少 4 位)'}
                        value={masterPwdInput}
                        onChange={(e) => setMasterPwdInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                        required
                      />
                      <button 
                        type="submit"
                        className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium text-xs rounded transition-all shadow-sm"
                      >
                        {t('settings.security.enableNow') || '立即启用加密'}
                      </button>
                    </div>
                    {masterPwdError && <p className="text-xs text-red-400">{masterPwdError}</p>}
                  </form>
                ) : (
                  <form onSubmit={handleDisableMasterPassword} className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                    <h4 className="text-xs font-semibold text-[#cccccc]">{t('settings.security.disableProtection') || '关闭主密码保护'}</h4>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="password"
                        placeholder={t('settings.security.oldPwd') || '输入当前主密码以确认关闭'}
                        value={masterPwdInput}
                        onChange={(e) => setMasterPwdInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                        required
                      />
                      <button 
                        type="submit"
                        className="px-4 py-1.5 bg-[#f14c4c] hover:bg-[#d13b3b] text-white font-medium text-xs rounded transition-all shadow-sm"
                      >
                        {t('settings.security.disableNow') || '关闭密码保护'}
                      </button>
                    </div>
                    {masterPwdError && <p className="text-xs text-red-400">{masterPwdError}</p>}
                  </form>
                )}

                {settings.hasMasterPassword && (
                  <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                    <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#0078d4]" />
                      {t('settings.security.autoLockTitle') || '自动锁屏与密码修改'}
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.security.autoLockTimeout') || '闲置自动锁屏超时 (分钟，0 为禁用)'}</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.autoLockTimeoutMinutes || 0}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, autoLockTimeoutMinutes: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      />
                    </div>

                    <form onSubmit={handleUpdateMasterPassword} className="space-y-3 pt-2 border-t border-[#2b2b2b]">
                      <span className="text-[11px] font-medium text-[#858585]">{t('settings.security.changeMasterPwd') || '修改主密码'}</span>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="password"
                          placeholder={t('settings.security.oldPwd') || '原主密码'}
                          value={oldPwdInput}
                          onChange={(e) => setOldPwdInput(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                          required
                        />
                        <input 
                          type="password"
                          placeholder={t('settings.security.newPwd') || '新主密码 (至少 4 位)'}
                          value={newPwdInput}
                          onChange={(e) => setNewPwdInput(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                          required
                        />
                      </div>
                      {updatePwdError && <p className="text-xs text-red-400">{updatePwdError}</p>}
                      {updatePwdSuccess && <p className="text-xs text-emerald-400">{updatePwdSuccess}</p>}
                      <button 
                        type="submit"
                        className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-white font-medium text-xs transition-colors shadow-sm"
                      >
                        {t('settings.security.updatePwdBtn') || '更新主密码凭据'}
                      </button>
                    </form>
                  </div>
                )}

                {/* 备份与恢复 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.security.backupTitle') || '企业配置一键加密备份与安全迁移'}
                  </h4>
                  <p className="text-[11px] text-[#858585] leading-relaxed">
                    {t('settings.security.backupDesc') || '将会话结构树目录、连接凭据以及全局宏脚本与命令方案，以 AES-256-GCM 强加密打包导出或导入。'}
                  </p>
                  <div className="flex space-x-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBackupError('');
                        setBackupSuccess('');
                        setBackupMode('export');
                        setBackupPwd('');
                        setIsBackupModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded font-medium text-xs transition-all shadow-sm"
                    >
                      {t('settings.security.exportBackup') || '📤 导出加密备份包 (.xxsb)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBackupError('');
                        setBackupSuccess('');
                        setBackupMode('import');
                        setBackupPwd('');
                        setIsBackupModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] border border-[#3c3c3c] rounded font-medium text-xs transition-all shadow-sm"
                    >
                      {t('settings.security.importBackup') || '📥 解密恢复并导入'}
                    </button>
                  </div>
                  {backupSuccess && (
                    <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-2.5 rounded">
                      {backupSuccess}
                    </p>
                  )}
                  {backupError && (
                    <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/50 p-2.5 rounded">
                      {backupError}
                    </p>
                  )}
                </div>

                {/* 生产环境安全粘贴与高危拦截 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.security.safePasteTitle') || '生产环境安全粘贴与高危命令拦截防护 (Safe Paste & Guard)'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.enableSafePaste ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableSafePaste: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.security.safePasteCheck') || '多行文本粘贴安全审查确认'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.enableDangerousGuard ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableDangerousGuard: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.security.dangerousGuardCheck') || '高危命令正则强行拦截确认'}</span>
                    </label>
                  </div>

                  {/* 危险命令规则管理 */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-medium text-[#858585]">{t('settings.security.dangerousRulesTitle') || '高危命令拦截规则库'}</span>
                    <div className="border border-[#2b2b2b] rounded-md max-h-36 overflow-y-auto bg-[#1e1e1e] divide-y divide-[#2b2b2b]">
                      {(settings.dangerousRules || []).map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 text-xs">
                          <label className="flex items-center space-x-2.5 flex-1 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) => {
                                const rules = [...(settings.dangerousRules || [])];
                                rules[idx] = new models.DangerousCommandRule({ ...rule, enabled: e.target.checked });
                                setSettings(new models.AppSettings({ ...settings, dangerousRules: rules }));
                              }}
                              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-red-500 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span className="font-medium text-red-400">{rule.desc}</span>
                            <span className="font-mono text-[#858585] text-[10px] truncate max-w-xs">{rule.pattern}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const rules = (settings.dangerousRules || []).filter((_, i) => i !== idx);
                              setSettings(new models.AppSettings({ ...settings, dangerousRules: rules }));
                            }}
                            className="text-[#858585] hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 新增规则 */}
                    <div className="flex items-center space-x-2 pt-1">
                      <input 
                        type="text"
                        placeholder={t('settings.security.ruleDescPlaceholder') || '说明 (如: 危险删除)'}
                        value={newRuleDesc}
                        onChange={(e) => setNewRuleDesc(e.target.value)}
                        className="w-1/3 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      />
                      <input 
                        type="text"
                        placeholder={t('settings.security.rulePatternPlaceholder') || '正则 (如: \\brm\\s+-rf\\s+/)'}
                        value={newRulePattern}
                        onChange={(e) => setNewRulePattern(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newRulePattern.trim()) return;
                          const newRule = new models.DangerousCommandRule({
                            pattern: newRulePattern.trim(),
                            desc: newRuleDesc.trim() || newRulePattern.trim(),
                            enabled: true,
                          });
                          const rules = [...(settings.dangerousRules || []), newRule];
                          setSettings(new models.AppSettings({ ...settings, dangerousRules: rules }));
                          setNewRulePattern('');
                          setNewRuleDesc('');
                        }}
                        className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium rounded shadow-sm whitespace-nowrap"
                      >
                        {t('settings.security.addRuleBtn') || '+ 添加规则'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SecureCRT 风格：字符与行发送延时流控 (Inter-Character & Line Delay) */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-[#0078d4]" />
                      {t('settings.security.flowControlTitle') || '防丢包字符/行延时发送流控 (Inter-Character & Line Send Delay)'}
                    </span>
                    <span className="text-[11px] text-[#858585] font-normal">
                      SecureCRT Flow Control
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#858585] leading-relaxed">
                    {t('settings.security.flowControlDesc') || '在向网络交换机、路由器或串口设备批量粘贴大段命令时，逐字符或逐行插入微小延时，彻底防止低缓冲区设备吞字与丢配置。'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-md p-3 space-y-1.5">
                      <label className="text-xs font-semibold text-[#cccccc] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#3794ff]" />
                        {t('settings.security.charDelay') || '全局字符间延时 (Char Send Delay)'}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={settings.charSendDelayMs ?? 0}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, charSendDelayMs: Math.max(0, Number(e.target.value)) }))}
                          className="w-24 px-3 py-1.5 bg-[#252526] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs font-mono text-[#cccccc] outline-none text-right"
                        />
                        <span className="text-xs text-[#858585]">{t('settings.security.msUnit') || '毫秒 (0 = 不延时)'}</span>
                      </div>
                      <span className="text-[10px] text-[#858585] block">{t('settings.security.switchRecommend') || '推荐值: 交换机/串口建议设为 5~15ms'}</span>
                    </div>

                    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-md p-3 space-y-1.5">
                      <label className="text-xs font-semibold text-[#cccccc] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        {t('settings.security.lineDelay') || '全局行间回车延时 (Line Send Delay)'}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={0}
                          max={3000}
                          step={50}
                          value={settings.lineSendDelayMs ?? 0}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, lineSendDelayMs: Math.max(0, Number(e.target.value)) }))}
                          className="w-24 px-3 py-1.5 bg-[#252526] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs font-mono text-[#cccccc] outline-none text-right"
                        />
                        <span className="text-xs text-[#858585]">{t('settings.security.msUnit') || '毫秒 (0 = 不延时)'}</span>
                      </div>
                      <span className="text-[10px] text-[#858585] block">{t('settings.security.scriptRecommend') || '推荐值: 多行脚本建议设为 100~300ms'}</span>
                    </div>
                  </div>
                </div>
              </div>

      {/* 备份口令校验弹层 */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] border border-[#2b2b2b] rounded-md shadow-2xl max-w-sm w-full overflow-hidden text-[#cccccc]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
              <h3 className="text-xs font-semibold text-[#cccccc]">
                {backupMode === 'export' ? (t('settings.security.backupModalExportTitle') || '确认备份保护口令') : (t('settings.security.backupModalImportTitle') || '解密并导入备份数据')}
              </h3>
              <button 
                onClick={() => setIsBackupModalOpen(false)} 
                className="text-[#858585] hover:text-white rounded p-1 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleBackupActionSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5 text-xs">
                <label className="text-[11px] font-medium text-[#858585]">
                  {t('settings.security.backupPwdLabel') || '备份安全口令 *'}
                </label>
                <input 
                  type="password" 
                  placeholder={t('settings.security.backupPwdPlaceholder') || '请输入用于加密/解密备份的口令'}
                  value={backupPwd}
                  onChange={(e) => setBackupPwd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-[#858585] mt-1 leading-relaxed">
                  {backupMode === 'export' 
                    ? (t('settings.security.backupExportWarning') || '重要：导出的会话配置包将使用此口令进行 AES-256 加密，请妥善保存。') 
                    : (t('settings.security.backupImportWarning') || '请输入此备份包导出时设置的对应安全口令以完成解密。')}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2b2b2b] shrink-0 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsBackupModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#3c3c3c] bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc] transition-colors font-medium"
                >
                  {t('common.cancel') || '取消'}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-white transition-all shadow-sm font-medium"
                >
                  {backupMode === 'export' ? (t('settings.security.confirmExport') || '确认并导出') : (t('settings.security.confirmImport') || '确认并导入')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

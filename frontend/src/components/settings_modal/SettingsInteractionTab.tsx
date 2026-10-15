import React, { useState } from 'react';
import { 
  Sliders, ShieldAlert, Plus, X, Trash2, Gauge, AlertTriangle, Keyboard,
  Command, Folder, Link, Table, Sparkles, Code, Highlighter, RotateCcw 
} from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { useI18n } from '../../i18n/I18nContext';
import { DEFAULT_HIGHLIGHT_RULES } from '../../constants/defaultHighlightRules';

interface SettingsInteractionTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
  onOpenKeybindingManager?: () => void;
  onClose?: () => void;
}

export function SettingsInteractionTab({
  settings,
  setSettings,
  onOpenKeybindingManager,
  onClose,
}: SettingsInteractionTabProps) {
  const { t } = useI18n();
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  // 高亮规则状态管理
  const [newHighlightName, setNewHighlightName] = useState('');
  const [newHighlightPattern, setNewHighlightPattern] = useState('');
  const [newHighlightColor, setNewHighlightColor] = useState('#f14c4c');
  const [newHighlightBgColor, setNewHighlightBgColor] = useState('');
  const [newHighlightIgnoreCase, setNewHighlightIgnoreCase] = useState(true);
  const [newHighlightShowInRuler, setNewHighlightShowInRuler] = useState(false);

  const activeHighlightRules = (settings.highlightRules && settings.highlightRules.length > 0)
    ? settings.highlightRules
    : DEFAULT_HIGHLIGHT_RULES;

  const handleToggleHighlightRule = (index: number) => {
    const updated = activeHighlightRules.map((r, i) => {
      if (i === index) {
        return { ...r, enabled: !r.enabled };
      }
      return r;
    });
    setSettings(new models.AppSettings({ ...settings, highlightRules: updated as any }));
  };

  const handleDeleteHighlightRule = (index: number) => {
    const updated = activeHighlightRules.filter((_, i) => i !== index);
    setSettings(new models.AppSettings({ ...settings, highlightRules: updated as any }));
  };

  const handleAddHighlightRule = () => {
    if (!newHighlightPattern.trim()) return;
    const newRule: any = {
      id: `custom_${Date.now()}`,
      name: newHighlightName.trim() || newHighlightPattern.trim(),
      pattern: newHighlightPattern.trim(),
      color: newHighlightColor,
      bgColor: newHighlightBgColor.trim() || undefined,
      category: 'custom',
      enabled: true,
      ignoreCase: newHighlightIgnoreCase,
      showInRuler: newHighlightShowInRuler,
    };
    const updated = [...activeHighlightRules, newRule];
    setSettings(new models.AppSettings({ ...settings, highlightRules: updated as any }));
    setNewHighlightName('');
    setNewHighlightPattern('');
  };

  const handleResetHighlightRules = () => {
    setSettings(new models.AppSettings({ ...settings, highlightRules: DEFAULT_HIGHLIGHT_RULES as any }));
  };

  return (
              <div className="space-y-4">
                
                {/* 动态智能高亮 Card (对标 WindTerm/MobaXterm) */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                      <Highlighter className="w-3.5 h-3.5 text-[#0078d4]" />
                      <span>{t('settings.interaction.highlightTitle') || '动态智能高亮规则 (Dynamic Highlight Rules)'}</span>
                      <span className="text-[10px] bg-[#0078d4]/15 text-[#3794ff] px-1.5 py-0.5 rounded border border-[#0078d4]/30 font-normal">
                        Auto Out-of-the-box
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleResetHighlightRules}
                      className="text-[11px] text-[#858585] hover:text-[#cccccc] flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-[#1e1e1e]"
                      title={t('settings.interaction.resetHighlightRules') || '重置为内置默认规则'}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('settings.interaction.resetDefault') || '恢复默认'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[#858585] leading-relaxed">
                    {t('settings.interaction.highlightDesc') || '无需配置即可自动在终端输出中识别并高亮 IP 地址、ERROR/WARN 告警、时间戳、文件路径等关键要素，基于 WebGL 硬件加速零开销渲染，复制文本不含转义码乱码。'}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={(settings as any).enableHighlightRules !== false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableHighlightRules: e.target.checked } as any))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-xs text-[#cccccc]">{t('settings.interaction.enableHighlight') || '启用智能终端高亮引擎'}</div>
                        <div className="text-[10px] text-[#858585]">{t('settings.interaction.enableHighlightSub') || '自动在 Normal Buffer 中渲染语法与关键词高亮'}</div>
                      </div>
                    </label>

                    <div className="flex items-center justify-between p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] text-xs text-[#858585]">
                      <div className="space-y-0.5">
                        <div className="text-[#cccccc]">{t('settings.interaction.highlightTotalRules') || '当前激活规则数'}</div>
                        <div className="text-[10px]">
                          {activeHighlightRules.filter(r => r.enabled).length} / {activeHighlightRules.length} {t('settings.interaction.rulesUnit') || '条规则生效中'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#89d185] bg-[#89d185]/10 px-2 py-0.5 rounded border border-[#89d185]/20">
                        <span>● GPU 加速</span>
                      </div>
                    </div>
                  </div>

                  {(settings as any).enableHighlightRules !== false && (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                      {/* 规则列表 */}
                      <div className="border border-[#2b2b2b] rounded bg-[#181818] overflow-hidden">
                        <div className="max-h-56 overflow-y-auto divide-y divide-[#222222]">
                          {activeHighlightRules.map((rule, idx) => (
                            <div 
                              key={rule.id || idx}
                              className={`flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                                rule.enabled ? 'bg-[#181818] hover:bg-[#1f1f1f]' : 'bg-[#161616] opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                                <input 
                                  type="checkbox"
                                  checked={rule.enabled}
                                  onChange={() => handleToggleHighlightRule(idx)}
                                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5 shrink-0 cursor-pointer"
                                />
                                <span 
                                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 font-medium ${
                                    rule.category === 'severity' ? 'bg-red-900/30 text-red-400 border border-red-700/30' :
                                    rule.category === 'network' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-700/30' :
                                    rule.category === 'timestamp' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30' :
                                    rule.category === 'path' ? 'bg-amber-900/30 text-amber-300 border border-amber-700/30' :
                                    rule.category === 'http' ? 'bg-orange-900/30 text-orange-400 border border-orange-700/30' :
                                    'bg-purple-900/30 text-purple-400 border border-purple-700/30'
                                  }`}
                                >
                                  {rule.category || 'custom'}
                                </span>
                                <span className="font-medium text-[#cccccc] truncate text-xs min-w-[110px]">
                                  {rule.name}
                                </span>
                                <span className="font-mono text-[11px] text-[#858585] truncate max-w-[220px]" title={rule.pattern}>
                                  {rule.pattern}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {/* 颜色指示胶囊 */}
                                <div 
                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#3c3c3c] text-[11px] font-mono shadow-inner"
                                  style={{
                                    color: rule.color,
                                    backgroundColor: rule.bgColor || '#1e1e1e'
                                  }}
                                >
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rule.color }} />
                                  <span>{rule.color}</span>
                                </div>

                                {/* 标尺显示指示器 */}
                                {rule.showInRuler && (
                                  <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/40 px-1 rounded" title="在滚动条迷你标尺上高亮">
                                    Ruler
                                  </span>
                                )}

                                {/* 删除自定义规则 */}
                                {rule.category === 'custom' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHighlightRule(idx)}
                                    className="p-1 text-[#858585] hover:text-[#f14c4c] transition-colors"
                                    title={t('common.delete') || '删除此规则'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 添加自定义规则表单 */}
                      <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] space-y-2.5">
                        <div className="text-[11px] font-semibold text-[#cccccc] flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-[#0078d4]" />
                          <span>{t('settings.interaction.addCustomRule') || '添加自定义高亮规则'}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <input 
                            type="text"
                            value={newHighlightName}
                            onChange={(e) => setNewHighlightName(e.target.value)}
                            placeholder={t('settings.interaction.ruleNamePlaceholder') || '规则名称 (可选)'}
                            className="col-span-3 px-2.5 py-1 bg-[#252526] border border-[#3c3c3c] rounded text-xs text-[#cccccc] outline-none focus:border-[#0078d4]"
                          />
                          <input 
                            type="text"
                            value={newHighlightPattern}
                            onChange={(e) => setNewHighlightPattern(e.target.value)}
                            placeholder={t('settings.interaction.patternPlaceholder') || '正则表达式或关键字 (如 \\btoken=[\\w-]+\\b)'}
                            className="col-span-5 px-2.5 py-1 bg-[#252526] border border-[#3c3c3c] rounded font-mono text-xs text-[#cccccc] outline-none focus:border-[#0078d4]"
                          />
                          <div className="col-span-4 flex items-center gap-1.5">
                            <input 
                              type="color"
                              value={newHighlightColor}
                              onChange={(e) => setNewHighlightColor(e.target.value)}
                              className="w-7 h-7 rounded border border-[#3c3c3c] bg-[#252526] cursor-pointer p-0.5 shrink-0"
                              title="选择高亮文字颜色"
                            />
                            <div className="flex items-center gap-1">
                              {['#f14c4c', '#e5c07b', '#89d185', '#4ec9b0', '#c678dd', '#61afef'].map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setNewHighlightColor(c)}
                                  className="w-3.5 h-3.5 rounded-full border border-black/40 transition-transform hover:scale-125 shrink-0"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleAddHighlightRule}
                              disabled={!newHighlightPattern.trim()}
                              className="ml-auto px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-40 disabled:hover:bg-[#0078d4] text-white text-xs font-medium rounded transition-colors shrink-0"
                            >
                              {t('common.add') || '添加'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-0.5 text-[11px] text-[#858585]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={newHighlightIgnoreCase}
                              onChange={(e) => setNewHighlightIgnoreCase(e.target.checked)}
                              className="rounded border-[#3c3c3c] bg-[#252526] text-[#0078d4] w-3.5 h-3.5"
                            />
                            <span>{t('settings.interaction.ignoreCase') || '忽略大小写 (Ignore Case)'}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={newHighlightShowInRuler}
                              onChange={(e) => setNewHighlightShowInRuler(e.target.checked)}
                              className="rounded border-[#3c3c3c] bg-[#252526] text-[#0078d4] w-3.5 h-3.5"
                            />
                            <span>{t('settings.interaction.showInRuler') || '在右侧滚动条标尺标记 (Overview Ruler)'}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 鼠标行为 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.mouseTitle') || '鼠标行为定制 (Mouse Interaction)'}
                  </h4>
                  
                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={settings.copyOnSelect ?? false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, copyOnSelect: e.target.checked }))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <span className="text-xs text-[#cccccc]">{t('settings.interaction.copyOnSelect') || '鼠标选区即复制 (释放鼠标选区时自动复制至系统剪贴板)'}</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).showCommandDuration !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, showCommandDuration: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">{t('settings.interaction.commandDuration') || '显示命令执行耗时微标注 (Command Duration Annotation)'}</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.commandDurationDesc') || '在终端右下角自动标注上一条命令的执行耗时与完成时间戳（如 2.3s [14:20:15]）'}</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).highlightHyperlinks !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, highlightHyperlinks: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">{t('settings.interaction.highlightLinks') || '自动识别并高亮终端超链接 (Hyperlink Detection)'}</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.highlightLinksDesc') || '终端输出中的 URL 与 IP 地址鼠标悬停高亮，点击可在默认浏览器中直接打开'}</div>
                    </div>
                  </label>

                  {/* Phase 8 (25.4.3): 终端视口 Mini 服务器硬件遥测小部件 */}
                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).enableMiniTelemetry !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableMiniTelemetry: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">{t('settings.interaction.miniTelemetry') || '终端视口右上角 Mini 服务器硬件遥测胶囊 (Mini Telemetry Widget)'}</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.miniTelemetryDesc') || '实时显示远程服务器的 CPU%、内存占比、网络下行速率与健康呼吸灯，点击可展开微图表或直达监控大屏'}</div>
                    </div>
                  </label>

                  {(settings as any).enableMiniTelemetry !== false && (
                    <div className="flex items-center justify-between p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c]">
                      <div>
                        <div className="text-xs text-[#cccccc]">{t('settings.interaction.miniTelemetryInterval') || 'Mini 遥测采样周期'}</div>
                        <div className="text-[10px] text-[#858585]">{t('settings.interaction.miniTelemetryIntervalDesc') || '配置后台轻量获取 CPU/内存/网络指标的时间间隔'}</div>
                      </div>
                      <select
                        value={(settings as any).miniTelemetryIntervalSec || 3}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, miniTelemetryIntervalSec: Number(e.target.value) } as any))}
                        className="px-2.5 py-1.5 bg-[#252526] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={2}>{t('settings.interaction.interval2s') || '2 秒 (极速响应)'}</option>
                        <option value={3}>{t('settings.interaction.interval3s') || '3 秒 (推荐平衡)'}</option>
                        <option value={5}>{t('settings.interaction.interval5s') || '5 秒 (低负载)'}</option>
                        <option value={10}>{t('settings.interaction.interval10s') || '10 秒 (省流节能)'}</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.rightClick') || '鼠标右键行为'}</label>
                      <select 
                        value={settings.rightClickAction || 'contextMenu'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, rightClickAction: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="contextMenu">{t('settings.interaction.rightClickContextMenu') || '弹出右键菜单 (Context Menu)'}</option>
                        <option value="paste">{t('settings.interaction.rightClickPaste') || '直接粘贴剪切板 (Paste directly)'}</option>
                        <option value="none">{t('settings.interaction.rightClickNone') || '无动作 (None)'}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.doubleClick') || '鼠标双击行为'}</label>
                      <select 
                        value={settings.doubleClickAction || 'selectWord'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, doubleClickAction: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="selectWord">{t('settings.interaction.doubleClickSelectWord') || '智能选择当前单词/路径 (Select Word)'}</option>
                        <option value="copy">{t('settings.interaction.doubleClickCopy') || '选择并直接复制 (Select & Copy)'}</option>
                        <option value="none">{t('settings.interaction.rightClickNone') || '无动作 (None)'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.wordSeparators') || '双击选词分词边界符号 (Word Separators)'}</label>
                    <input 
                      type="text"
                      value={settings.wordSeparators ?? ` ~!@#$%^&*()=+[{]}\\|;:'",<>?`}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, wordSeparators: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded font-mono text-xs text-[#cccccc] outline-none"
                      placeholder={` ~!@#$%^&*()=+[{]}\\|;:'",<>?`}
                    />
                    <p className="text-[10px] text-[#858585] leading-relaxed">
                      {t('settings.interaction.wordSeparatorsDesc') || '包含在此字符串中的字符将在双击选词时作为分隔符截断（例如包含点号则双击只选 IP 的一段，不包含则选取整段 IP）。'}
                    </p>
                  </div>
                </div>

                {/* 键盘与快捷交互 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Command className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.keyboardTitle') || '键盘与快捷键兼容性 (Keyboard & Shortcuts)'}
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.useAltAsMeta ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, useAltAsMeta: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.interaction.altAsMeta') || '将 Alt / Option 作为 Meta 键发送 ESC 前缀 (支持 Vim / Emacs / Readline 快捷键，如 Alt+B/F)'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.openLinksOnClick ?? false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, openLinksOnClick: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.interaction.openLinksOnClick') || '终端超链接单击直接打开 (关闭时需按住 Cmd / Ctrl + 单击打开)'}</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.enableBell ?? false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableBell: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">{t('settings.interaction.enableBell') || '启用终端声音提醒 (Bell Sound)'}</span>
                    </label>
                  </div>
                </div>

                {/* 外部编辑器集成 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.externalEditorTitle') || '外部编辑器与工作区恢复'}
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.externalEditor') || '外部编辑器选择 (双击远程文件时调用)'}</label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={['', 'code', 'cursor', 'subl'].includes(settings.externalEditorPath || '') ? (settings.externalEditorPath || '') : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') {
                            setSettings(new models.AppSettings({ ...settings, externalEditorPath: e.target.value }));
                          }
                        }}
                        className="w-48 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="">{t('settings.interaction.systemDefault') || '系统默认程序 (System Default)'}</option>
                        <option value="code">Visual Studio Code (code)</option>
                        <option value="cursor">Cursor (cursor)</option>
                        <option value="subl">Sublime Text (subl)</option>
                        <option value="custom">{t('settings.interaction.customPath') || '自定义程序路径 (Custom Path)'}</option>
                      </select>
                      <input 
                        type="text"
                        value={settings.externalEditorPath ?? ''}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, externalEditorPath: e.target.value }))}
                        className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded font-mono text-xs text-[#cccccc] outline-none"
                        placeholder="e.g.: code, cursor, subl, /usr/local/bin/code"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.conflictStrategy') || '同名文件传输冲突策略'}</label>
                      <select 
                        value={settings.fileConflictStrategy || 'ask'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fileConflictStrategy: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="ask">{t('settings.interaction.conflictAsk') || '每次询问 (Ask every time)'}</option>
                        <option value="overwrite">{t('settings.interaction.conflictOverwrite') || '直接覆盖 (Overwrite)'}</option>
                        <option value="skip">{t('settings.interaction.conflictSkip') || '跳过已存在 (Skip)'}</option>
                        <option value="resume">{t('settings.interaction.conflictResume') || '断点续传/追加 (Resume)'}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={settings.autoRestoreWorkspace ?? true}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, autoRestoreWorkspace: e.target.checked }))}
                          className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                        />
                        <span className="text-xs text-[#cccccc]">{t('settings.interaction.autoRestoreWorkspace') || '启动时自动恢复上次会话与工作区'}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 24.1.1 & 24.1.5: OSC 52 远程剪贴板同步 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Command className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.osc52Title') || 'OSC 52 远程剪贴板双向同步 (Remote Clipboard Sync)'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.osc52Mode') || 'OSC 52 运行模式'}</label>
                      <select 
                        value={(settings as any).osc52Mode || 'write'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, osc52Mode: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="write">{t('settings.interaction.osc52Write') || '仅写入本地剪贴板 (Write-only, 推荐)'}</option>
                        <option value="readwrite">{t('settings.interaction.osc52ReadWrite') || '双向读写同步 (Read-Write)'}</option>
                        <option value="disabled">{t('settings.interaction.osc52Disabled') || '完全禁用 (Disabled)'}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.osc52Payload') || '最大载荷限制 (Max Payload)'}</label>
                      <select 
                        value={(settings as any).osc52MaxBytes || 102400}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, osc52MaxBytes: Number(e.target.value) } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={51200}>50 KB</option>
                        <option value={102400}>100 KB (Default)</option>
                        <option value={524288}>512 KB</option>
                        <option value={1048576}>1 MB</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).osc52ShowToast !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, osc52ShowToast: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">{t('settings.interaction.osc52Toast') || '远程剪贴板同步 Toast 提示 (Sync Toast Notification)'}</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.osc52ToastDesc') || '当远端 tmux / vim 通过 OSC 52 写入本地剪贴板时弹出淡色同步反馈浮标'}</div>
                    </div>
                  </label>
                </div>

                {/* 24.1.2: SSH 连接池 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.sshPoolTitle') || 'SSH 连接复用与智能连接池 (Connection Multiplexing & Pool)'}
                  </h4>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).enableSshConnectionPool !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableSshConnectionPool: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">{t('settings.interaction.sshMultiplex') || '启用 SSH 多通道连接复用 (OpenSSH Multiplexing)'}</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.sshMultiplexDesc') || '同一主机的多个终端 Tab 复用已建立的物理 TCP 链路，毫秒级开启新会话，大幅节约握手资源'}</div>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.idleTimeout') || '空闲释放倒计时 (Idle Timeout)'}</label>
                      <select 
                        value={(settings as any).sshPoolIdleTimeoutSec || 300}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, sshPoolIdleTimeoutSec: Number(e.target.value) } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={60}>1 min (60s)</option>
                        <option value={300}>5 min (300s)</option>
                        <option value={600}>10 min (600s)</option>
                        <option value={1800}>30 min (1800s)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">{t('settings.interaction.maxPoolSize') || '连接池最大主机容量 (Max Pool Size)'}</label>
                      <select 
                        value={(settings as any).sshPoolMaxSize || 50}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, sshPoolMaxSize: Number(e.target.value) } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={20}>20 {t('settings.interaction.hostsUnit') || '台独立主机'}</option>
                        <option value={50}>50 {t('settings.interaction.hostsUnit') || '台独立主机'}</option>
                        <option value={100}>100 {t('settings.interaction.hostsUnit') || '台独立主机'}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 24.1.7: 智能结构化渲染 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Table className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.structuredOutputTitle') || '终端输出语义化解析 (Structured Output Rendering)'}
                  </h4>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={Boolean((settings as any).enableStructuredOutput)}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableStructuredOutput: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">Structured Table & JSON Rendering</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.structuredOutputDesc') || '自动检测 docker ps / kubectl get 等等宽表格与 JSON 数据块，在终端右上角浮现交互式结构化视图'}</div>
                    </div>
                  </label>
                </div>

                {/* 24.1.4: 快捷键重映射 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                      <Keyboard className="w-3.5 h-3.5 text-[#0078d4]" />
                      {t('settings.interaction.keybindingManagerTitle') || '快捷键可视化管理与冲突检测 (Keybinding Manager)'}
                    </h4>
                    <p className="text-[11px] text-[#858585] mt-1">
                      {t('settings.interaction.keybindingDesc') || '自定义全系统快捷键映射，具备实时冲突碰撞检测与一键按键录制'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenKeybindingManager) {
                        onClose?.();
                        onOpenKeybindingManager();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-xs font-medium text-white transition-colors"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>{t('settings.interaction.configKeybindings') || '配置快捷键'}</span>
                  </button>
                </div>

                {/* 24.2.1: Warp 结构化命令块模式 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.commandBlockTitle') || 'Warp 风格结构化命令块交互 (Command Block Interaction)'}
                  </h4>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c]">
                    <div>
                      <div className="text-xs text-[#cccccc]">{t('settings.interaction.commandBlockDefault') || '默认终端呈现模式'}</div>
                      <div className="text-[10px] text-[#858585]">{t('settings.interaction.commandBlockDesc') || '将终端交互流识别为独立 Command Block，提供块级复制、长输出折叠与 AI 诊断'}</div>
                    </div>
                    <select
                      value={(settings as any).commandBlockMode || 'off'}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, commandBlockMode: e.target.value } as any))}
                      className="bg-[#1e1e1e] text-xs text-[#cccccc] border border-[#3c3c3c] rounded px-2.5 py-1 focus:outline-none focus:border-[#0078d4]"
                    >
                      <option value="off">{t('settings.interaction.classicStream') || '传统流式终端 (Classic Stream)'}</option>
                      <option value="on">{t('settings.interaction.modernBlocks') || 'Warp 命令块模式 (Modern Blocks)'}</option>
                    </select>
                  </div>
                </div>

                {/* 24.2.8: Quake 下拉模式动画时长 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.quakeAnimationTitle') || 'Quake 下拉模式动画与弹性阻尼 (Enhanced Quake Dropdown)'}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#cccccc]">{t('settings.interaction.springEasing') || '滑入动画过渡时长 (Spring Easing):'}</span>
                      <span className="font-mono text-[#0078d4]">{(settings as any).quakeAnimationDurationMs || 250} ms</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={600}
                      step={25}
                      value={(settings as any).quakeAnimationDurationMs || 250}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, quakeAnimationDurationMs: Number(e.target.value) } as any))}
                      className="w-full accent-[#0078d4] h-1.5 bg-[#181818] border border-[#3c3c3c] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 24.2.2: 内置 Monaco 代码编辑器配置 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-[#0078d4]" />
                    {t('settings.interaction.monacoTitle') || '远程文件内置 Monaco 编辑器偏好 (Monaco Code Editor)'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[#858585] text-[11px]">{t('settings.interaction.monacoFontSize') || '编辑器字号:'}</span>
                      <select
                        value={(settings as any).monacoFontSize || 13}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, monacoFontSize: Number(e.target.value) } as any))}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] rounded px-2 py-1 outline-none focus:border-[#0078d4]"
                      >
                        {[11, 12, 13, 14, 15, 16, 18].map(sz => (
                          <option key={sz} value={sz}>{sz} px</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[#858585] text-[11px]">{t('settings.interaction.monacoTabSpaces') || 'Tab 缩进空格数:'}</span>
                      <select
                        value={(settings as any).monacoTabSize || 2}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, monacoTabSize: Number(e.target.value) } as any))}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] rounded px-2 py-1 outline-none focus:border-[#0078d4]"
                      >
                        <option value={2}>2 {t('settings.interaction.spacesUnit') || '空格'}</option>
                        <option value={4}>4 {t('settings.interaction.spacesUnit') || '空格'}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
  );
}

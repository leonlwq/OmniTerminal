import React, { useState } from 'react';
import { Globe, Palette, Sparkles, Trash2, X, Plus, Sliders, Check, Terminal, Image, Upload, Download, RotateCcw } from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { ImportColorScheme } from '../../../wailsjs/go/app/App';
import { useI18n } from '../../i18n/I18nContext';
import { THEMES } from '../TerminalInstance';
import { ThemePreviewGallery } from './ThemePreviewGallery';
import { LiveFontPreview } from './LiveFontPreview';

// 检测操作系统本地是否已安装指定字体
const checkFontInstalled = (fontName: string): boolean => {
  try {
    if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.check === 'function') {
      return document.fonts.check(`14px "${fontName}"`);
    }
  } catch (e) {}
  return false;
};

interface SettingsAppearanceTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
  onSaveSettings: (e: React.FormEvent) => void;
}

export function SettingsAppearanceTab({
  settings,
  setSettings,
  onSaveSettings,
}: SettingsAppearanceTabProps) {
  const { lang, setLang } = useI18n();

  const [isCustomThemeModalOpen, setIsCustomThemeModalOpen] = useState(false);
  const [customThemeNameInput, setCustomThemeNameInput] = useState('');
  const [themeStatusMessage, setThemeStatusMessage] = useState('');

  const activeThemeName = settings.themeName || 'Classic Dark';
  const customThemeList = settings.customThemes || [];
  const isCustomTheme = customThemeList.some(t => t.name === activeThemeName);
  const currentCustomTheme = customThemeList.find(t => t.name === activeThemeName);
  const currentThemeObj = currentCustomTheme || THEMES[activeThemeName] || THEMES["Classic Dark"];

  const handleColorChange = (key: string, newHex: string) => {
    if (isCustomTheme) {
      const updatedList = customThemeList.map(t => {
        if (t.name === activeThemeName) {
          return new models.CustomThemeConfig({ ...t, [key]: newHex });
        }
        return t;
      });
      setSettings(new models.AppSettings({ ...settings, customThemes: updatedList }));
    } else {
      const baseName = `${activeThemeName} (Custom)`;
      const forked = new models.CustomThemeConfig({
        ...THEMES[activeThemeName],
        name: baseName,
        [key]: newHex,
      });
      const updatedList = [...customThemeList.filter(t => t.name !== baseName), forked];
      setSettings(new models.AppSettings({ ...settings, themeName: baseName, customThemes: updatedList }));
    }
  };

  const handleSaveAsCustomTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customThemeNameInput.trim()) return;
    const name = customThemeNameInput.trim();
    const newTheme = new models.CustomThemeConfig({
      ...currentThemeObj,
      name: name,
    });
    const updatedList = [...customThemeList.filter(t => t.name !== name), newTheme];
    setSettings(new models.AppSettings({ ...settings, themeName: name, customThemes: updatedList }));
    setIsCustomThemeModalOpen(false);
    setCustomThemeNameInput('');
    setThemeStatusMessage(`已成功保存自定义主题: ${name}`);
    setTimeout(() => setThemeStatusMessage(''), 3000);
  };

  const handleDeleteCustomTheme = (name: string) => {
    const updatedList = customThemeList.filter(t => t.name !== name);
    setSettings(new models.AppSettings({
      ...settings,
      themeName: settings.themeName === name ? 'Classic Dark' : settings.themeName,
      customThemes: updatedList
    }));
    setThemeStatusMessage(`已删除主题: ${name}`);
    setTimeout(() => setThemeStatusMessage(''), 3000);
  };

  const handleImportTheme = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let imported: any;
      try {
        imported = await ImportColorScheme(text);
      } catch (err: any) {
        imported = JSON.parse(text);
      }
      if (!imported || (!imported.background && !imported.foreground)) {
        throw new Error('未识别出有效的主题颜色定义');
      }
      let themeName = imported.name;
      if (!themeName || themeName === 'Imported Theme') {
        themeName = file.name.replace(/\.[^/.]+$/, "") || 'Imported Theme';
      }
      let uniqueName = themeName;
      let counter = 1;
      while (customThemeList.some(t => t.name === uniqueName)) {
        uniqueName = `${themeName} (${counter++})`;
      }
      const newCustomTheme = new models.CustomThemeConfig({
        ...imported,
        name: uniqueName,
      });
      const updatedList = [...customThemeList, newCustomTheme];
      setSettings(new models.AppSettings({
        ...settings,
        themeName: uniqueName,
        customThemes: updatedList,
      }));
      setThemeStatusMessage(`已成功导入主题: ${uniqueName}`);
      setTimeout(() => setThemeStatusMessage(''), 3000);
    } catch (err: any) {
      console.error('Import theme failed:', err);
      alert(`导入主题失败: ${err?.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportTheme = () => {
    try {
      const themeData = {
        name: activeThemeName,
        background: currentThemeObj.background,
        foreground: currentThemeObj.foreground,
        cursor: currentThemeObj.cursor,
        cursorAccent: currentThemeObj.cursorAccent,
        selectionBackground: currentThemeObj.selectionBackground,
        selectionForeground: currentThemeObj.selectionForeground,
        black: currentThemeObj.black,
        red: currentThemeObj.red,
        green: currentThemeObj.green,
        yellow: currentThemeObj.yellow,
        blue: currentThemeObj.blue,
        magenta: currentThemeObj.magenta || (currentThemeObj as any).purple,
        cyan: currentThemeObj.cyan,
        white: currentThemeObj.white,
        brightBlack: currentThemeObj.brightBlack,
        brightRed: currentThemeObj.brightRed,
        brightGreen: currentThemeObj.brightGreen,
        brightYellow: currentThemeObj.brightYellow,
        brightBlue: currentThemeObj.brightBlue,
        brightMagenta: currentThemeObj.brightMagenta || (currentThemeObj as any).brightPurple,
        brightCyan: currentThemeObj.brightCyan,
        brightWhite: currentThemeObj.brightWhite,
      };
      const jsonStr = JSON.stringify(themeData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeThemeName.replace(/[\/\?<>\\:\*\|"]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setThemeStatusMessage(`已导出主题: ${activeThemeName}`);
      setTimeout(() => setThemeStatusMessage(''), 3000);
    } catch (err: any) {
      console.error('Export theme failed:', err);
      alert(`导出主题失败: ${err?.message || err}`);
    }
  };

  return (
    <>
              <form onSubmit={onSaveSettings} className="space-y-4">
                
                {/* 语言与主题 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#0078d4]" />
                    语言与调色主题
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">界面显示语言</label>
                      <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="zh-CN">🇨🇳 简体中文 (zh-CN)</option>
                        <option value="en-US">🇺🇸 English (en-US)</option>
                        <option value="ja-JP">🇯🇵 日本語 (ja-JP)</option>
                        <option value="ko-KR">🇰🇷 한국어 (ko-KR)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">界面外观模式</label>
                      <select
                        value={(settings as any).appThemeMode || 'dark'}
                        onChange={(e) => {
                          const newMode = e.target.value;
                          let newThemeName = settings.themeName;
                          if (newMode === 'light' && (!newThemeName || newThemeName === 'Classic Dark' || newThemeName === 'Tokyo Night')) {
                            newThemeName = 'GitHub Light';
                          } else if (newMode === 'dark' && (newThemeName === 'GitHub Light' || newThemeName === 'Catppuccin Latte')) {
                            newThemeName = 'Classic Dark';
                          }
                          setSettings(new models.AppSettings({ ...settings, appThemeMode: newMode, themeName: newThemeName } as any));
                        }}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="dark">🌙 暗黑模式 (Dark Mode)</option>
                        <option value="light">☀️ 明亮模式 (Light Mode)</option>
                        <option value="auto">💻 跟随系统 (System Auto)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">终端配色方案</label>
                      <div className="flex items-center space-x-2">
                        <select 
                          value={settings.themeName || 'Classic Dark'}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, themeName: e.target.value }))}
                          className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                        >
                          {customThemeList.length > 0 && (
                            <optgroup label="🎨 自定义配色方案 (Custom Themes)">
                              {customThemeList.map((t: any) => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="🌙 暗黑极客主题 (Dark Themes)">
                            <option value="Classic Dark">Classic Dark (极客暗黑)</option>
                            <option value="Tokyo Night">Tokyo Night (东京暗夜)</option>
                            <option value="Tokyo Night Storm">Tokyo Night Storm (东京风暴)</option>
                            <option value="Catppuccin Mocha">Catppuccin Mocha (摩卡柔和)</option>
                            <option value="Catppuccin Macchiato">Catppuccin Macchiato (玛奇朵温润)</option>
                            <option value="Catppuccin Frappé">Catppuccin Frappé (法冰暮霭)</option>
                            <option value="Rosé Pine">Rosé Pine (玫瑰松针)</option>
                            <option value="Rosé Pine Moon">Rosé Pine Moon (松针月夜)</option>
                            <option value="Kanagawa Wave">Kanagawa Wave (神奈川浪)</option>
                            <option value="Kanagawa Dragon">Kanagawa Dragon (神奈墨龙)</option>
                            <option value="Vesper">Vesper (极夜微光)</option>
                            <option value="Night Owl">Night Owl (暗夜猫头鹰)</option>
                            <option value="Everforest Dark">Everforest Dark (常青暮林)</option>
                            <option value="Poimandres">Poimandres (极客未来)</option>
                            <option value="Oxocarbon">Oxocarbon (碳素高科)</option>
                            <option value="Horizon Dark">Horizon Dark (地平线霓虹)</option>
                            <option value="Palenight">Palenight (苍白之夜)</option>
                            <option value="Snazzy">Snazzy (时髦炫彩)</option>
                            <option value="Shades of Purple">Shades of Purple (极客暗紫)</option>
                            <option value="Nord">Nord (北欧极光)</option>
                            <option value="One Dark Pro">One Dark Pro (经典 Atom)</option>
                            <option value="Dracula">Dracula (德拉库拉)</option>
                            <option value="Monokai">Monokai (复古原野)</option>
                            <option value="GitHub Dark">GitHub Dark (官方暗黑)</option>
                            <option value="Cyberpunk 2077">Cyberpunk 2077 (赛博霓虹)</option>
                            <option value="Ayu Dark">Ayu Dark (深邃冷调)</option>
                            <option value="Gruvbox Dark">Gruvbox Dark (复古暖调)</option>
                            <option value="Synthwave '84">Synthwave '84 (复古发光)</option>
                            <option value="Moonlight">Moonlight (月光暗夜)</option>
                            <option value="Solarized Dark">Solarized Dark (经典护眼)</option>
                          </optgroup>
                          <optgroup label="☀️ 浅色清爽主题 (Light Themes)">
                            <option value="GitHub Light">GitHub Light (官方明亮)</option>
                            <option value="Catppuccin Latte">Catppuccin Latte (拿铁浅色)</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 终端主题预览画廊 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
                      终端主题预览画廊 (Theme Preview Gallery)
                    </h4>
                    <span className="text-[11px] text-[#858585]">
                      当前选中: <strong className="text-[#3794ff]">{activeThemeName}</strong>
                    </span>
                  </div>
                  <ThemePreviewGallery
                    activeThemeName={activeThemeName}
                    onSelectTheme={(name) => {
                      setSettings(new models.AppSettings({ ...settings, themeName: name }));
                      setThemeStatusMessage(`已应用主题: ${name}`);
                      setTimeout(() => setThemeStatusMessage(''), 2000);
                    }}
                    customThemes={customThemeList}
                    onDeleteCustomTheme={handleDeleteCustomTheme}
                  />
                </div>

                {/* ANSI 16 色与专色可视化调色盘 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-[#0078d4]" />
                      ANSI 16 色调色盘与专色定制
                      {isCustomTheme && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#0078d4]/20 text-blue-300 border border-[#0078d4]/30 font-normal">
                          自定义配色
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {themeStatusMessage && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                          <Check className="w-3 h-3" /> {themeStatusMessage}
                        </span>
                      )}
                      <label className="px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] border border-[#3c3c3c] rounded text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95" title="导入 iTerm2 (.itermcolors)、Windows Terminal (JSON) 或 Xshell (.xcs) 主题">
                        <Upload className="w-3 h-3 text-[#3794ff]" />
                        导入主题
                        <input 
                          type="file" 
                          accept=".itermcolors,.json,.xcs" 
                          className="hidden" 
                          onChange={handleImportTheme} 
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={handleExportTheme}
                        className="px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] border border-[#3c3c3c] rounded text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        title="将当前调色主题导出为方案文件"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        导出主题
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setCustomThemeNameInput(isCustomTheme ? `${activeThemeName} (Copy)` : `${activeThemeName} (Custom)`);
                          setIsCustomThemeModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        另存为新主题
                      </button>
                      {isCustomTheme && (
                        <button 
                          type="button" 
                          onClick={() => handleDeleteCustomTheme(activeThemeName)}
                          className="px-2.5 py-1 bg-[#a1260d]/20 hover:bg-[#a1260d]/30 text-rose-300 border border-[#a1260d]/40 rounded text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <Trash2 className="w-3 h-3" />
                          删除此主题
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 6 基础专色 */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-slate-400">基础专色 (Special Colors)</div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { key: 'background', label: '背景色 (BG)', defaultVal: '#181818' },
                        { key: 'foreground', label: '前景色 (FG)', defaultVal: '#cccccc' },
                        { key: 'cursor', label: '光标颜色 (Cursor)', defaultVal: '#ffffff' },
                        { key: 'cursorAccent', label: '光标反色 (Accent)', defaultVal: '#000000' },
                        { key: 'selectionBackground', label: '选区背景 (Select BG)', defaultVal: 'rgba(38, 79, 120, 0.6)' },
                        { key: 'selectionForeground', label: '选区文字 (Select FG)', defaultVal: '#ffffff' },
                      ].map((item) => {
                        const val = currentThemeObj[item.key] || item.defaultVal;
                        return (
                          <div key={item.key} className="relative group p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] flex items-center space-x-2 transition-all cursor-pointer" title={`${item.label}: ${val}`}>
                            <div className="w-5 h-5 rounded border border-white/15 shrink-0 shadow-inner" style={{ backgroundColor: val }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] text-[#858585] font-medium truncate">{item.label}</div>
                              <div className="text-[10px] text-[#cccccc] font-mono font-medium truncate">{val}</div>
                            </div>
                            <input 
                              type="color" 
                              value={val.startsWith('#') && val.length === 7 ? val : '#181818'} 
                              onChange={(e) => handleColorChange(item.key, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 全局光标与选区独立覆盖 (可选) */}
                  <div className="space-y-2 pt-2 border-t border-[#2b2b2b]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-medium text-[#858585]">全局独立光标与选区覆盖</span>
                        <span className="text-[10px] text-[#858585] ml-2">(优先于调色盘生效，留空则自动跟随主题)</span>
                      </div>
                      {((settings as any).cursorColor || (settings as any).cursorAccentColor || (settings as any).selectionBackground || (settings as any).selectionForeground) && (
                        <button
                          type="button"
                          onClick={() => setSettings(new models.AppSettings({
                            ...settings,
                            cursorColor: '',
                            cursorAccentColor: '',
                            selectionBackground: '',
                            selectionForeground: '',
                          } as any))}
                          className="text-[10px] text-[#3794ff] hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          重置为全跟随主题
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] space-y-1">
                        <div className="text-[10px] text-[#858585]">独立光标色</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(settings as any).cursorColor || '#38bdf8'}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, cursorColor: e.target.value } as any))}
                            className="w-5 h-5 rounded cursor-pointer border border-white/20 bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            placeholder="跟随主题"
                            value={(settings as any).cursorColor || ''}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, cursorColor: e.target.value } as any))}
                            className="w-full bg-transparent font-mono text-[10px] text-[#cccccc] outline-none placeholder-[#858585]"
                          />
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] space-y-1">
                        <div className="text-[10px] text-[#858585]">光标内文字反色</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(settings as any).cursorAccentColor || '#000000'}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, cursorAccentColor: e.target.value } as any))}
                            className="w-5 h-5 rounded cursor-pointer border border-white/20 bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            placeholder="跟随主题"
                            value={(settings as any).cursorAccentColor || ''}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, cursorAccentColor: e.target.value } as any))}
                            className="w-full bg-transparent font-mono text-[10px] text-[#cccccc] outline-none placeholder-[#858585]"
                          />
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] space-y-1">
                        <div className="text-[10px] text-[#858585]">选区背景高亮</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(settings as any).selectionBackground?.startsWith('#') ? (settings as any).selectionBackground : '#3b82f6'}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, selectionBackground: e.target.value } as any))}
                            className="w-5 h-5 rounded cursor-pointer border border-white/20 bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            placeholder="跟随主题"
                            value={(settings as any).selectionBackground || ''}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, selectionBackground: e.target.value } as any))}
                            className="w-full bg-transparent font-mono text-[10px] text-[#cccccc] outline-none placeholder-[#858585]"
                          />
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] space-y-1">
                        <div className="text-[10px] text-[#858585]">选区文字前景色</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(settings as any).selectionForeground?.startsWith('#') ? (settings as any).selectionForeground : '#ffffff'}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, selectionForeground: e.target.value } as any))}
                            className="w-5 h-5 rounded cursor-pointer border border-white/20 bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            placeholder="跟随主题"
                            value={(settings as any).selectionForeground || ''}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, selectionForeground: e.target.value } as any))}
                            className="w-full bg-transparent font-mono text-[10px] text-[#cccccc] outline-none placeholder-[#858585]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ANSI 8 标准色 */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-[#858585]">标准 ANSI 8 色 (Standard Colors)</div>
                    <div className="grid grid-cols-8 gap-2">
                      {[
                        { key: 'black', label: '黑色' },
                        { key: 'red', label: '红色' },
                        { key: 'green', label: '绿色' },
                        { key: 'yellow', label: '黄色' },
                        { key: 'blue', label: '蓝色' },
                        { key: 'magenta', label: '品红' },
                        { key: 'cyan', label: '青色' },
                        { key: 'white', label: '白色' },
                      ].map((item) => {
                        const val = currentThemeObj[item.key] || '#888888';
                        return (
                          <div key={item.key} className="relative group p-1.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] flex flex-col items-center gap-1 transition-all cursor-pointer text-center" title={`${item.label}: ${val}`}>
                            <div className="w-5 h-5 rounded border border-white/15 shadow-inner" style={{ backgroundColor: val }} />
                            <span className="text-[9px] text-[#858585] truncate w-full font-mono">{item.label}</span>
                            <input 
                              type="color" 
                              value={val.startsWith('#') && val.length === 7 ? val : '#888888'} 
                              onChange={(e) => handleColorChange(item.key, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ANSI 8 高亮色 */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-[#858585]">高亮 ANSI 8 色 (Bright Colors)</div>
                    <div className="grid grid-cols-8 gap-2">
                      {[
                        { key: 'brightBlack', label: '亮黑' },
                        { key: 'brightRed', label: '亮红' },
                        { key: 'brightGreen', label: '亮绿' },
                        { key: 'brightYellow', label: '亮黄' },
                        { key: 'brightBlue', label: '亮蓝' },
                        { key: 'brightMagenta', label: '亮品红' },
                        { key: 'brightCyan', label: '亮青' },
                        { key: 'brightWhite', label: '亮白' },
                      ].map((item) => {
                        const val = currentThemeObj[item.key] || '#aaaaaa';
                        return (
                          <div key={item.key} className="relative group p-1.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] flex flex-col items-center gap-1 transition-all cursor-pointer text-center" title={`${item.label}: ${val}`}>
                            <div className="w-5 h-5 rounded border border-white/15 shadow-inner" style={{ backgroundColor: val }} />
                            <span className="text-[9px] text-[#858585] truncate w-full font-mono">{item.label}</span>
                            <input 
                              type="color" 
                              value={val.startsWith('#') && val.length === 7 ? val : '#aaaaaa'} 
                              onChange={(e) => handleColorChange(item.key, e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 字体与排版 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
                      字体与终端排版
                    </h4>
                    <span className="text-[10px] text-[#858585] font-mono">
                      {settings.fontFamily?.split(',')[0].replace(/['"]/g, '')} • {settings.fontSize || 14}px
                    </span>
                  </div>

                  {/* 实时外观所见即所得仿真视口 */}
                  <LiveFontPreview
                    fontFamily={settings.fontFamily || 'Menlo, Monaco, Consolas, monospace'}
                    nonAsciiFontFamily={settings.nonAsciiFontFamily}
                    fontSize={settings.fontSize || 14}
                    lineHeight={settings.lineHeight ?? 1.2}
                    letterSpacing={(settings as any).letterSpacing ?? 0}
                    fontWeight={(settings as any).fontWeight || 'normal'}
                    fontWeightBold={(settings as any).fontWeightBold || 'bold'}
                    enableLigatures={settings.enableLigatures !== false}
                    fontSmoothing={(settings as any).fontSmoothing || 'antialiased'}
                    cursorStyle={settings.cursorStyle || 'block'}
                    cursorBlink={settings.cursorBlink !== false}
                    themeObj={currentThemeObj}
                    cursorColor={(settings as any).cursorColor}
                    cursorAccentColor={(settings as any).cursorAccentColor}
                    selectionBackground={(settings as any).selectionBackground}
                    selectionForeground={(settings as any).selectionForeground}
                    customGlyphs={(settings as any).customGlyphs !== false}
                    drawBoldTextInBrightColors={(settings as any).drawBoldTextInBrightColors !== false}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[#858585]">英文字体 (ASCII)</label>
                        <a 
                          href="https://www.nerdfonts.com/font-downloads" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[9px] text-[#3794ff] hover:underline transition-colors"
                          title="前往 Nerd Fonts 官网获取更多等宽极客编程字体"
                        >
                          获取极客字体 ↗
                        </a>
                      </div>
                      <select 
                        value={settings.fontFamily || 'Menlo, Monaco, Consolas, monospace'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fontFamily: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all font-mono"
                      >
                        <option value="Menlo, Monaco, Consolas, monospace">Menlo / Monaco / Consolas (推荐)</option>
                        <option value='"JetBrains Mono", Consolas, monospace'>JetBrains Mono</option>
                        <option value='"Fira Code", Consolas, monospace'>Fira Code (支持连字)</option>
                        <option value='"Cascadia Code", Consolas, monospace'>Cascadia Code</option>
                        <option value='"Source Code Pro", monospace'>Source Code Pro</option>
                        <option value='"Hack", monospace'>Hack</option>
                        <option value='"MesloLGS NF", monospace'>MesloLGS NF</option>
                        <option value='"Courier New", Courier, monospace'>Courier New</option>
                      </select>
                      {/* 热门极客字体推荐 Pills (带系统已安装探测) */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {[
                          'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'Monaco', 'Source Code Pro', 'Hack', 'MesloLGS NF'
                        ].map(font => {
                          const isInstalled = checkFontInstalled(font);
                          return (
                            <button
                              key={font}
                              type="button"
                              onClick={() => setSettings(new models.AppSettings({ ...settings, fontFamily: `"${font}", Consolas, monospace` }))}
                              className={`px-1.5 py-0.5 text-[10px] rounded border font-mono transition-all flex items-center gap-1 ${
                                settings.fontFamily?.includes(font)
                                  ? 'bg-[#0078d4]/30 text-blue-300 border-[#0078d4]/50 shadow-sm'
                                  : 'bg-[#1e1e1e] text-[#858585] border-[#3c3c3c] hover:border-[#505050] hover:text-[#cccccc]'
                              }`}
                              title={isInstalled ? `${font}：系统已检测到该字体` : `${font}：系统未检测到该字体`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isInstalled ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-slate-600'}`} />
                              {font}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">中文字体 (Non-ASCII)</label>
                      <select 
                        value={settings.nonAsciiFontFamily || '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, nonAsciiFontFamily: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value='"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif'>微软雅黑 / PingFang SC (推荐)</option>
                        <option value='"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'>苹方 / PingFang SC</option>
                        <option value='"Sarasa Gothic SC", "更纱黑体 SC", monospace'>更纱黑体 / Sarasa Gothic SC</option>
                        <option value='"SimSun", "Songti SC", serif'>宋体 / SimSun</option>
                        <option value='"KaiTi", "Kaiti SC", serif'>楷体 / KaiTi</option>
                      </select>
                      {/* 中文字体推荐 Pills (带系统已安装探测) */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {[
                          { label: '微软雅黑', font: 'Microsoft YaHei', val: '"Microsoft YaHei", "PingFang SC", sans-serif' },
                          { label: '苹方', font: 'PingFang SC', val: '"PingFang SC", "Hiragino Sans GB", sans-serif' },
                          { label: '更纱黑体', font: 'Sarasa Gothic SC', val: '"Sarasa Gothic SC", "更纱黑体 SC", monospace' },
                          { label: '冬青黑体', font: 'Hiragino Sans GB', val: '"Hiragino Sans GB", "PingFang SC", sans-serif' },
                        ].map(item => {
                          const isInstalled = checkFontInstalled(item.font);
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => setSettings(new models.AppSettings({ ...settings, nonAsciiFontFamily: item.val }))}
                              className={`px-1.5 py-0.5 text-[10px] rounded border transition-all flex items-center gap-1 ${
                                settings.nonAsciiFontFamily?.includes(item.label) || settings.nonAsciiFontFamily === item.val
                                  ? 'bg-[#0078d4]/30 text-blue-300 border-[#0078d4]/50 shadow-sm'
                                  : 'bg-[#1e1e1e] text-[#858585] border-[#3c3c3c] hover:border-[#505050] hover:text-[#cccccc]'
                              }`}
                              title={isInstalled ? `${item.label}：系统已安装` : `${item.label}：系统未检测到`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isInstalled ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-slate-600'}`} />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">文字尺寸 (PX)</label>
                      <input 
                        type="number" 
                        min="10"
                        max="30"
                        value={settings.fontSize || 14}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fontSize: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">回滚历史行数</label>
                      <input 
                        type="number" 
                        min="1000"
                        max="100000"
                        value={settings.scrollbackLines || 10000}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, scrollbackLines: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">光标样式</label>
                      <select 
                        value={settings.cursorStyle || 'block'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, cursorStyle: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="block">█ 块状光标 (Block)</option>
                        <option value="underline">_ 下划线光标 (Underline)</option>
                        <option value="bar">| 竖线光标 (Bar)</option>
                      </select>
                    </div>
                  </div>

                  {/* 字重与字间距精细控制 */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">常规字重 (Font Weight)</label>
                      <select 
                        value={(settings as any).fontWeight || 'normal'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fontWeight: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="normal">Normal (400, 推荐)</option>
                        <option value="100">Thin (100)</option>
                        <option value="200">ExtraLight (200)</option>
                        <option value="300">Light (300)</option>
                        <option value="400">Regular (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">SemiBold (600)</option>
                        <option value="bold">Bold (700)</option>
                        <option value="800">ExtraBold (800)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">粗体字重 (Bold Weight)</label>
                      <select 
                        value={(settings as any).fontWeightBold || 'bold'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fontWeightBold: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="bold">Bold (700, 推荐)</option>
                        <option value="normal">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">SemiBold (600)</option>
                        <option value="800">ExtraBold (800)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#858585]">字间距 (Letter Spacing)</span>
                        <span className="text-[#0078d4] font-semibold font-mono">{(settings as any).letterSpacing ?? 0}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="-5" 
                        max="10" 
                        step="0.5"
                        value={(settings as any).letterSpacing ?? 0}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, letterSpacing: Number(e.target.value) } as any))}
                        className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                      />
                    </div>
                  </div>

                  {/* 代码连字特性 开关 */}
                  <div className="pt-1">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.enableLigatures !== false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableLigatures: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#cccccc] font-medium">启用代码连字特性 (Font Ligatures)</div>
                        <div className="text-[10px] text-[#858585]">支持将 !=, ===, =&gt;, -&gt;, &lt;=&gt; 等多字符编程符号合并为美观的连字字形（需配合 Fira Code、JetBrains Mono、Cascadia Code 等支持连字的字体）</div>
                      </div>
                    </label>
                  </div>

                  {/* 符号矢量对齐与粗体色彩控制 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <label className="flex items-start space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={(settings as any).customGlyphs !== false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, customGlyphs: e.target.checked } as any))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#cccccc] font-medium">Powerline / Nerd Font 符号矢量对齐 (Custom Glyphs)</div>
                        <div className="text-[10px] text-[#858585] leading-relaxed">内置矢量算法绘制制表线、区块及 Powerline 箭头，防止终端提示符图标错位、截断或模糊</div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={(settings as any).drawBoldTextInBrightColors !== false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, drawBoldTextInBrightColors: e.target.checked } as any))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#cccccc] font-medium">粗体文字以 ANSI 亮色渲染 (Draw Bold as Bright)</div>
                        <div className="text-[10px] text-[#858585] leading-relaxed">启用时粗体转义序列渲染为对应 ANSI Bright 高亮色变体；关闭时仅加粗字体保持原始色彩</div>
                      </div>
                    </label>
                  </div>

                  {/* Unicode 宽字符模式选择 */}
                  <div className="pt-1">
                    <div className="space-y-1.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c]">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#cccccc] font-medium">Unicode 宽字符对齐规范 (Unicode Version)</span>
                        <span className="text-[10px] text-[#858585]">当前模式: {(settings as any).unicodeVersion === '6' ? 'Unicode 6 (兼容)' : 'Unicode 11 (现代/CJK推荐)'}</span>
                      </div>
                      <select 
                        value={(settings as any).unicodeVersion || '11'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, unicodeVersion: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#252526] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="11">Unicode 11 (现代标准，完美支持最新 Emoji、CJK 中日韩全角字符与符号宽度)</option>
                        <option value="6">Unicode 6 (经典兼容模式，适用于依赖旧版字符宽度的 CLI 与遗留系统)</option>
                      </select>
                    </div>
                  </div>

                  {/* 行高与内边距精细控制 */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#2b2b2b]">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#858585]">行高比例 (Line Height)</span>
                        <span className="text-[#0078d4] font-semibold">{settings.lineHeight ?? 1.2}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="2.0" 
                        step="0.05"
                        value={settings.lineHeight ?? 1.2}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, lineHeight: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#858585]">视口内边距 (Terminal Padding)</span>
                        <span className="text-[#0078d4] font-semibold">{settings.terminalPadding ?? 8}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="32" 
                        step="1"
                        value={settings.terminalPadding ?? 8}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, terminalPadding: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                      />
                    </div>
                  </div>
                </div>

                {/* 透明度与视觉效果 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
                    透明度与渲染效果
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#858585]">终端背景不透明度</span>
                        <span className="text-[#0078d4] font-semibold">{Math.round((settings.terminalOpacity ?? 1.0) * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.05"
                        value={settings.terminalOpacity ?? 1.0}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, terminalOpacity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#858585]">窗口全局不透明度</span>
                        <span className="text-[#0078d4] font-semibold">{Math.round((settings.windowOpacity ?? 1.0) * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.05"
                        value={settings.windowOpacity ?? 1.0}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, windowOpacity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.enableBlur || false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableBlur: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">全局毛玻璃磨砂效果 (Translucency)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.cursorBlink !== false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, cursorBlink: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">光标呼吸闪烁 (Cursor Blink)</span>
                    </label>
                  </div>

                  {/* 最小对比度控制 */}
                  <div className="space-y-1.5 pt-2 border-t border-[#2b2b2b]">
                    <div className="flex justify-between items-center text-[11px]">
                      <div>
                        <span className="text-[#858585]">文字最小对比度 (Minimum Contrast)</span>
                        <span className="text-[10px] text-[#858585] ml-2">自动增强过低对比度颜色以确保可读性</span>
                      </div>
                      <span className="text-[#0078d4] font-semibold font-mono">{(settings as any).minimumContrastRatio ?? 1}:1</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="21" 
                      step="0.5"
                      value={(settings as any).minimumContrastRatio ?? 1}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, minimumContrastRatio: Number(e.target.value) } as any))}
                      className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                    />
                    <div className="flex justify-between text-[9px] text-[#858585] px-0.5">
                      <span>1:1 (不干预)</span>
                      <span>4.5:1 (WCAG AA)</span>
                      <span>7:1 (WCAG AAA)</span>
                      <span>21:1 (最大)</span>
                    </div>
                  </div>

                  {/* 图形渲染引擎与文字平滑高级策略 */}
                  <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-[#2b2b2b]">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">图形渲染引擎 (Renderer)</label>
                      <select 
                        value={(settings as any).rendererType || 'auto'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, rendererType: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="auto">智能自动 (Auto, 推荐)</option>
                        <option value="webgl">强制 WebGL (Force WebGL, 最高帧率)</option>
                        <option value="canvas">兼容模式 (Canvas 2D, 高稳定性)</option>
                        <option value="dom">纯 DOM 文本模式 (Pure DOM, 低资源开销)</option>
                      </select>
                      <div className="text-[9px] text-[#858585]">Auto: 不透明硬件加速，半透明/壁纸平滑降级 Canvas</div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">文字渲染抗锯齿 (Font Smoothing)</label>
                      <select 
                        value={(settings as any).fontSmoothing || 'antialiased'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fontSmoothing: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      >
                        <option value="antialiased">灰度抗锯齿 (Antialiased, 柔和细腻，Retina推荐)</option>
                        <option value="subpixel-antialiased">次像素抗锯齿 (Subpixel, LCD 锐利对比)</option>
                        <option value="none">关闭抗锯齿 (None, 复古像素点阵)</option>
                      </select>
                      <div className="text-[9px] text-[#858585]">调节字符边缘渲染算法与字体清晰质感</div>
                    </div>
                  </div>

                  {/* 终端内联图像渲染协议 (Sixel & iTerm2 IIP) */}
                  <div className="pt-3 border-t border-[#2b2b2b] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-white flex items-center gap-1.5">
                          <span>内联图像协议渲染 (Sixel & iTerm2 IIP)</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#0078d4]/20 text-[#38bdf8] border border-[#0078d4]/40 rounded">Phase 8</span>
                        </div>
                        <div className="text-[10px] text-[#858585] mt-0.5">
                          在终端内直接渲染图片（支持 yazi、ranger、timg、viu、fastfetch 等现代 CLI 工具）
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(settings as any).enableTerminalImages !== false}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableTerminalImages: e.target.checked } as any))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#3c3c3c] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0078d4]"></div>
                      </label>
                    </div>

                    {(settings as any).enableTerminalImages !== false && (
                      <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-[#858585]">图像缓存上限 (Storage Limit)</label>
                          <select 
                            value={(settings as any).imageStorageLimitMB || 128}
                            onChange={(e) => setSettings(new models.AppSettings({ ...settings, imageStorageLimitMB: parseInt(e.target.value, 10) } as any))}
                            className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                          >
                            <option value={64}>64 MB (低内存工作站)</option>
                            <option value={128}>128 MB (推荐，均衡稳定)</option>
                            <option value={256}>256 MB (高性能开发机)</option>
                            <option value={512}>512 MB (超大图/批处理浏览)</option>
                          </select>
                          <div className="text-[9px] text-[#858585]">超出上限自动按 FIFO 规则回收最旧图像并显示占位图</div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-[#858585]">防爆显存安全机制</label>
                          <div className="px-3 py-1.5 bg-[#1e1e1e] border border-[#2b2b2b] rounded text-[11px] text-[#9d9d9d] leading-relaxed">
                            单图像素上限 16M (4096×4096)，序列解析上限 25MB，自动隔离恶意溢出。
                          </div>
                          <div className="text-[9px] text-[#38bdf8]">已原生兼容 WebGL 硬件加速与 Canvas 降级层</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 全局背景壁纸 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Image className="w-3.5 h-3.5 text-[#0078d4]" />
                    全局背景壁纸 (Global Background Image)
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">背景图片 (适用于所有无独立背景的终端 Tab)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="图片 URL (https://... 或 data:image/...)"
                        value={(settings as any).globalBackgroundImage || ''}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, globalBackgroundImage: e.target.value } as any))}
                        className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                      />
                      <label className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] rounded text-[#cccccc] text-xs cursor-pointer transition-colors whitespace-nowrap">
                        <span>选择本地图片</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setSettings(new models.AppSettings({ ...settings, globalBackgroundImage: event.target.result as string } as any));
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {(settings as any).globalBackgroundImage && (
                        <button
                          type="button"
                          onClick={() => setSettings(new models.AppSettings({ ...settings, globalBackgroundImage: '' } as any))}
                          className="px-3 py-1.5 bg-[#a1260d]/20 hover:bg-[#a1260d]/30 border border-[#a1260d]/40 rounded text-rose-300 text-xs transition-colors"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </div>

                  {(settings as any).globalBackgroundImage && (
                    <div className="grid grid-cols-3 gap-3.5 pt-2 border-t border-[#2b2b2b]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#858585]">背景不透明度</span>
                          <span className="text-[#0078d4] font-semibold">{Math.round(((settings as any).globalBackgroundOpacity ?? 0.3) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1.0"
                          step="0.05"
                          value={(settings as any).globalBackgroundOpacity ?? 0.3}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, globalBackgroundOpacity: Number(e.target.value) } as any))}
                          className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#858585]">背景模糊度</span>
                          <span className="text-[#0078d4] font-semibold">{(settings as any).globalBackgroundBlur ?? 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={(settings as any).globalBackgroundBlur ?? 0}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, globalBackgroundBlur: Number(e.target.value) } as any))}
                          className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#858585]">适配模式</label>
                        <select
                          value={(settings as any).globalBackgroundFit || 'cover'}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, globalBackgroundFit: e.target.value } as any))}
                          className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all"
                        >
                          <option value="cover">Cover (填充, 推荐)</option>
                          <option value="contain">Contain (完整显示)</option>
                          <option value="tile">Tile (平铺重复)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full py-2 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium text-xs rounded transition-all shadow-sm active:scale-[0.99]">
                    保存全局偏好设置
                  </button>
                </div>
              </form>

      {/* 自定义主题另存为弹窗 */}
      {isCustomThemeModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] border border-[#2b2b2b] rounded-md shadow-2xl max-w-sm w-full overflow-hidden text-[#cccccc]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-[#0078d4]" />
                另存为自定义终端主题
              </h3>
              <button 
                onClick={() => setIsCustomThemeModalOpen(false)} 
                className="text-[#858585] hover:text-white rounded p-1 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsCustomTheme} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#858585]">主题名称 (Theme Name)</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="例如: My Cyberpunk Dark"
                  value={customThemeNameInput}
                  onChange={(e) => setCustomThemeNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all font-medium"
                  required
                />
                <p className="text-[10px] text-[#858585]">
                  将以当前 ANSI 16 色与专色调色盘为模板，创建可复用独立的自定义配色方案。
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2b2b2b] shrink-0 text-xs">
                <button 
                  type="button" 
                  onClick={() => setIsCustomThemeModalOpen(false)}
                  className="px-3.5 py-1.5 border border-[#3c3c3c] hover:bg-white/5 rounded text-[#cccccc] transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-white transition-all shadow-sm font-medium"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

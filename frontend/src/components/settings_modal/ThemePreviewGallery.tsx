import React, { useState, useMemo } from 'react';
import { Check, Search, Trash2, Sparkles, Moon, Sun, Palette } from 'lucide-react';
import { THEMES } from '../../constants/terminalThemes';
import { models } from '../../../wailsjs/go/models';

interface ThemePreviewGalleryProps {
  activeThemeName: string;
  onSelectTheme: (name: string) => void;
  customThemes?: models.CustomThemeConfig[];
  onDeleteCustomTheme?: (name: string) => void;
}

interface ThemeMeta {
  name: string;
  isCustom: boolean;
  isLight: boolean;
  theme: any;
}

export function ThemePreviewGallery({
  activeThemeName,
  onSelectTheme,
  customThemes = [],
  onDeleteCustomTheme,
}: ThemePreviewGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'dark' | 'light' | 'custom'>('all');

  // 构建全部主题元数据集合
  const allThemeMetas = useMemo<ThemeMeta[]>(() => {
    const list: ThemeMeta[] = [];

    // 1. 内置主题
    const lightThemeNames = ['GitHub Light', 'Catppuccin Latte'];
    for (const [name, themeObj] of Object.entries(THEMES)) {
      list.push({
        name,
        isCustom: false,
        isLight: lightThemeNames.includes(name),
        theme: themeObj,
      });
    }

    // 2. 自定义主题
    for (const c of customThemes) {
      if (!c.name) continue;
      // 简单判断背景亮度
      const bg = c.background || '#000000';
      const isLight = bg.toLowerCase() === '#ffffff' || bg.toLowerCase().startsWith('#f') || bg.toLowerCase().startsWith('#e');
      list.push({
        name: c.name,
        isCustom: true,
        isLight,
        theme: c,
      });
    }

    return list;
  }, [customThemes]);

  // 过滤后的主题列表
  const filteredThemes = useMemo(() => {
    return allThemeMetas.filter(item => {
      // 标签过滤
      if (activeTab === 'dark' && (item.isLight || item.isCustom)) return false;
      if (activeTab === 'light' && (!item.isLight || item.isCustom)) return false;
      if (activeTab === 'custom' && !item.isCustom) return false;

      // 关键字搜索过滤
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        return item.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allThemeMetas, activeTab, searchTerm]);

  return (
    <div className="space-y-3">
      {/* 顶部搜索与分类过滤 */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#858585]" />
          <input
            type="text"
            placeholder="搜索终端配色主题..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all placeholder:text-[#858585]"
          />
        </div>

        {/* 过滤切换分段框 */}
        <div className="flex items-center bg-[#1e1e1e] p-0.5 rounded border border-[#3c3c3c] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-[3px] transition-all font-medium flex items-center gap-1 ${
              activeTab === 'all'
                ? 'bg-[#0078d4] text-white shadow-sm'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            全部 ({allThemeMetas.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dark')}
            className={`px-2.5 py-1 rounded-[3px] transition-all font-medium flex items-center gap-1 ${
              activeTab === 'dark'
                ? 'bg-[#0078d4] text-white shadow-sm'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Moon className="w-3 h-3" /> 暗黑
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('light')}
            className={`px-2.5 py-1 rounded-[3px] transition-all font-medium flex items-center gap-1 ${
              activeTab === 'light'
                ? 'bg-[#0078d4] text-white shadow-sm'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Sun className="w-3 h-3" /> 浅色
          </button>
          {customThemes.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-2.5 py-1 rounded-[3px] transition-all font-medium flex items-center gap-1 ${
                activeTab === 'custom'
                  ? 'bg-[#0078d4] text-white shadow-sm'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              <Palette className="w-3 h-3" /> 自定义 ({customThemes.length})
            </button>
          )}
        </div>
      </div>

      {/* 主题卡片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1.5 select-none custom-scrollbar">
        {filteredThemes.map(({ name, isCustom, isLight, theme }) => {
          const isActive = activeThemeName === name;
          const bg = theme.background || (isLight ? '#ffffff' : '#181818');
          const fg = theme.foreground || (isLight ? '#24292f' : '#cccccc');
          const greenColor = theme.green || '#10b981';
          const blueColor = theme.blue || '#0078d4';
          const magentaColor = theme.magenta || '#ec4899';
          const yellowColor = theme.yellow || '#eab308';
          const redColor = theme.red || '#ef4444';
          const cyanColor = theme.cyan || '#06b6d4';
          const cursorColor = theme.cursor || '#38bdf8';

          return (
            <div
              key={name}
              onClick={() => onSelectTheme(name)}
              className={`group relative rounded-md border p-2.5 flex flex-col justify-between transition-all cursor-pointer ${
                isActive
                  ? 'border-2 border-[#0078d4] bg-[#252526] shadow-sm'
                  : 'border-[#2b2b2b] hover:border-[#3c3c3c] bg-[#252526] hover:bg-[#2a2d2e]'
              }`}
            >
              {/* 卡片头部：名称与状态指示 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isActive ? 'text-[#3794ff]' : 'text-[#cccccc] group-hover:text-white'
                    }`}
                    title={name}
                  >
                    {name}
                  </span>
                  {isCustom && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      用户
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {isActive ? (
                    <span className="w-4 h-4 rounded-full bg-[#0078d4] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : isCustom && onDeleteCustomTheme ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomTheme(name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-[#858585] hover:text-rose-300 transition-all"
                      title="删除此自定义主题"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 微型仿真终端视口预览区 */}
              <div
                className="rounded p-2 font-mono text-[10px] leading-relaxed shadow-inner overflow-hidden border border-[#2b2b2b]/80 transition-all relative"
                style={{ backgroundColor: bg, color: fg }}
              >
                {/* 仿真命令行 1: Prompt 与命令 */}
                <div className="truncate flex items-center gap-1">
                  <span style={{ color: greenColor }} className="font-bold">user@omni</span>
                  <span style={{ color: fg }}>:</span>
                  <span style={{ color: blueColor }}>~</span>
                  <span style={{ color: fg }}>$ ls -la</span>
                </div>

                {/* 仿真命令行 2: 文件列表 */}
                <div className="truncate flex items-center gap-1.5 opacity-90">
                  <span style={{ color: blueColor }} className="font-semibold">drwxr-xr-x</span>
                  <span style={{ color: yellowColor }}>src/</span>
                </div>
                <div className="truncate flex items-center gap-1.5 opacity-90">
                  <span style={{ color: magentaColor }}>-rw-r--r--</span>
                  <span style={{ color: cyanColor }}>omni.config</span>
                </div>

                {/* 仿真命令行 3: 终端光标 */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span style={{ color: greenColor }}>$</span>
                  <span
                    className="inline-block w-1.5 h-3 ml-0.5 animate-pulse"
                    style={{ backgroundColor: cursorColor }}
                  />
                </div>
              </div>

              {/* 底部 ANSI 8 色调色盘微缩色点条 */}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#2b2b2b]">
                <div className="flex items-center space-x-1">
                  {[redColor, greenColor, yellowColor, blueColor, magentaColor, cyanColor].map(
                    (color, idx) => (
                      <span
                        key={idx}
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
                <span className="text-[10px] text-[#858585] font-mono">
                  {isLight ? 'Light' : 'Dark'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredThemes.length === 0 && (
        <div className="py-8 text-center text-xs text-[#858585] bg-[#252526] rounded-md border border-[#2b2b2b]">
          未找到与 "{searchTerm}" 匹配的配色主题
        </div>
      )}
    </div>
  );
}

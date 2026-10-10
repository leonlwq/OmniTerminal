import React from 'react';
import { Palette } from 'lucide-react';
import { models } from '../../../wailsjs/go/models';

interface SessionAppearanceTabProps {
  formData: any;
  setFormData: (data: any) => void;
  customThemes?: models.CustomThemeConfig[];
}

export function SessionAppearanceTab({
  formData,
  setFormData,
  customThemes = [],
}: SessionAppearanceTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Palette className="w-3.5 h-3.5 text-[#0078d4]" />
          独立主题与视觉覆盖
        </h4>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">覆盖主题配色</label>
            <select
              value={formData.overrideTheme || ''}
              onChange={(e) => setFormData({ ...formData, overrideTheme: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="">[ 继承全局配色主题 ]</option>
              {customThemes && customThemes.length > 0 && (
                <optgroup label="🎨 自定义配色方案 (Custom Themes)">
                  {customThemes.map((t: any) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="🌙 暗黑极客主题 (Dark Themes)">
                <option value="VS Code Dark Modern">VS Code Dark Modern (官方默认)</option>
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">代码连字特性 (Font Ligatures)</label>
            <select
              value={formData.overrideEnableLigatures ?? 0}
              onChange={(e) => setFormData({ ...formData, overrideEnableLigatures: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value={0}>[ 继承全局配置 ]</option>
              <option value={1}>强制启用连字 (!=, ===, =&gt;)</option>
              <option value={2}>强制禁用连字</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">覆盖终端字号 (PX)</label>
            <input
              type="number"
              min="0"
              max="30"
              placeholder="0 代表继承全局配置"
              value={formData.overrideFontSize || 0}
              onChange={(e) => setFormData({ ...formData, overrideFontSize: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            />
          </div>
        </div>

        {/* 独立行高与内边距覆盖 */}
        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#858585]">独立行高 (Line Height)</span>
              <span className="text-[#0078d4] font-semibold">
                {(formData.overrideLineHeight ?? 0) > 0 ? `${formData.overrideLineHeight}x` : '[ 继承全局 ]'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={formData.overrideLineHeight || 0}
                onChange={(e) => setFormData({ ...formData, overrideLineHeight: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
              />
              {(formData.overrideLineHeight ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, overrideLineHeight: 0 })}
                  className="text-[10px] px-2 py-0.5 bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc]"
                >
                  重置
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#858585]">独立内边距 (Padding)</span>
              <span className="text-[#0078d4] font-semibold">
                {(formData.overrideTerminalPadding ?? 0) > 0 ? `${formData.overrideTerminalPadding}px` : '[ 继承全局 ]'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="32"
                step="1"
                value={formData.overrideTerminalPadding || 0}
                onChange={(e) => setFormData({ ...formData, overrideTerminalPadding: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
              />
              {(formData.overrideTerminalPadding ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, overrideTerminalPadding: 0 })}
                  className="text-[10px] px-2 py-0.5 bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc]"
                >
                  重置
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#858585]">覆盖终端背景不透明度</span>
            <span className="text-[#0078d4] font-semibold">
              {(formData.overrideTerminalOpacity ?? 0) > 0
                ? `${Math.round((formData.overrideTerminalOpacity ?? 0) * 100)}%`
                : '[ 继承全局配置 ]'}
            </span>
          </div>
          <div className="flex items-center space-x-3 py-1">
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={formData.overrideTerminalOpacity || 0}
              onChange={(e) => setFormData({ ...formData, overrideTerminalOpacity: Number(e.target.value) })}
              className="flex-1 h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
            />
            {(formData.overrideTerminalOpacity ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, overrideTerminalOpacity: 0 })}
                className="text-[11px] px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc] transition-colors"
              >
                重置
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-medium text-[#858585]">会话独立背景图</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="图片 URL (https://... 或 data:image/...)"
              value={formData.backgroundImage || ''}
              onChange={(e) => setFormData({ ...formData, backgroundImage: e.target.value })}
              className="flex-1 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            />
            <label className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc] text-xs cursor-pointer transition-colors whitespace-nowrap">
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
                        setFormData({ ...formData, backgroundImage: event.target.result as string });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            {formData.backgroundImage && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, backgroundImage: '' })}
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc] text-xs"
              >
                清除
              </button>
            )}
          </div>
        </div>

        {formData.backgroundImage && (
          <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-[#2b2b2b]">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#858585]">背景图不透明度</span>
                <span className="text-[#0078d4] font-semibold">{Math.round((formData.backgroundOpacity ?? 0.5) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formData.backgroundOpacity ?? 0.5}
                onChange={(e) => setFormData({ ...formData, backgroundOpacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#858585]">背景模糊滤镜 (Blur)</span>
                <span className="text-[#0078d4] font-semibold">{formData.backgroundBlur ?? 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={formData.backgroundBlur ?? 0}
                onChange={(e) => setFormData({ ...formData, backgroundBlur: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#3c3c3c] rounded-full appearance-none cursor-pointer accent-[#0078d4]"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">背景适配模式 (Fit Mode)</label>
              <select
                value={formData.backgroundFit || 'cover'}
                onChange={(e) => setFormData({ ...formData, backgroundFit: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="cover">Cover (等比缩放并完全填充视口 - 推荐)</option>
                <option value="contain">Contain (完整显示图片全部内容)</option>
                <option value="tile">Tile (无缩放平铺重复模式)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
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
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Palette className="w-3.5 h-3.5 text-[#0078d4]" />
          {t("sessionAppearance.title")}
        </h4>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.overrideTheme')}</label>
            <select
              value={formData.overrideTheme || ''}
              onChange={(e) => setFormData({ ...formData, overrideTheme: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="">{t('sessionModal.inheritTheme')}</option>
              {customThemes && customThemes.length > 0 && (
                <optgroup label={t("sessionAppearance.customThemes")}>
                  {customThemes.map((t: any) => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label={t("sessionAppearance.darkThemes")}>
                <option value="VS Code Dark Modern">VS Code Dark Modern</option>
                <option value="Classic Dark">Classic Dark</option>
                <option value="Tokyo Night">Tokyo Night</option>
                <option value="Tokyo Night Storm">Tokyo Night Storm</option>
                <option value="Catppuccin Mocha">Catppuccin Mocha</option>
                <option value="Catppuccin Macchiato">Catppuccin Macchiato</option>
                <option value="Catppuccin Frappé">Catppuccin Frappé</option>
                <option value="Rosé Pine">Rosé Pine</option>
                <option value="Rosé Pine Moon">Rosé Pine Moon</option>
                <option value="Kanagawa Wave">Kanagawa Wave</option>
                <option value="Kanagawa Dragon">Kanagawa Dragon</option>
                <option value="Vesper">Vesper</option>
                <option value="Night Owl">Night Owl</option>
                <option value="Everforest Dark">Everforest Dark</option>
                <option value="Poimandres">Poimandres</option>
                <option value="Oxocarbon">Oxocarbon</option>
                <option value="Horizon Dark">Horizon Dark</option>
                <option value="Palenight">Palenight</option>
                <option value="Snazzy">Snazzy</option>
                <option value="Shades of Purple">Shades of Purple</option>
                <option value="Nord">Nord</option>
                <option value="One Dark Pro">One Dark Pro</option>
                <option value="Dracula">Dracula</option>
                <option value="Monokai">Monokai</option>
                <option value="GitHub Dark">GitHub Dark</option>
                <option value="Cyberpunk 2077">Cyberpunk 2077</option>
                <option value="Ayu Dark">Ayu Dark</option>
                <option value="Gruvbox Dark">Gruvbox Dark</option>
                <option value="Synthwave '84">Synthwave '84</option>
                <option value="Moonlight">Moonlight</option>
                <option value="Solarized Dark">Solarized Dark</option>
              </optgroup>
              <optgroup label={t("sessionAppearance.groupLight")}>
                <option value="GitHub Light">{t("sessionAppearance.themeGitHubLight")}</option>
                <option value="Catppuccin Latte">{t("sessionAppearance.themeCatppuccin")}</option>
              </optgroup>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.fontLigatures')}</label>
            <select
              value={formData.overrideEnableLigatures ?? 0}
              onChange={(e) => setFormData({ ...formData, overrideEnableLigatures: Number(e.target.value) })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value={0}>{t('sessionModal.inheritGlobal')}</option>
              <option value={1}>{t('sessionModal.enableLigatures')}</option>
              <option value={2}>{t('sessionModal.disableLigatures')}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.overrideFontSize')}</label>
            <input
              type="number"
              min="0"
              max="30"
              placeholder={t("sessionAppearance.inheritGlobal")}
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
              <span className="text-[#858585]">{t('sessionModal.overrideLineHeight')}</span>
              <span className="text-[#0078d4] font-semibold">
                {(formData.overrideLineHeight ?? 0) > 0 ? `${formData.overrideLineHeight}x` : t('sessionAppearance.inheritBadge')}
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
                  {t('common.reset')}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#858585]">{t('sessionModal.overridePadding')}</span>
              <span className="text-[#0078d4] font-semibold">
                {(formData.overrideTerminalPadding ?? 0) > 0 ? `${formData.overrideTerminalPadding}px` : t('sessionAppearance.inheritBadge')}
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
                  {t('common.reset')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#858585]">{t('sessionModal.overrideOpacity')}</span>
            <span className="text-[#0078d4] font-semibold">
              {(formData.overrideTerminalOpacity ?? 0) > 0
                ? `${Math.round((formData.overrideTerminalOpacity ?? 0) * 100)}%`
                : t('sessionAppearance.inheritConfig')}
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
                {t('common.reset')}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.bgImage')}</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={t("sessionAppearance.bgUrlPlaceholder")}
              value={formData.backgroundImage || ''}
              onChange={(e) => setFormData({ ...formData, backgroundImage: e.target.value })}
              className="flex-1 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            />
            <label className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] rounded text-[#cccccc] text-xs cursor-pointer transition-colors whitespace-nowrap">
              <span>{t('sessionModal.selectLocalImage')}</span>
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
                {t('common.clear')}
              </button>
            )}
          </div>
        </div>

        {formData.backgroundImage && (
          <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-[#2b2b2b]">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#858585]">{t('sessionModal.bgOpacity')}</span>
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
                <span className="text-[#858585]">{t('sessionModal.bgBlur')}</span>
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
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.bgFit')}</label>
              <select
                value={formData.backgroundFit || 'cover'}
                onChange={(e) => setFormData({ ...formData, backgroundFit: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="cover">{t("sessionAppearance.bgCover")}</option>
                <option value="contain">{t("sessionAppearance.bgContain")}</option>
                <option value="tile">{t("sessionAppearance.bgTile")}</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

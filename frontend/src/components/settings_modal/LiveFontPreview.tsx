import React from 'react';
import { Terminal as TerminalIcon, Eye } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface LiveFontPreviewProps {
  fontFamily: string;
  nonAsciiFontFamily?: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: string;
  fontWeightBold: string;
  enableLigatures: boolean;
  fontSmoothing?: string;
  cursorStyle?: string;
  cursorBlink?: boolean;
  themeObj: any;
  cursorColor?: string;
  cursorAccentColor?: string;
  selectionBackground?: string;
  selectionForeground?: string;
  customGlyphs?: boolean;
  drawBoldTextInBrightColors?: boolean;
}

export const LiveFontPreview: React.FC<LiveFontPreviewProps> = ({
  fontFamily,
  nonAsciiFontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  fontWeightBold,
  enableLigatures,
  fontSmoothing = 'antialiased',
  cursorStyle = 'block',
  cursorBlink = true,
  themeObj,
  cursorColor,
  cursorAccentColor,
  selectionBackground,
  selectionForeground,
  customGlyphs = true,
  drawBoldTextInBrightColors = true,
}) => {
  const { t } = useI18n();
  const combinedFont = nonAsciiFontFamily ? `${fontFamily}, ${nonAsciiFontFamily}` : fontFamily;
  const effectiveBg = themeObj?.background || '#181818';
  const effectiveFg = themeObj?.foreground || '#cccccc';
  const effectiveCursor = cursorColor || themeObj?.cursor || '#ffffff';
  const effectiveCursorAccent = cursorAccentColor || themeObj?.cursorAccent || '#000000';
  const effectiveSelectionBg = selectionBackground || themeObj?.selectionBackground || 'rgba(38, 79, 120, 0.6)';
  const effectiveSelectionFg = selectionForeground || themeObj?.selectionForeground || '#ffffff';

  // ANSI colors
  const ansi = {
    red: drawBoldTextInBrightColors ? (themeObj?.brightRed || '#f87171') : (themeObj?.red || '#ef4444'),
    green: drawBoldTextInBrightColors ? (themeObj?.brightGreen || '#4ade80') : (themeObj?.green || '#22c55e'),
    yellow: drawBoldTextInBrightColors ? (themeObj?.brightYellow || '#fde047') : (themeObj?.yellow || '#eab308'),
    blue: drawBoldTextInBrightColors ? (themeObj?.brightBlue || '#60a5fa') : (themeObj?.blue || '#3b82f6'),
    magenta: drawBoldTextInBrightColors ? (themeObj?.brightMagenta || '#c084fc') : (themeObj?.magenta || themeObj?.purple || '#a855f7'),
    cyan: drawBoldTextInBrightColors ? (themeObj?.brightCyan || '#38bdf8') : (themeObj?.cyan || '#06b6d4'),
  };

  const cursorClasses = cursorBlink ? 'animate-pulse' : '';

  return (
    <div className="rounded-md border border-[#2b2b2b] overflow-hidden shadow-sm bg-[#181818]">
      {/* 终端仿 macOS 窗体标题栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] border-b border-[#2b2b2b] select-none">
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 border border-[#dea123]/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 border border-[#1aab29]/50" />
          <span className="text-[10px] text-[#858585] font-mono ml-2 flex items-center gap-1">
            <TerminalIcon className="w-3 h-3 text-[#0078d4]" />
            {t('livePreview.title') || '实时外观仿真视口 (Live Terminal Preview)'}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-[#858585] font-mono">
          <span className="bg-[#252526] px-1.5 py-0.5 rounded border border-[#3c3c3c] text-[#cccccc]">
            {fontSize}px
          </span>
          <span className="bg-[#252526] px-1.5 py-0.5 rounded border border-[#3c3c3c] text-[#cccccc]">
            {fontWeight}
          </span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" /> {t('livePreview.wysiwyg') || '所见即所得'}
          </span>
        </div>
      </div>

      {/* 终端内容区 */}
      <div 
        className="p-3.5 select-text overflow-x-auto transition-all"
        style={{
          backgroundColor: effectiveBg,
          color: effectiveFg,
          fontFamily: combinedFont,
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          letterSpacing: `${letterSpacing}px`,
          fontWeight: fontWeight as any,
          fontVariantLigatures: enableLigatures ? 'normal' : 'none',
          WebkitFontSmoothing: fontSmoothing as any,
        }}
      >
        {/* Line 1: Powerline Prompt */}
        <div className="flex items-center whitespace-pre flex-wrap">
          <span style={{ color: ansi.cyan }}>╭─</span>
          <span style={{ color: ansi.yellow }}> ⚡ </span>
          <span style={{ color: ansi.green, fontWeight: fontWeightBold as any }}>dev@omniterminal</span>
          <span style={{ color: effectiveFg }}> in </span>
          <span style={{ color: ansi.blue, fontWeight: fontWeightBold as any }}>~/workspace</span>
          <span style={{ color: ansi.magenta }}> on </span>
          <span style={{ color: ansi.magenta, fontWeight: fontWeightBold as any }}> main</span>
          <span style={{ color: ansi.red }}> [!]</span>
        </div>

        {/* Line 2: Ligatures & Code */}
        <div className="whitespace-pre">
          <span style={{ color: ansi.cyan }}>╰─➤ </span>
          <span style={{ color: ansi.magenta, fontWeight: fontWeightBold as any }}>const</span>
          <span> isMatch </span>
          <span style={{ color: ansi.cyan }}>=</span>
          <span> (count </span>
          <span style={{ color: ansi.yellow }}>!==</span>
          <span> 0 </span>
          <span style={{ color: ansi.blue }}>&&</span>
          <span> threshold </span>
          <span style={{ color: ansi.yellow }}>&gt;=</span>
          <span> 10); </span>
          <span style={{ color: '#64748b' }}>// =&gt; true (Ligatures)</span>
        </div>

        {/* Line 3: CJK & Unicode Alignment */}
        <div className="whitespace-pre">
          <span style={{ color: ansi.green }}>✦ </span>
          <span>{t('livePreview.cjkAlign') || '全角字符宽度对齐：'}</span>
          <span style={{ color: ansi.yellow }}>{t('livePreview.cjkHello') || '你好，世界！'}</span>
          <span> 🚀 </span>
          <span style={{ color: ansi.blue }}>[0123456789]</span>
          <span style={{ color: '#64748b' }}>{t('livePreview.cjkTest') || ' (CJK/Emoji 测试)'}</span>
        </div>

        {/* Line 4: ANSI Color Pills & Selection simulation */}
        <div className="flex items-center gap-1.5 my-1 whitespace-pre flex-wrap">
          <span className="text-[10px] opacity-75 mr-1">{t('livePreview.palette') || '调色盘:'}</span>
          {Object.entries(ansi).map(([colorName, colorHex]) => (
            <span 
              key={colorName} 
              className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
              style={{ backgroundColor: `${colorHex}22`, borderColor: `${colorHex}44`, color: colorHex }}
            >
              {colorName}
            </span>
          ))}
        </div>

        {/* Line 5: Selected Text & Cursor */}
        <div className="flex items-center whitespace-pre mt-0.5">
          <span style={{ color: effectiveFg }}>$ echo "</span>
          <span 
            className="px-0.5 rounded-sm"
            style={{ 
              backgroundColor: effectiveSelectionBg, 
              color: effectiveSelectionFg,
              fontWeight: fontWeightBold as any,
            }}
          >
            {t('livePreview.version') || 'OmniTerminal 高性能工作台'}
          </span>
          <span style={{ color: effectiveFg }}>"</span>

          {/* Cursor Rendering */}
          {cursorStyle === 'block' && (
            <span 
              className={`inline-block ml-0.5 text-center px-0.5 ${cursorClasses}`}
              style={{ 
                backgroundColor: effectiveCursor, 
                color: effectiveCursorAccent,
                minWidth: `${Math.max(fontSize * 0.55, 8)}px`,
              }}
            >
              &nbsp;
            </span>
          )}
          {cursorStyle === 'underline' && (
            <span 
              className={`inline-block ml-0.5 border-b-2 ${cursorClasses}`}
              style={{ 
                borderColor: effectiveCursor, 
                width: `${Math.max(fontSize * 0.55, 8)}px`,
                height: `${fontSize}px`,
              }}
            />
          )}
          {cursorStyle === 'bar' && (
            <span 
              className={`inline-block ml-0.5 border-l-2 ${cursorClasses}`}
              style={{ 
                borderColor: effectiveCursor, 
                height: `${fontSize * 1.1}px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, RotateCcw, FastForward, Upload, Copy, Check, Film, Clock, Download } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ClipboardSetText } from '../../wailsjs/runtime/runtime';
import { useI18n } from '../i18n/I18nContext';

interface CastHeader {
  version: number;
  width: number;
  height: number;
  timestamp?: number;
  title?: string;
  env?: Record<string, string>;
}

interface CastEvent {
  time: number; // in seconds
  type: string; // 'o' (output) or 'i' (input)
  data: string;
}

interface SessionCastPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCastContent?: string;
  initialTitle?: string;
}

export function SessionCastPlayerModal({
  isOpen,
  onClose,
  initialCastContent,
  initialTitle
}: SessionCastPlayerModalProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [header, setHeader] = useState<CastHeader | null>(null);
  const [events, setEvents] = useState<CastEvent[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [copyNotice, setCopyNotice] = useState(false);
  const [rawCastText, setRawCastText] = useState('');

  const nextEventIndexRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 解析 .cast 文件内容
  const parseCastContent = (content: string) => {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        alert(t('sessionCast.invalidFile') || '无效的 .cast 录像文件 (行数过少)');
        return;
      }

      const parsedHeader: CastHeader = JSON.parse(lines[0]);
      setHeader(parsedHeader);

      const parsedEvents: CastEvent[] = [];
      let maxTime = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const item = JSON.parse(line);
          if (Array.isArray(item) && item.length >= 3) {
            const time = Number(item[0]);
            const type = String(item[1]);
            const data = String(item[2]);
            parsedEvents.push({ time, type, data });
            if (time > maxTime) maxTime = time;
          }
        } catch (e) {
          // ignore corrupted lines
        }
      }

      setEvents(parsedEvents);
      setTotalDuration(maxTime);
      setCurrentTime(0);
      nextEventIndexRef.current = 0;
      setRawCastText(content);

      if (termRef.current) {
        termRef.current.reset();
        termRef.current.write(`\x1b[32m${t('sessionCast.loadComplete') || '[录像加载完成，点击播放开始回放]'}\x1b[0m\r\n`);
      }
    } catch (err: any) {
      alert((t('sessionCast.parseError') || '解析 .cast 文件失败: ') + String(err));
    }
  };

  useEffect(() => {
    if (initialCastContent) {
      parseCastContent(initialCastContent);
    }
  }, [initialCastContent, isOpen]);

  // 初始化 xterm 实例
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const term = new Terminal({
      cols: header?.width || 80,
      rows: header?.height || 24,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#0e1117',
        foreground: '#d4d4d4',
        cursor: '#00ff00',
      },
      cursorBlink: false,
      disableStdin: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    if (!initialCastContent && events.length === 0) {
      term.write(`\x1b[36m${t('sessionCast.emptyHint') || '请点击上方“打开 .cast 录像”或直接将录像文件载入'}\x1b[0m\r\n`);
    }

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      termRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen]);

  // 播放循环动画
  const tick = (now: number) => {
    if (!isPlayingRef.current) return;

    const delta = (now - lastWallTimeRef.current) / 1000;
    lastWallTimeRef.current = now;

    setCurrentTime((prevTime) => {
      const newTime = prevTime + delta * playbackSpeed;

      if (!termRef.current) return newTime;

      // 输出所有 <= newTime 的事件
      while (
        nextEventIndexRef.current < events.length &&
        events[nextEventIndexRef.current].time <= newTime
      ) {
        const ev = events[nextEventIndexRef.current];
        if (ev.type === 'o') {
          termRef.current.write(ev.data);
        }
        nextEventIndexRef.current++;
      }

      if (newTime >= totalDuration) {
        setIsPlaying(false);
        return totalDuration;
      }

      return newTime;
    });

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const handlePlayPause = () => {
    if (!events.length) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      if (currentTime >= totalDuration) {
        // 重播
        handleSeek(0);
      }
      setIsPlaying(true);
      lastWallTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(tick);
    }
  };

  // 快进 / 进度条拖拽定位
  const handleSeek = (targetTime: number) => {
    if (!termRef.current) return;
    const term = termRef.current;
    term.reset();

    const target = Math.max(0, Math.min(targetTime, totalDuration));
    setCurrentTime(target);

    // 重新从 0 遍历到 target 写入所有事件
    let idx = 0;
    while (idx < events.length && events[idx].time <= target) {
      const ev = events[idx];
      if (ev.type === 'o') {
        term.write(ev.data);
      }
      idx++;
    }
    nextEventIndexRef.current = idx;
  };

  // 处理本地文件上传导入
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseCastContent(text);
      }
    };
    reader.readAsText(file);
  };

  // 导出当前录像为 .cast 文件下载
  const handleExportCast = () => {
    if (!rawCastText) return;
    const blob = new Blob([rawCastText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniterminal_recording_${Date.now()}.cast`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出动态 SVG 矢量图
  const handleExportSVG = () => {
    if (!events.length) return;
    const cleanLines = events
      .filter((e) => e.type === 'o')
      .map((e) => e.data)
      .join('')
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .split('\n')
      .slice(0, 40);

    const escapedLines = cleanLines.map((line) =>
      line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    );

    const svgWidth = 800;
    const svgHeight = Math.max(400, cleanLines.length * 20 + 80);

    const textElements = escapedLines
      .map((line, i) => `    <text x="25" y="${65 + i * 20}" fill="#e2e8f0" font-family="JetBrains Mono, monospace" font-size="12">${line || ' '}</text>`)
      .join('\n');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <style>
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    .cursor { animation: blink 1s infinite; fill: #0078d4; }
    .window-bg { fill: #1e1e1e; rx: 6px; }
    .header-bg { fill: #1f1f1f; }
  </style>
  <rect width="100%" height="100%" class="window-bg" stroke="#2b2b2b" stroke-width="1.5" rx="6"/>
  <rect width="100%" height="36" class="header-bg" rx="6"/>
  <rect y="24" width="100%" height="12" class="header-bg"/>
  <circle cx="20" cy="18" r="5.5" fill="#ef4444"/>
  <circle cx="38" cy="18" r="5.5" fill="#f59e0b"/>
  <circle cx="56" cy="18" r="5.5" fill="#10b981"/>
  <text x="${svgWidth / 2}" y="22" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">OmniTerminal Session Cast</text>
  <g id="terminal-content">
${textElements}
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniterminal_cast_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 截图当前终端快照为 PNG
  const handleExportSnapshot = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal_snapshot_${Date.now()}.png`;
      a.click();
    } else {
      handleExportSVG();
    }
  };

  // 提取全部纯文本
  const handleCopyTranscript = () => {
    if (!events.length) return;
    const fullText = events
      .filter((e) => e.type === 'o')
      .map((e) => e.data)
      .join('')
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ''); // 移除 ANSI 控制序列
    ClipboardSetText(fullText);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-4xl flex flex-col text-[#cccccc] text-xs overflow-hidden h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e0e0e0] leading-tight flex items-center gap-2">
                <span>{initialTitle || t('sessionCast.title')}</span>
                {header && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#04395e]/40 text-[#0078d4] border border-[#0078d4]/30">
                    {header.width} × {header.height} | {events.length}
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-[#858585] font-normal">
                Asciinema v2 Cast Player
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] cursor-pointer transition-colors flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>{t('sessionCast.openCast')}</span>
              <input type="file" accept=".cast,.json,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {rawCastText && (
              <>
                <button
                  onClick={handleExportCast}
                  className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors flex items-center space-x-1.5"
                  title=".cast"
                >
                  <Download className="w-3.5 h-3.5 text-[#4ec9b0]" />
                  <span>{t('sessionCast.exportCast')}</span>
                </button>
                <button
                  onClick={handleExportSVG}
                  className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors flex items-center space-x-1.5"
                  title="SVG"
                >
                  <Download className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>{t('sessionCast.exportSvg')}</span>
                </button>
                <button
                  onClick={handleExportSnapshot}
                  className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors flex items-center space-x-1.5"
                  title="PNG"
                >
                  <Download className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>{t('sessionCast.snapshotPng')}</span>
                </button>
              </>
            )}
            <button
              onClick={handleCopyTranscript}
              className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors flex items-center space-x-1.5"
              title="Copy"
            >
              {copyNotice ? <Check className="w-3.5 h-3.5 text-[#4ec9b0]" /> : <Copy className="w-3.5 h-3.5 text-[#cca700]" />}
              <span>{copyNotice ? t('common.copied', '已复制') : t('sessionCast.copyText')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#858585] hover:text-[#cccccc] rounded hover:bg-[#333333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Screen Viewport */}
        <div className="flex-1 bg-[#181818] p-3 overflow-hidden min-h-0 relative">
          <div ref={containerRef} className="w-full h-full rounded overflow-hidden border border-[#2b2b2b]" />
        </div>

        {/* Playback Control Bar */}
        <div className="bg-[#1f1f1f] border-t border-[#2b2b2b] p-3 flex flex-col gap-2 shrink-0">
          {/* Scrubber Progress Slider */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#0078d4] w-12 text-right">
              {formatSeconds(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={totalDuration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 accent-[#0078d4] h-1.5 bg-[#3c3c3c] rounded cursor-pointer transition-all"
            />
            <span className="font-mono text-[11px] text-[#858585] w-12">
              {formatSeconds(totalDuration)}
            </span>
          </div>

          {/* Controls Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlayPause}
                disabled={events.length === 0}
                className="px-3.5 py-1 rounded bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? t('sessionCast.pause') : t('sessionCast.play')}</span>
              </button>

              <button
                onClick={() => handleSeek(0)}
                disabled={events.length === 0}
                className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors disabled:opacity-50"
                title={t('sessionCast.restart') || '重新开始'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center space-x-1 bg-[#181818] p-0.5 rounded border border-[#2b2b2b]">
              <span className="text-[10px] text-[#858585] px-1.5 flex items-center gap-1">
                <FastForward className="w-3 h-3 text-[#0078d4]" />
                {t('sessionCast.speed') || '倍速:'}
              </span>
              {[0.5, 1.0, 1.5, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-[#04395e] text-white'
                      : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

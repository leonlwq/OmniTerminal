import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Printer, FileText, Copy, Check, Eye, Download, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export interface PrintTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: { id: string; name: string; host?: string; user?: string } | null;
  getLines?: () => string[];
  terminal?: any;
}

export const PrintTerminalModal: React.FC<PrintTerminalModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  getLines,
  terminal,
}) => {
  const { t } = useI18n();
  const [scope, setScope] = useState<'visible' | 'all' | 'selection'>('visible');
  const [themeStyle, setThemeStyle] = useState<'paper' | 'dark'>('paper');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [fontSize, setFontSize] = useState<11 | 13 | 15>(12 as any);
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 选中文本检测
  const selectionText = useMemo(() => {
    if (!isOpen || !terminal) return '';
    try {
      if (typeof terminal.getSelection === 'function') {
        return terminal.getSelection() || '';
      }
    } catch {
      // ignore
    }
    return '';
  }, [isOpen, terminal]);

  // 若有选中文本，打开时默认选中有选区
  useEffect(() => {
    if (isOpen) {
      if (selectionText && selectionText.trim().length > 0) {
        setScope('selection');
      } else {
        setScope('visible');
      }
    }
  }, [isOpen, selectionText]);

  // 计算打印内容行
  const printLines = useMemo<string[]>(() => {
    if (!isOpen) return [];

    if (scope === 'selection') {
      if (!selectionText) return [];
      return selectionText.split(/\r?\n/);
    }

    if (scope === 'visible' && terminal && terminal.buffer && terminal.buffer.active) {
      try {
        const buf = terminal.buffer.active;
        const rows = terminal.rows || 30;
        const startY = Math.max(0, buf.baseY);
        const lines: string[] = [];
        for (let i = startY; i < startY + rows; i++) {
          const line = buf.getLine(i);
          if (line) {
            lines.push(line.translateToString(true));
          }
        }
        // 去除尾部多余的空行
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
          lines.pop();
        }
        return lines.length > 0 ? lines : ['(当前屏幕暂无输出内容)'];
      } catch (e) {
        console.warn('Get visible buffer failed, falling back:', e);
      }
    }

    // 全部会话滚动缓冲区
    if (getLines) {
      const allLines = getLines();
      if (scope === 'visible') {
        return allLines.slice(-40);
      }
      return allLines;
    }

    return [];
  }, [isOpen, scope, selectionText, terminal, getLines]);

  const totalChars = useMemo(() => {
    return printLines.reduce((acc, l) => acc + l.length, 0);
  }, [printLines]);

  if (!isOpen) return null;

  // 生成打印用独立 HTML
  const generatePrintHTML = () => {
    const title = activeTab?.name || 'OmniTerminal Print';
    const host = activeTab?.host ? `${activeTab.user ? activeTab.user + '@' : ''}${activeTab.host}` : 'Local Session';
    const timestamp = new Date().toLocaleString();

    const formattedLines = printLines.map((line, idx) => {
      const lineNum = showLineNumbers
        ? `<span class="line-num">${String(idx + 1).padStart(String(printLines.length).length, ' ')} </span>`
        : '';
      // HTML 转义
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      return `<div class="code-line">${lineNum}<span class="code-text">${escaped}</span></div>`;
    }).join('');

    const isPaper = themeStyle === 'paper';
    const bgCol = isPaper ? '#ffffff' : '#1e1e1e';
    const textCol = isPaper ? '#111827' : '#e5e7eb';
    const lineNumCol = isPaper ? '#9ca3af' : '#6b7280';
    const headerBorder = isPaper ? '#e5e7eb' : '#374151';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Print</title>
  <style>
    @page {
      size: auto;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 15px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: ${fontSize}px;
      line-height: 1.5;
      background-color: ${bgCol};
      color: ${textCol};
    }
    .print-header {
      border-bottom: 2px solid ${headerBorder};
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .print-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: ${isPaper ? '#0f172a' : '#f8fafc'};
    }
    .print-meta {
      font-size: 11px;
      color: ${isPaper ? '#64748b' : '#94a3b8'};
    }
    .print-footer {
      border-top: 1px solid ${headerBorder};
      margin-top: 20px;
      padding-top: 8px;
      font-size: 10px;
      color: ${isPaper ? '#94a3b8' : '#64748b'};
      display: flex;
      justify-content: space-between;
    }
    .code-container {
      white-space: pre-wrap;
      word-break: break-all;
    }
    .code-line {
      display: flex;
    }
    .line-num {
      user-select: none;
      color: ${lineNumCol};
      margin-right: 12px;
      text-align: right;
      display: inline-block;
      flex-shrink: 0;
    }
    .code-text {
      flex: 1;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
        padding: 0;
      }
      .line-num {
        color: #888888 !important;
      }
    }
  </style>
</head>
<body>
  ${showHeader ? `
  <div class="print-header">
    <div>
      <div class="print-title">🖥️ ${title}</div>
      <div class="print-meta">Host: ${host}</div>
    </div>
    <div class="print-meta" style="text-align: right;">
      <div>OmniTerminal Terminal Print</div>
      <div>Time: ${timestamp}</div>
    </div>
  </div>` : ''}

  <div class="code-container">
    ${formattedLines}
  </div>

  ${showHeader ? `
  <div class="print-footer">
    <span>Printed by OmniTerminal</span>
    <span>Total ${printLines.length} lines</span>
  </div>` : ''}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;
  };

  // 执行系统打印
  const handlePrint = async () => {
    setIsPrinting(true);
    const html = generatePrintHTML();

    try {
      // 1. 尝试通过前端隐藏 iframe 进行轻量打印
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print call failed:', e);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 60000);
        }, 200);
      }

      // 2. 同时调用后端 PrintTerminalDocument 作为保底（确保在 macOS WKWebView 等特殊环境下 100% 呼起原生打印）
      const wailsApp = (window as any).go?.app?.App;
      if (wailsApp && wailsApp.PrintTerminalDocument) {
        await wailsApp.PrintTerminalDocument(activeTab?.name || 'terminal_print', html);
      }
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // 另存为 HTML 文件
  const handleExportHtml = async () => {
    const html = generatePrintHTML();
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (wailsApp && wailsApp.SaveTerminalLog) {
        const safeName = (activeTab?.name || 'terminal').replace(/[^a-zA-Z0-9_-]/g, '_');
        await wailsApp.SaveTerminalLog(html, `${safeName}_print_${Date.now()}.html`);
      }
    } catch (e) {
      console.error('SaveTerminalLog error:', e);
    }
  };

  // 复制文本
  const handleCopyText = async () => {
    const text = printLines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-[#cccccc]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2b2b2b] bg-[#181818] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0078d4]/20 border border-[#0078d4]/40 flex items-center justify-center text-[#3794ff]">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                {t('print.modalTitle', '终端打印与导出预览')}
              </h2>
              <p className="text-[11px] text-[#858585]">
                {activeTab?.name ? `🖥️ ${activeTab.name} (${activeTab.host || 'local'})` : t('print.noActiveSession', '未选择会话')}
                {' · '}
                {t('print.linesCount', '共 {lines} 行，{chars} 字符')
                  .replace('{lines}', String(printLines.length))
                  .replace('{chars}', String(totalChars))}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 text-[#858585] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Left Configuration + Right Paper Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧控制栏 */}
          <div className="w-72 border-r border-[#2b2b2b] bg-[#161616] p-4 flex flex-col justify-between shrink-0 overflow-y-auto space-y-4 text-xs">
            <div className="space-y-4">
              {/* 打印范围 */}
              <div>
                <label className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider block mb-2">
                  {t('print.scope', '打印范围')}
                </label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-[#252526] cursor-pointer">
                    <input
                      type="radio"
                      name="print_scope"
                      checked={scope === 'visible'}
                      onChange={() => setScope('visible')}
                      className="accent-[#0078d4]"
                    />
                    <span>{t('print.scopeVisible', '当前可视屏幕')}</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded hover:bg-[#252526] cursor-pointer">
                    <input
                      type="radio"
                      name="print_scope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="accent-[#0078d4]"
                    />
                    <span>{t('print.scopeAll', '全部会话缓冲区')}</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-1.5 rounded ${
                      selectionText ? 'hover:bg-[#252526] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="radio"
                      name="print_scope"
                      disabled={!selectionText}
                      checked={scope === 'selection'}
                      onChange={() => setScope('selection')}
                      className="accent-[#0078d4]"
                    />
                    <span>{t('print.scopeSelection', '当前选中文本')} {!selectionText && t('print.noSelection', '(无选区)')}</span>
                  </label>
                </div>
              </div>

              {/* 纸张样式 */}
              <div>
                <label className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider block mb-2">
                  {t('print.theme', '纸张风格')}
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[#1f1f1f] p-1 rounded-md border border-[#333333]">
                  <button
                    type="button"
                    onClick={() => setThemeStyle('paper')}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      themeStyle === 'paper' ? 'bg-[#0078d4] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                  >
                    {t('print.themePaper', '白底纸张')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeStyle('dark')}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      themeStyle === 'dark' ? 'bg-[#0078d4] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                  >
                    {t('print.themeDark', '暗黑模式')}
                  </button>
                </div>
              </div>

              {/* 版式开关 */}
              <div>
                <label className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider block mb-2">
                  {t('common.options', '版式选项')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLineNumbers}
                      onChange={e => setShowLineNumbers(e.target.checked)}
                      className="accent-[#0078d4] rounded"
                    />
                    <span>{t('print.showLineNumbers', '显示行号')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHeader}
                      onChange={e => setShowHeader(e.target.checked)}
                      className="accent-[#0078d4] rounded"
                    />
                    <span>{t('print.showHeader', '显示页眉与时间戳')}</span>
                  </label>
                </div>
              </div>

              {/* 字体字阶 */}
              <div>
                <label className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider block mb-2">
                  {t('print.fontSize', '字体字阶')}
                </label>
                <div className="grid grid-cols-3 gap-1 bg-[#1f1f1f] p-0.5 rounded border border-[#333333]">
                  {[11, 13, 15].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size as any)}
                      className={`py-1 text-center rounded text-xs transition-colors ${
                        fontSize === size ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-white'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 辅助按钮 */}
            <div className="space-y-2 pt-2 border-t border-[#2b2b2b]">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#252526] hover:bg-[#333333] border border-[#3c3c3c] rounded text-xs text-[#cccccc] hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('print.copied', '已复制') : t('print.copyText', '复制文本')}</span>
              </button>
              <button
                type="button"
                onClick={handleExportHtml}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#252526] hover:bg-[#333333] border border-[#3c3c3c] rounded text-xs text-[#cccccc] hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#3794ff]" />
                <span>{t('print.exportHtml', '另存为 HTML/PDF')}</span>
              </button>
            </div>
          </div>

          {/* 右侧仿真 A4 纸张预览区 */}
          <div className="flex-1 bg-[#0f0f10] p-6 overflow-auto flex justify-center items-start">
            <div
              ref={previewRef}
              style={{
                backgroundColor: themeStyle === 'paper' ? '#ffffff' : '#1e1e1e',
                color: themeStyle === 'paper' ? '#111827' : '#e5e7eb',
                fontSize: `${fontSize}px`,
              }}
              className="w-full max-w-2xl min-h-[500px] shadow-2xl rounded p-8 font-mono leading-relaxed transition-all duration-150 border border-black/10 select-text"
            >
              {showHeader && (
                <div
                  style={{
                    borderColor: themeStyle === 'paper' ? '#e5e7eb' : '#374151',
                  }}
                  className="border-b-2 pb-3 mb-4 flex items-end justify-between text-xs"
                >
                  <div>
                    <h3
                      style={{ color: themeStyle === 'paper' ? '#0f172a' : '#f8fafc' }}
                      className="text-sm font-bold m-0"
                    >
                      🖥️ {activeTab?.name || 'OmniTerminal'}
                    </h3>
                    <p
                      style={{ color: themeStyle === 'paper' ? '#64748b' : '#94a3b8' }}
                      className="text-[11px] m-0"
                    >
                      Host: {activeTab?.host ? `${activeTab.user ? activeTab.user + '@' : ''}${activeTab.host}` : 'local'}
                    </p>
                  </div>
                  <div
                    style={{ color: themeStyle === 'paper' ? '#64748b' : '#94a3b8' }}
                    className="text-[10px] text-right"
                  >
                    <div>OmniTerminal Terminal Print</div>
                    <div>{new Date().toLocaleString()}</div>
                  </div>
                </div>
              )}

              <div className="whitespace-pre-wrap break-all space-y-0.5">
                {printLines.map((line, idx) => (
                  <div key={idx} className="flex">
                    {showLineNumbers && (
                      <span
                        style={{ color: themeStyle === 'paper' ? '#9ca3af' : '#6b7280' }}
                        className="select-none mr-3 text-right shrink-0"
                      >
                        {String(idx + 1).padStart(String(printLines.length).length, ' ')}
                      </span>
                    )}
                    <span className="flex-1">{line || ' '}</span>
                  </div>
                ))}
              </div>

              {showHeader && (
                <div
                  style={{
                    borderColor: themeStyle === 'paper' ? '#e5e7eb' : '#374151',
                    color: themeStyle === 'paper' ? '#94a3b8' : '#64748b',
                  }}
                  className="border-t mt-6 pt-2 text-[10px] flex justify-between"
                >
                  <span>Printed by OmniTerminal</span>
                  <span>Total {printLines.length} lines</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[#2b2b2b] bg-[#181818] flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs text-[#858585] hover:text-white hover:bg-white/10 transition-colors"
          >
            {t('common.cancel', '取消')}
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting || printLines.length === 0}
            className="flex items-center gap-2 px-5 py-1.5 bg-[#0078d4] hover:bg-[#0062ab] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isPrinting ? t('common.loading', '正在调用...') : t('print.doPrint', '发送至打印机')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

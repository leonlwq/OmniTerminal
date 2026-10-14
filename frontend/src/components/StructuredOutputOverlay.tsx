import { useI18n } from '../i18n/I18nContext';
import React, { useState, useMemo } from 'react';
import {
  X,
  Table,
  FileCode,
  Download,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface StructuredOutputOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  command?: string;
}

export const StructuredOutputOverlay: React.FC<StructuredOutputOverlayProps> = ({
  isOpen,
  onClose,
  rawText,
  command = '',
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'table' | 'json' | 'raw'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. 尝试解析为 JSON
  const parsedJSON = useMemo(() => {
    if (!rawText) return null;
    const trimmed = rawText.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch (_) {
        // 尝试提取其中的 JSON 块
        const firstBrace = trimmed.indexOf('{');
        const firstBracket = trimmed.indexOf('[');
        const startIdx = firstBrace !== -1 && firstBracket !== -1 ? Math.min(firstBrace, firstBracket) : (firstBrace !== -1 ? firstBrace : firstBracket);
        if (startIdx !== -1) {
          try {
            return JSON.parse(trimmed.slice(startIdx));
          } catch (_) {
            return null;
          }
        }
      }
    }
    return null;
  }, [rawText]);

  // 2. 尝试解析为等宽表格 (如 docker ps, kubectl get, ps aux, df -h)
  const parsedTable = useMemo(() => {
    if (!rawText) return null;
    const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;

    // 假设第一行为表头
    const headerLine = lines[0];
    
    // 匹配连续多个空格作为列分隔符 (两空格及以上)
    const colRegex = /\s{2,}/;
    const headers = headerLine.split(colRegex).map(h => h.trim()).filter(Boolean);
    if (headers.length < 2) return null;

    // 解析数据行
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // 按照类似分隔切分
      const cols = line.split(colRegex).map(c => c.trim());
      if (cols.length > 0) {
        // 规范化列数量匹配表头
        const row: string[] = [];
        for (let j = 0; j < headers.length; j++) {
          row.push(cols[j] || '');
        }
        rows.push(row);
      }
    }

    if (rows.length === 0) return null;
    return { headers, rows };
  }, [rawText]);

  // 自动选择最佳解析 Tab
  React.useEffect(() => {
    if (parsedJSON) {
      setActiveTab('json');
    } else if (parsedTable) {
      setActiveTab('table');
    } else {
      setActiveTab('raw');
    }
  }, [parsedJSON, parsedTable]);

  if (!isOpen) return null;

  // 过滤与排序表格数据
  const filteredRows = parsedTable?.rows.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return row.some(cell => cell.toLowerCase().includes(term));
  }) || [];

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (sortCol === null) return 0;
    const valA = a[sortCol] || '';
    const valB = b[sortCol] || '';
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortAsc ? numA - numB : numB - numA;
    }
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(idx);
      setSortAsc(true);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportCSV = () => {
    if (!parsedTable) return;
    const lines = [
      parsedTable.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...sortedRows.map(row => row.map(c => `"${c.replace(/"/g, '""')}"`).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    let dataToExport = parsedJSON;
    if (!dataToExport && parsedTable) {
      dataToExport = sortedRows.map(row => {
        const obj: Record<string, string> = {};
        parsedTable.headers.forEach((h, idx) => {
          obj[h] = row[idx] || '';
        });
        return obj;
      });
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-text">
      <div
        className={`bg-[#1e1e1e] border border-[#2b2b2b] rounded-md shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isExpanded ? 'w-full h-full' : 'w-[90%] max-w-5xl h-[82%]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
              {t('structOut.title') || '📊 终端输出语义化结构视图'}
            </span>
            {command && (
              <span className="px-2 py-0.5 rounded bg-[#252526] border border-[#3c3c3c] text-xs font-mono text-[#3794ff] max-w-xs truncate">
                $ {command}
              </span>
            )}
            {/* View Mode Tabs */}
            <div className="flex items-center bg-[#181818] p-0.5 rounded border border-[#2b2b2b]">
              {parsedTable && (
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'table' ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  {(t('structOut.tableTab') || '表格 ({count})').replace('{count}', String(parsedTable.rows.length))}
                </button>
              )}
              {parsedJSON && (
                <button
                  onClick={() => setActiveTab('json')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'json' ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  {t('structOut.jsonTreeTab') || 'JSON 树'}
                </button>
              )}
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'raw' ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                {t('structOut.rawTextTab') || '原始文本'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(parsedTable || parsedJSON) && (
              <button
                onClick={parsedTable ? exportCSV : exportJSON}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] text-xs text-[#cccccc] hover:text-white transition-colors"
                title={t('structOut.exportTooltip') || '导出数据'}
              >
                <Download className="w-3.5 h-3.5" />
                {(t('structOut.exportAction') || '导出 {format}').replace('{format}', parsedTable ? 'CSV' : 'JSON')}
              </button>
            )}
            <button
              onClick={() => handleCopy(rawText)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] text-xs text-[#cccccc] hover:text-white transition-colors"
              title={t('structOut.copyRawTooltip') || '复制原始输出'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? (t('structOut.copied') || '已复制') : (t('structOut.copy') || '复制')}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-colors"
              title={isExpanded ? (t('structOut.restoreSize') || '还原尺寸') : (t('structOut.maximize') || '最大化')}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar for Table/JSON */}
        {activeTab === 'table' && parsedTable && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b]">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#858585]" />
              <input
                type="text"
                placeholder={t('structOut.searchPlaceholder') || '搜索表格内容...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-[#858585] hover:text-[#cccccc] text-xs">
                  ✕
                </button>
              )}
            </div>
            <div className="text-[11px] text-[#858585] font-mono">
              {(t('structOut.tableStats') || '共 {rows} 行 / {cols} 列').replace('{rows}', String(sortedRows.length)).replace('{cols}', String(parsedTable.headers.length))}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          {activeTab === 'table' && parsedTable && (
            <div className="overflow-x-auto border border-[#2b2b2b] rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#252526] text-[#cccccc] border-b border-[#2b2b2b]">
                    {parsedTable.headers.map((header, idx) => (
                      <th
                        key={idx}
                        onClick={() => handleSort(idx)}
                        className="px-3 py-2 font-semibold select-none cursor-pointer hover:bg-[#2d3139] transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          <ArrowUpDown className="w-3 h-3 text-[#858585]" />
                          {sortCol === idx && (
                            <span className="text-[10px] text-[#0078d4]">{sortAsc ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b]">
                  {sortedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#2a2d2e] transition-colors text-[#cccccc]">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs hover:text-white"
                          title={cell}
                          onClick={() => handleCopy(cell)}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={parsedTable.headers.length} className="text-center py-8 text-[#858585]">
                        {t('structOut.noMatches') || '未匹配到符合过滤条件的数据'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'json' && parsedJSON && (
            <div className="bg-[#181818] p-4 rounded border border-[#2b2b2b] text-[#cccccc] overflow-auto">
              <JSONTreeViewer data={parsedJSON} />
            </div>
          )}

          {activeTab === 'raw' && (
            <pre className="text-[#cccccc] bg-[#181818] p-4 rounded border border-[#2b2b2b] whitespace-pre overflow-auto font-mono text-xs">
              {rawText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

// 交互式可折叠 {t('structOut.jsonTreeTab') || 'JSON 树'}形组件
const JSONTreeViewer: React.FC<{ data: any; label?: string; isLast?: boolean }> = ({
  data,
  label,
  isLast = true,
}) => {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (data === null) {
    return (
      <div className="pl-4">
        {label && <span className="text-purple-300">"{label}": </span>}
        <span className="text-slate-500">null</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="pl-4">
        {label && <span className="text-purple-300">"{label}": </span>}
        <span className="text-amber-400">{data ? 'true' : 'false'}</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div className="pl-4">
        {label && <span className="text-purple-300">"{label}": </span>}
        <span className="text-cyan-400">{data}</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  if (typeof data === 'string') {
    return (
      <div className="pl-4">
        {label && <span className="text-purple-300">"{label}": </span>}
        <span className="text-emerald-400">"{data}"</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const keys = isArray ? data : Object.keys(data);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="pl-4">
      <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        {label && <span className="text-purple-300">"{label}": </span>}
        <span className="text-slate-400">{openBracket}</span>
        {isCollapsed && (
          <span className="text-[#858585] text-[10px] ml-1 bg-[#252526] px-1 rounded border border-[#2b2b2b]">
            ... {isArray ? (t('structOut.itemsCount') || '{count} 项').replace('{count}', String(data.length)) : (t('structOut.keysCount') || '{count} 键').replace('{count}', String(Object.keys(data).length))} ...
          </span>
        )}
        {isCollapsed && <span className="text-[#858585]">{closeBracket}</span>}
      </div>

      {!isCollapsed && (
        <div className="border-l border-[#2b2b2b] ml-1.5 my-0.5">
          {isArray
            ? data.map((item: any, idx: number) => (
                <JSONTreeViewer key={idx} data={item} isLast={idx === data.length - 1} />
              ))
            : Object.entries(data).map(([k, v], idx, arr) => (
                <JSONTreeViewer key={k} label={k} data={v} isLast={idx === arr.length - 1} />
              ))}
        </div>
      )}

      {!isCollapsed && (
        <div className="pl-1 text-slate-400">
          {closeBracket}
          {!isLast && ','}
        </div>
      )}
    </div>
  );
};

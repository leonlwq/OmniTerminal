import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, FileCode, FileText, Download, Copy, Check, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from 'lucide-react';

interface SftpPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
const CODE_EXTS = [
  '.txt', '.log', '.yaml', '.yml', '.json', '.xml', '.sh', '.bash', '.py', '.go',
  '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.conf', '.ini', '.env', '.md',
  '.sql', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.toml', '.properties'
];

export function SftpPreviewModal({
  isOpen,
  onClose,
  sessionId,
  filePath,
  fileName,
  fileSize = 0,
}: SftpPreviewModalProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  const ext = (fileName.substring(fileName.lastIndexOf('.')) || '').toLowerCase();
  const isImage = IMAGE_EXTS.includes(ext);
  const isTextOrCode = CODE_EXTS.includes(ext) || (!isImage && fileSize < 2 * 1024 * 1024);

  useEffect(() => {
    if (!isOpen || !sessionId || !filePath) return;

    setContent('');
    setError(null);
    setZoom(1);
    setIsLoading(true);

    const loadFile = async () => {
      try {
        const appRpc = (window as any).go?.app?.App;
        if (appRpc?.SftpReadFile) {
          const res = await appRpc.SftpReadFile(sessionId, filePath);
          setContent(res || '');
        } else {
          setError('SFTP 文件读取功能不可用');
        }
      } catch (err: any) {
        console.error('Failed to preview file', err);
        setError(err?.message || '读取文件内容失败，请检查远端文件权限');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [isOpen, sessionId, filePath, isImage]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = async () => {
    try {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.SftpDownloadFile) {
        await appRpc.SftpDownloadFile(sessionId, filePath);
      } else if (appRpc?.SaveFileDialog && appRpc?.SftpDownloadPaths) {
        const dest = await appRpc.SaveFileDialog(fileName);
        if (dest) {
          await appRpc.SftpDownloadPaths(sessionId, [filePath], dest);
          alert('下载完成: ' + dest);
        }
      }
    } catch (e: any) {
      alert('下载失败: ' + e?.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[860px] max-h-[88vh] flex flex-col text-[#cccccc] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] shrink-0">
              {isImage ? <ImageIcon className="w-3.5 h-3.5" /> : isTextOrCode ? <FileCode className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#e0e0e0] leading-tight truncate">{fileName}</h3>
              <div className="flex items-center gap-2 text-[11px] text-[#858585] font-mono">
                <span className="truncate max-w-[320px]">{filePath}</span>
                <span>·</span>
                <span>{formatSize(fileSize)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <div className="flex items-center gap-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded p-0.5 text-xs text-[#cccccc]">
                <button 
                  onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.25))}
                  className="p-1 hover:bg-[#333333] rounded"
                  title="缩小"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[10px]">{Math.round(zoom * 100)}%</span>
                <button 
                  onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                  className="p-1 hover:bg-[#333333] rounded"
                  title="放大"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setZoom(1)}
                  className="p-1 hover:bg-[#333333] rounded"
                  title="重置缩放"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!isImage && content && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
                title="复制全文"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#89d185]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-xs font-medium transition-colors shadow-sm"
              title="下载到本地"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载</span>
            </button>

            <button
              onClick={onClose}
              className="text-[#858585] hover:text-[#e0e0e0] rounded p-1.5 hover:bg-[#333333] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Preview Area */}
        <div className="flex-1 overflow-auto p-4 bg-[#181818] min-h-[360px] max-h-[600px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#858585] space-y-3">
              <div className="w-8 h-8 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin" />
              <div className="text-xs">正在从远端服务器加载文件预览...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#f48771] space-y-3 max-w-md text-center">
              <AlertCircle className="w-10 h-10 opacity-70" />
              <div className="text-sm font-semibold">无法预览此文件</div>
              <div className="text-xs text-[#858585]">{error}</div>
            </div>
          ) : isImage ? (
            <div className="overflow-auto max-h-[560px] max-w-full flex items-center justify-center p-4">
              <img
                src={content.startsWith('data:') ? content : `data:image/${ext.replace('.', '')};base64,${content}`}
                alt={fileName}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[500px] max-w-full object-contain rounded shadow-lg transition-transform duration-150"
              />
            </div>
          ) : isTextOrCode ? (
            <div className="w-full h-full text-left overflow-auto font-mono text-xs text-[#cccccc] bg-[#1e1e1e] p-4 rounded border border-[#2b2b2b] select-text">
              <pre className="leading-relaxed whitespace-pre-wrap break-all font-mono">
                {content}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-[#858585] space-y-3">
              <FileText className="w-12 h-12 text-[#555555]" />
              <div className="text-sm font-semibold text-[#cccccc]">二进制文件，暂不支持在线直显预览</div>
              <div className="text-xs text-[#858585]">建议点击右上角「下载」保存至本地或使用外部编辑器打开</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585] shrink-0">
          <div className="flex items-center gap-3">
            <span>格式: <strong className="text-[#cccccc]">{ext.toUpperCase() || '未知'}</strong></span>
            <span>·</span>
            <span>大小: <strong className="text-[#cccccc]">{formatSize(fileSize)}</strong></span>
          </div>
          <div>按 <kbd className="px-1.5 py-0.5 rounded bg-[#252526] border border-[#3c3c3c] text-[10px] text-[#0078d4] font-mono">Esc</kbd> 退出预览</div>
        </div>
      </div>
    </div>
  );
}

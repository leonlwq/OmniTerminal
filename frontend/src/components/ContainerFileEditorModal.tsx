import React, { useState, useEffect } from 'react';
import {
  X, Save, Copy, Download, FileText, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';

interface ContainerFileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerName: string;
  filePath: string;
  initialContent: string;
  onSave: (newContent: string) => Promise<boolean>;
}

export const ContainerFileEditorModal: React.FC<ContainerFileEditorModalProps> = ({
  isOpen,
  onClose,
  containerName,
  filePath,
  initialContent,
  onSave,
}) => {
  const [content, setContent] = useState(initialContent || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    setContent(initialContent || '');
    setSaveStatus(null);
  }, [initialContent, filePath, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const ok = await onSave(content);
      if (ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-text">
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg w-full max-w-4xl h-[85vh] shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-[#cccccc]">

        {/* Header */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-white flex items-center gap-2">
                <span>容器文件在线编辑: {filePath.split('/').pop()}</span>
                <span className="text-[10px] bg-[#0078d4]/20 text-[#3794ff] px-1.5 py-0.2 rounded font-mono">
                  {containerName}
                </span>
              </h3>
              <p className="text-[10px] text-[#858585] font-mono">{filePath}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === 'success' && (
              <span className="text-emerald-400 text-xs flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>已写回容器！</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-400 text-xs flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>写回容器失败</span>
              </span>
            )}

            <button
              onClick={() => navigator.clipboard.writeText(content)}
              className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white transition-colors"
              title="复制全部内容"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filePath.split('/').pop() || 'container_file.txt';
                a.click();
              }}
              className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white transition-colors"
              title="下载到本地"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '正在写回...' : '保存写回容器'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-3 bg-[#181818] overflow-hidden flex">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-full bg-[#141414] border border-[#2b2b2b] rounded p-3 font-mono text-xs text-[#d4d4d4] leading-relaxed resize-none outline-none focus:border-[#0078d4] select-text"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-2 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[10px] text-[#858585] shrink-0 font-mono">
          <span>行数: {content.split('\n').length} | 字符数: {content.length}</span>
          <span>按「保存写回容器」将通过 exec 流写回容器文件系统</span>
        </div>

      </div>
    </div>
  );
};

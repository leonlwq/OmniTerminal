import React from 'react';
import { ShieldAlert, Server, Trash2, AlertTriangle } from 'lucide-react';
import { app, models } from '../../wailsjs/go/models';

interface DeleteConfirmModalProps {
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  confirmDeleteSession: () => void;
}

export function DeleteConfirmModal({
  deleteConfirmId,
  setDeleteConfirmId,
  confirmDeleteSession
}: DeleteConfirmModalProps) {
  if (!deleteConfirmId) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[420px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc]">
        <div className="flex items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="w-7 h-7 rounded bg-[#331c19] border border-[#5a1d1d] flex items-center justify-center text-[#f14c4c] mr-3 shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e0e0e0]">确认永久删除</h2>
            <p className="text-[11px] text-[#f14c4c]">此操作不可撤销，配置将被清除</p>
          </div>
        </div>
        <div className="p-5 bg-[#1e1e1e] text-xs text-[#cccccc] leading-relaxed">
          您确定要永久删除该会话或分类目录吗？如果目录下包含子会话，所有关联项都将被一并移除。
        </div>
        <div className="flex items-center justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] space-x-2">
          <button
            onClick={() => setDeleteConfirmId(null)}
            className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmDeleteSession}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#a1260d] hover:bg-[#b82d0f] rounded transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConnectFolderModalProps {
  folderToConnect: app.SessionConfig[] | null;
  setFolderToConnect: (folder: app.SessionConfig[] | null) => void;
  confirmConnectFolder: () => void;
}

export function ConnectFolderModal({
  folderToConnect,
  setFolderToConnect,
  confirmConnectFolder
}: ConnectFolderModalProps) {
  if (!folderToConnect) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[420px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc]">
        <div className="flex items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] mr-3 shrink-0">
            <Server className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e0e0e0]">批量会话并发连接</h2>
            <p className="text-[11px] text-[#858585]">同时开启目录下所有终端会话</p>
          </div>
        </div>
        <div className="p-5 bg-[#1e1e1e] text-xs text-[#cccccc] leading-relaxed">
          准备建立连接：将并发打开并连接该分类目录下的全部 <span className="text-[#0078d4] font-semibold">{folderToConnect.length}</span> 个服务器终端会话。是否继续？
        </div>
        <div className="flex items-center justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] space-x-2">
          <button
            onClick={() => setFolderToConnect(null)}
            className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmConnectFolder}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#0078d4] hover:bg-[#006cbe] rounded transition-colors"
          >
            开始批量连接 ({folderToConnect.length})
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteMacroModalProps {
  macroToDelete: models.AppMacro | null;
  setMacroToDelete: (macro: models.AppMacro | null) => void;
  confirmDeleteMacro: () => void;
}

export function DeleteMacroModal({
  macroToDelete,
  setMacroToDelete,
  confirmDeleteMacro
}: DeleteMacroModalProps) {
  if (!macroToDelete) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[420px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc]">
        <div className="flex items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="w-7 h-7 rounded bg-[#331c19] border border-[#5a1d1d] flex items-center justify-center text-[#f14c4c] mr-3 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e0e0e0]">确认删除宏方案</h2>
            <p className="text-[11px] text-[#f14c4c]">宏录制数据将被清除</p>
          </div>
        </div>
        <div className="p-5 bg-[#1e1e1e] text-xs text-[#cccccc] leading-relaxed">
          确定要删除宏方案 "<span className="text-[#e0e0e0] font-medium">{macroToDelete.name}</span>" 吗？此操作无法撤销。
        </div>
        <div className="flex items-center justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] space-x-2">
          <button
            onClick={() => setMacroToDelete(null)}
            className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmDeleteMacro}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#a1260d] hover:bg-[#b82d0f] rounded transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

interface SaveMacroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  macroNameInput: string;
  setMacroNameInput: (val: string) => void;
  actionCount: number;
}

export function SaveMacroModal({
  isOpen,
  onClose,
  onSave,
  macroNameInput,
  setMacroNameInput,
  actionCount,
}: SaveMacroModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[420px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc]">
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <h2 className="text-sm font-semibold text-[#e0e0e0]">保存录制的宏方案</h2>
          <button
            onClick={onClose}
            className="text-[#858585] hover:text-[#e0e0e0] transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSave} className="p-5 bg-[#1e1e1e] space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#858585] uppercase tracking-wide">宏方案命名 *</label>
            <input
              type="text"
              placeholder="如: 更新Nginx配置宏"
              value={macroNameInput}
              onChange={(e) => setMacroNameInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#1e1e1e] border border-[#3c3c3c] rounded focus:outline-none focus:border-[#0078d4] text-[#cccccc]"
              required
              autoFocus
            />
            <p className="text-[11px] text-[#858585]">本次录制已成功捕捉到 {actionCount} 次按键操作帧。</p>
          </div>
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2b2b2b]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
            >
              放弃录像
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#0078d4] hover:bg-[#006cbe] rounded transition-colors"
            >
              确认保存宏
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface ConfirmCloseTabModalProps {
  tabPendingClose: { id: string; name: string; isConnected: boolean } | null;
  onConfirm: (doNotAskAgain: boolean) => void;
  onCancel: () => void;
}

export function ConfirmCloseTabModal({
  tabPendingClose,
  onConfirm,
  onCancel,
}: ConfirmCloseTabModalProps) {
  const [doNotAskAgain, setDoNotAskAgain] = React.useState(false);

  if (!tabPendingClose) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[420px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc]">
        <div className="flex items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="w-7 h-7 rounded bg-[#332a15] border border-[#5a481d] flex items-center justify-center text-[#cca700] mr-3 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e0e0e0]">关闭标签页确认</h2>
            <p className="text-[11px] text-[#cca700]">
              {tabPendingClose.isConnected ? '此终端会话正在连接中' : '即将关闭标签页'}
            </p>
          </div>
        </div>
        <div className="p-5 bg-[#1e1e1e] text-xs text-[#cccccc] leading-relaxed space-y-3">
          <p>
            确定要关闭标签页 <span className="text-[#e0e0e0] font-medium bg-[#252526] px-1.5 py-0.5 rounded border border-[#2b2b2b] font-mono">[{tabPendingClose.name}]</span> 吗？
          </p>
          {tabPendingClose.isConnected && (
            <p className="text-[11px] text-[#858585]">
              ⚠ 标签页关闭后，该远程 SSH 连接将被断开，正在前台执行的命令或传输将被终止。
            </p>
          )}
          <label className="flex items-center space-x-2 pt-2 text-[11px] text-[#858585] hover:text-[#cccccc] cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={doNotAskAgain}
              onChange={(e) => setDoNotAskAgain(e.target.checked)}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
            />
            <span>不再询问 (可在系统配置中随时重新开启)</span>
          </label>
        </div>
        <div className="flex items-center justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] space-x-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(doNotAskAgain)}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#b87d14] hover:bg-[#c98c19] rounded transition-colors"
          >
            确认关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export interface CloseAppConfirmModalProps {
  isOpen: boolean;
  defaultAction?: string; // 'tray' | 'quit'
  disableTray?: boolean;
  onConfirm: (action: 'tray' | 'quit', doNotAskAgain: boolean) => void;
  onCancel: () => void;
}

export function CloseAppConfirmModal({
  isOpen,
  defaultAction = 'tray',
  disableTray = false,
  onConfirm,
  onCancel,
}: CloseAppConfirmModalProps) {
  const [selectedAction, setSelectedAction] = React.useState<'tray' | 'quit'>(
    disableTray || defaultAction === 'quit' ? 'quit' : 'tray'
  );
  const [doNotAskAgain, setDoNotAskAgain] = React.useState(false);

  React.useEffect(() => {
    if (disableTray) {
      setSelectedAction('quit');
    }
  }, [disableTray]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[440px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-[#cccccc]">
        <div className="flex items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] mr-3 shrink-0">
            <ShieldAlert className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#e0e0e0]">关闭 OmniTerminal</h2>
            <p className="text-[11px] text-[#858585]">请选择点击关闭按钮时的操作行为</p>
          </div>
        </div>

        <div className="p-5 bg-[#1e1e1e] text-xs space-y-3.5">
          <div className="space-y-2">
            <label 
              onClick={() => {
                if (!disableTray) setSelectedAction('tray');
              }}
              className={`flex items-start space-x-3 p-3 rounded border transition-all ${
                disableTray 
                  ? 'opacity-40 cursor-not-allowed bg-[#252526]/30 border-[#2b2b2b] text-[#555555]'
                  : selectedAction === 'tray' 
                    ? 'bg-[#04395e]/25 border-[#0078d4] text-[#e0e0e0] cursor-pointer' 
                    : 'bg-[#252526] border-[#2b2b2b] text-[#858585] hover:border-[#3c3c3c] cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="closeAction"
                disabled={disableTray}
                checked={selectedAction === 'tray'}
                onChange={() => {
                  if (!disableTray) setSelectedAction('tray');
                }}
                className="mt-0.5 text-[#0078d4] bg-[#1e1e1e] border-[#3c3c3c] focus:ring-0"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#e0e0e0] text-xs">最小化到后台 / 系统托盘</span>
                  {disableTray && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-[#332a15] text-[#cca700] border border-[#5a481d] rounded">
                      已在设置中禁用
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#858585] leading-relaxed">
                  保持所有 SSH 会话、端口转发隧道及文件传输在后台持续运行不中断。
                </div>
              </div>
            </label>

            <label 
              onClick={() => setSelectedAction('quit')}
              className={`flex items-start space-x-3 p-3 rounded border cursor-pointer transition-all ${
                selectedAction === 'quit' 
                  ? 'bg-[#331c19]/30 border-[#5a1d1d] text-[#e0e0e0]' 
                  : 'bg-[#252526] border-[#2b2b2b] text-[#858585] hover:border-[#3c3c3c]'
              }`}
            >
              <input
                type="radio"
                name="closeAction"
                checked={selectedAction === 'quit'}
                onChange={() => setSelectedAction('quit')}
                className="mt-0.5 text-[#f14c4c] bg-[#1e1e1e] border-[#3c3c3c] focus:ring-0"
              />
              <div className="space-y-0.5">
                <div className="font-medium text-[#e0e0e0] text-xs">直接退出程序 (Quit)</div>
                <div className="text-[11px] text-[#858585] leading-relaxed">
                  断开全部活动终端连接、退出所有后台任务并彻底关闭应用。
                </div>
              </div>
            </label>
          </div>

          <label className="flex items-center space-x-2 pt-1 text-[11px] text-[#858585] hover:text-[#cccccc] cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={doNotAskAgain}
              onChange={(e) => setDoNotAskAgain(e.target.checked)}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
            />
            <span>记住选择，下次不再询问 (可在系统配置随时更改)</span>
          </label>
        </div>

        <div className="flex items-center justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] space-x-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(selectedAction, doNotAskAgain)}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#0078d4] hover:bg-[#006cbe] rounded transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}




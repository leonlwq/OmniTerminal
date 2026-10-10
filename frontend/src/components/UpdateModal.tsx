import React from 'react';
import { Terminal, ShieldCheck, Loader2, X, ExternalLink } from 'lucide-react';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';

interface UpdateInfo {
  tag_name: string;
  body: string;
  html_url: string;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isChecking: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
}

export function UpdateModal({ isOpen, onClose, isChecking, updateInfo, currentVersion }: UpdateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[440px] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Terminal className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">关于 OmniTerminal</h2>
              <span className="text-[11px] text-[#858585] font-normal">About & Version Check</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#858585] hover:text-[#e0e0e0] p-1.5 hover:bg-[#333333] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center bg-[#1e1e1e]">
          <div className="w-14 h-14 bg-[#252526] border border-[#3c3c3c] rounded flex items-center justify-center mb-3 text-[#0078d4] shadow-sm">
            <Terminal className="h-7 w-7 text-[#0078d4]" />
          </div>
          <h2 className="text-base font-bold text-[#e0e0e0] mb-0.5 tracking-tight">OmniTerminal Pro</h2>
          <p className="text-xs font-mono text-[#0078d4] mb-4 bg-[#2d2d2d] px-2.5 py-0.5 rounded border border-[#3c3c3c]">Version {currentVersion}</p>
          
          <div className="w-full bg-[#252526] border border-[#2b2b2b] rounded p-3 text-xs text-[#cccccc] mb-4 space-y-2 leading-relaxed">
            <p className="font-medium text-[#e0e0e0]">现代极客跨平台 SSH/SFTP 生产力客户端工作台</p>
            <p className="text-[11px] text-[#858585]">Copyright © 2026 OmniTerminal Team. High performance Go backend & React frontend.</p>
            <div 
              className="flex items-center gap-1.5 text-[#0078d4] hover:underline cursor-pointer pt-1 text-[11px]" 
              onClick={() => BrowserOpenURL("https://github.com/leonlwq/omniterminal")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>https://github.com/leonlwq/omniterminal</span>
            </div>
          </div>

          {/* Update Check Section */}
          <div className="w-full flex items-center justify-center min-h-[48px] bg-[#252526] border border-[#2b2b2b] rounded p-3">
            {isChecking ? (
              <div className="flex items-center space-x-2 text-xs text-[#858585]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0078d4]" />
                <span>正在连接服务器检测最新版本...</span>
              </div>
            ) : updateInfo ? (
              <div className="flex flex-col items-center w-full">
                {updateInfo.tag_name !== currentVersion ? (
                  <div className="space-y-2.5 w-full">
                    <div className="flex items-center justify-center space-x-2 text-[#89d185]">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-xs font-bold">发现新版本: {updateInfo.tag_name}</span>
                    </div>
                    <button 
                      onClick={() => BrowserOpenURL(updateInfo.html_url)}
                      className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-semibold rounded transition-all shadow-sm w-full"
                    >
                      立即前往 GitHub 下载更新
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-[#89d185] text-xs font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    <span>当前已是最新稳定版本 (Up to date)</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#cca700]">未检测到新版本或离线模式</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-1 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}


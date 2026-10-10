import React from 'react';
import { Terminal as TermIcon, Zap, Shield, Plus, Compass } from 'lucide-react';
import { app } from '../../wailsjs/go/models';

interface QuickStartPageProps {
  sessions?: app.SessionConfig[];
  resetSessionFormData: () => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (open: boolean) => void;
  handleConnect?: (session: app.SessionConfig) => void;
  getColorLabelClass?: (colorStr: string | undefined, isConnected: boolean) => string;
  onOpenLocalShell?: () => void;
}

export function QuickStartPage({
  resetSessionFormData,
  setModalMode,
  setIsModalOpen,
  onOpenLocalShell,
}: QuickStartPageProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app-bg overflow-y-auto select-none">
      <div className="max-w-2xl w-full space-y-5 animate-in fade-in duration-150">
        {/* 顶部欢迎面板 - 自适应中性质感 */}
        <div className="bg-app-card border border-app-border rounded-xl p-8 text-center space-y-5 shadow-sm relative">
          {/* Logo 与徽标 */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-[#0078d4] to-[#0098ff] flex items-center justify-center shadow-lg shadow-[#0078d4]/20 border border-white/20 transition-transform duration-200 hover:scale-105">
              <TermIcon className="h-7 w-7 text-white" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-app-text tracking-tight">
              OmniTerminal 工作台
            </h2>
            <p className="text-xs text-app-text-muted max-w-md mx-auto leading-relaxed">
              高性能跨平台终端生产力客户端。从左侧会话导航双击发起连接，或使用顶部 Omnibar 快速直连。
            </p>
          </div>

          {/* 快捷操作主按钮 - 标志性实心蓝与次级灰按钮 */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => {
                resetSessionFormData();
                setModalMode('create');
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0078d4] hover:bg-[#006cbe] active:bg-[#005a9e] text-xs font-medium text-white rounded-md shadow-sm transition-colors flex items-center space-x-1.5 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>新建 SSH 会话</span>
            </button>

            {onOpenLocalShell && (
              <button
                onClick={onOpenLocalShell}
                className="px-4 py-2 bg-app-surface hover:bg-app-hover active:bg-app-surface border border-app-border text-xs font-medium text-app-text rounded-md transition-colors flex items-center space-x-1.5 active:scale-[0.98]"
                title="打开本地命令行终端 (zsh / bash / PowerShell / CMD)"
              >
                <TermIcon className="w-4 h-4 text-emerald-400" />
                <span>打开本地终端</span>
              </button>
            )}
          </div>
        </div>

        {/* 核心操作指引卡片网格 - 扁平微边框结构卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg bg-app-card border border-app-border hover:border-app-accent/40 transition-colors flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-7 h-7 rounded-md bg-app-surface border border-app-border text-[#3794ff] flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-medium text-app-text tracking-tight">会话导航</h3>
              <p className="text-[11px] text-app-text-muted leading-relaxed">
                在左侧侧边栏中组织与管理主机目录树，支持文件夹拖拽、标签过滤与右键快速连接。
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-app-card border border-app-border hover:border-app-accent/40 transition-colors flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-7 h-7 rounded-md bg-app-surface border border-app-border text-amber-500 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-medium text-app-text tracking-tight">Omnibar 快速直连</h3>
              <p className="text-[11px] text-app-text-muted leading-relaxed">
                在顶栏地址栏输入 <code className="text-amber-600 dark:text-amber-300 font-mono px-1 py-0.5 bg-app-surface rounded border border-app-border">user@host:port</code> 直接发起免存盘临时连接。
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-app-card border border-app-border hover:border-app-accent/40 transition-colors flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="w-7 h-7 rounded-md bg-app-surface border border-app-border text-emerald-500 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-medium text-app-text tracking-tight">安全防护</h3>
              <p className="text-[11px] text-app-text-muted leading-relaxed">
                所有密码私钥凭据均经 AES-256-GCM 主密码加密，支持闲置自动锁屏与审计追踪。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Zap, Shield, Plus, Network } from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';
import appIcon from '../assets/images/appicon.png';

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
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090b10] overflow-y-auto select-none relative">
      {/* 极客环境流光背景 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[400px] bg-gradient-to-tr from-indigo-600/15 via-blue-500/15 to-cyan-500/15 rounded-full blur-[110px] pointer-events-none -z-0" />

      <div className="max-w-3xl w-full flex flex-col items-center animate-in fade-in duration-300 relative z-10">
        {/* 顶部浮动品牌与标语 (无边框极客悬浮排版) */}
        <div className="flex flex-col items-center text-center space-y-3 mb-2">
          {/* 3D 悬浮应用 Logo 与光晕 */}
          <div className="relative group mb-1">
            <div className="absolute inset-0 bg-blue-500/25 blur-3xl rounded-full scale-90 group-hover:scale-110 transition-all duration-500" />
            <img
              src={appIcon}
              alt="OmniTerminal Logo"
              className="w-24 h-24 object-contain drop-shadow-[0_16px_36px_rgba(0,120,212,0.45)] transition-all duration-300 hover:scale-105 pointer-events-none select-none relative z-10"
            />
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {t('quickstart.title')}
          </h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed tracking-wide font-normal">
            {t('quickstart.subtitle')}
          </p>
        </div>

        {/* 快捷操作按钮组 (高饱和蓝光新建连接 + 荧光青深色玻璃本地终端) */}
        <div className="flex items-center justify-center gap-4 pt-4 pb-9 relative z-10">
          <button
            onClick={() => {
              resetSessionFormData();
              setModalMode('create');
              setIsModalOpen(true);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-[#0091ff] via-[#0078d4] to-[#005ea6] hover:from-[#0aa2ff] hover:to-[#0070d2] active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-[0_0_24px_rgba(0,120,212,0.55)] hover:shadow-[0_0_34px_rgba(0,145,255,0.8)] transition-all duration-200 flex items-center space-x-2 cursor-pointer border border-blue-400/40"
          >
            <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            <span className="tracking-wide">{t('quickstart.newSession')}</span>
          </button>

          {onOpenLocalShell && (
            <button
              onClick={onOpenLocalShell}
              className="px-6 py-2.5 bg-[#0e1422]/85 hover:bg-[#141d33]/90 active:scale-[0.98] border border-cyan-500/40 hover:border-cyan-400 text-xs font-medium text-cyan-300 rounded-xl shadow-[0_0_18px_rgba(6,182,212,0.2)] hover:shadow-[0_0_26px_rgba(6,182,212,0.35)] transition-all duration-200 flex items-center space-x-2 cursor-pointer backdrop-blur-md"
              title={t('quickstart.openLocalTooltip')}
            >
              <span className="font-mono text-cyan-400 font-semibold">{'>_'}</span>
              <span className="tracking-wide">{t('quickstart.openLocal')}</span>
            </button>
          )}
        </div>

        {/* 三大多协议核心指引卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* 卡片 1: 多端会话管理 (Indigo / Purple 霓虹边缘与暗光) */}
          <div className="p-5 rounded-2xl bg-[#10141f]/90 backdrop-blur-md border border-indigo-500/30 hover:border-indigo-500/60 shadow-[0_4px_24px_-4px_rgba(99,102,241,0.2)] hover:shadow-[0_8px_32px_rgba(99,102,241,0.35)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">{t('quickstart.sessionNav')}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('quickstart.sessionNavDesc')}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* 卡片 2: 极速飞梭直连 (Amber / Gold 霓虹边缘与暗光) */}
          <div className="p-5 rounded-2xl bg-[#10141f]/90 backdrop-blur-md border border-amber-500/30 hover:border-amber-500/60 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.35)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Zap className="w-5 h-5 fill-amber-400/20" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">{t('quickstart.omnibar')}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('quickstart.omnibarDescPre')} <code className="text-amber-300 font-mono font-medium px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/25 rounded">ssh://user@host:port</code> {t('quickstart.omnibarDescPost')}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* 卡片 3: 企业级安全盾 (Emerald 翡翠绿双线边框 + 全域极客绿光 + 右下角炫光星芒) */}
          <div className="p-5 rounded-2xl bg-[#10141f]/90 backdrop-blur-md border-2 border-emerald-500/50 hover:border-emerald-400/80 shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:shadow-[0_0_36px_rgba(16,185,129,0.35)] transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Shield className="w-5 h-5 fill-emerald-400/20" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">{t('quickstart.security')}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('quickstart.securityDesc')}
              </p>
            </div>
            {/* 炫光全域绿晕 */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            {/* 右下角极客全息 4 角星芒 */}
            <div className="absolute -bottom-2 -right-2 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-300">
              <svg className="w-20 h-20 text-emerald-300" viewBox="0 0 100 100" fill="currentColor">
                <polygon points="50,0 54,42 96,46 54,50 50,92 46,50 4,46 46,42" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

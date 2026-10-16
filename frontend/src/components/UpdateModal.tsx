import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, X, ExternalLink, Download, 
  RefreshCw, CheckCircle2, AlertCircle, Zap, Cpu, Sparkles 
} from 'lucide-react';
import { BrowserOpenURL, EventsOn } from '../../wailsjs/runtime/runtime';
import { StartAppUpdateDownload, CancelAppUpdateDownload, ApplyAppUpdateAndRestart } from '../../wailsjs/go/app/App';
import { useI18n } from '../i18n/I18nContext';
import appIcon from '../assets/images/appicon.png';

export interface UpdateAssetInfo {
  name: string;
  downloadUrl: string;
  size: number;
  browserUrl: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle?: string;
  releaseNotes?: string;
  publishedAt?: string;
  htmlUrl: string;
  platformOS?: string;
  platformArch?: string;
  targetAsset?: UpdateAssetInfo | null;
}

interface UpdateProgressPayload {
  status: 'downloading' | 'ready' | 'error' | 'cancelled';
  totalBytes: number;
  downloadedBytes: number;
  percent: number;
  speedBytes: number;
  errorMsg?: string;
  filePath?: string;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isChecking: boolean;
  updateResult: UpdateCheckResult | null;
  currentVersion: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function UpdateModal({ isOpen, onClose, isChecking, updateResult, currentVersion }: UpdateModalProps) {
  const { t } = useI18n();

  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'ready' | 'applying' | 'error'>('idle');
  const [progress, setProgress] = useState<UpdateProgressPayload | null>(null);
  const [useMirror, setUseMirror] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 监听后端推送的流式下载与安装进度
  useEffect(() => {
    if (!isOpen) {
      setDownloadState('idle');
      setProgress(null);
      setErrorMsg('');
      return;
    }

    const unbind = EventsOn('app_update_progress', (data: UpdateProgressPayload) => {
      if (!data) return;
      if (data.status === 'downloading') {
        setDownloadState('downloading');
        setProgress(data);
      } else if (data.status === 'ready') {
        setDownloadState('ready');
        setProgress(data);
      } else if (data.status === 'error') {
        setDownloadState('error');
        setErrorMsg(data.errorMsg || '下载更新包失败');
      } else if (data.status === 'cancelled') {
        setDownloadState('idle');
        setProgress(null);
      }
    });

    return () => {
      if (unbind) unbind();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveLatest = updateResult?.latestVersion || '';
  const hasUpdate = updateResult?.hasUpdate ?? (effectiveLatest !== '' && effectiveLatest !== currentVersion);
  const targetAsset = updateResult?.targetAsset;
  const targetDownloadUrl = targetAsset?.downloadUrl || (updateResult?.htmlUrl ?? '');

  // 启动应用内下载更新
  const handleStartDownload = async () => {
    if (!targetAsset?.downloadUrl) {
      // 无法精确定位对应安装包时，降级打开网页
      BrowserOpenURL(updateResult?.htmlUrl || 'https://github.com/leonlwq/omniterminal/releases/latest');
      return;
    }
    setDownloadState('downloading');
    setErrorMsg('');
    try {
      await StartAppUpdateDownload(targetAsset.downloadUrl, useMirror);
    } catch (err: any) {
      setDownloadState('error');
      setErrorMsg(err?.message || '发起更新下载失败');
    }
  };

  // 取消下载
  const handleCancelDownload = async () => {
    try {
      await CancelAppUpdateDownload();
    } catch (_) {}
    setDownloadState('idle');
    setProgress(null);
  };

  // 执行重启并热替换
  const handleApplyAndRestart = async () => {
    if (!progress?.filePath) return;
    setDownloadState('applying');
    try {
      await ApplyAppUpdateAndRestart(progress.filePath);
    } catch (err: any) {
      setDownloadState('error');
      setErrorMsg(err?.message || '应用更新并重启失败，请尝试手动替换');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#333333] shadow-[0_20px_48px_rgba(0,0,0,0.75)] rounded-lg w-[480px] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <img 
              src={appIcon} 
              alt="OmniTerminal" 
              className="w-7 h-7 object-contain select-none pointer-events-none drop-shadow-sm" 
            />
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('update.title') || '关于 OmniTerminal'}</h2>
              <span className="text-[11px] text-[#858585] font-normal">About & In-App Update</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#858585] hover:text-[#e0e0e0] p-1.5 hover:bg-[#333333] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center bg-[#1e1e1e]">
          {/* Logo & Product info */}
          <div className="relative mb-3 flex items-center justify-center group">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full scale-90 pointer-events-none" />
            <img 
              src={appIcon} 
              alt="OmniTerminal Logo" 
              className="w-16 h-16 object-contain drop-shadow-[0_8px_24px_rgba(0,120,212,0.35)] relative z-10 select-none pointer-events-none hover:scale-105 transition-transform duration-200" 
            />
          </div>
          <h2 className="text-base font-bold text-[#e0e0e0] mb-0.5 tracking-tight flex items-center gap-1.5">
            OmniTerminal Pro
            <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">Release</span>
          </h2>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-mono text-[#858585] bg-[#2d2d2d] px-2.5 py-0.5 rounded border border-[#3c3c3c]">
              Current: <span className="text-[#0078d4] font-semibold">{currentVersion}</span>
            </p>
            {updateResult?.platformOS && (
              <span className="text-[11px] font-mono text-[#888888] flex items-center gap-1 bg-[#282828] px-2 py-0.5 rounded border border-[#333333]">
                <Cpu className="w-3 h-3 text-[#0078d4]" />
                {updateResult.platformOS}/{updateResult.platformArch}
              </span>
            )}
          </div>
          
          <div className="w-full bg-[#252526] border border-[#2b2b2b] rounded p-3 text-xs text-[#cccccc] mb-3 space-y-1.5 leading-relaxed">
            <p className="font-medium text-[#e0e0e0]">{t('update.desc') || '现代极客跨平台 SSH/SFTP 生产力客户端工作台'}</p>
            <p className="text-[11px] text-[#858585]">High performance Go backend & React frontend with zero hot-path overhead.</p>
            <div 
              className="flex items-center gap-1.5 text-[#0078d4] hover:underline cursor-pointer pt-0.5 text-[11px]" 
              onClick={() => BrowserOpenURL("https://github.com/leonlwq/omniterminal")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>https://github.com/leonlwq/omniterminal</span>
            </div>
          </div>

          {/* Update Check & Action Section */}
          <div className="w-full bg-[#252526] border border-[#2b2b2b] rounded p-3.5">
            {isChecking ? (
              <div className="flex items-center justify-center space-x-2 text-xs text-[#858585] py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#0078d4]" />
                <span>{t('update.checking') || '正在连接服务器检测最新版本...'}</span>
              </div>
            ) : updateResult && hasUpdate ? (
              <div className="space-y-3 w-full">
                {/* 发现新版本标题栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[#89d185]">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold">{t('update.newVersion') || '发现新版本:'}</span>
                    <span className="px-2 py-0.5 text-xs font-bold font-mono bg-[#89d185]/15 text-[#89d185] rounded border border-[#89d185]/30">
                      {effectiveLatest}
                    </span>
                  </div>
                  {targetAsset?.size && (
                    <span className="text-[11px] text-[#858585] font-mono">
                      {formatBytes(targetAsset.size)}
                    </span>
                  )}
                </div>

                {/* 匹配到的安装包提示 */}
                {targetAsset && (
                  <div className="bg-[#1e1e1e] border border-[#333333] rounded px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-[#858585]">{t('update.matchedPackage') || '当前架构匹配安装包:'}</span>
                    <span className="font-mono text-[#0078d4] truncate max-w-[240px]" title={targetAsset.name}>
                      {targetAsset.name}
                    </span>
                  </div>
                )}

                {/* 更新日志折叠/摘要 */}
                {updateResult.releaseNotes && (
                  <div className="bg-[#1a1a1a] border border-[#333333] rounded p-2 text-[11px] text-[#999999] max-h-20 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed select-text">
                    {updateResult.releaseNotes}
                  </div>
                )}

                {/* 加速镜像选项 */}
                {downloadState === 'idle' && (
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#999999] hover:text-[#cccccc] transition-colors">
                    <input 
                      type="checkbox" 
                      checked={useMirror} 
                      onChange={(e) => setUseMirror(e.target.checked)}
                      className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#0078d4] focus:ring-0 cursor-pointer"
                    />
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('update.mirror') || '使用国内加速镜像下载 (GitHub Proxy)'}</span>
                  </label>
                )}

                {/* 状态 1: Idle (未开始下载) */}
                {downloadState === 'idle' && (
                  <div className="space-y-2 pt-1">
                    <button 
                      onClick={handleStartDownload}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0078d4] to-[#0063b1] hover:from-[#006cbe] hover:to-[#005a9e] text-white text-xs font-semibold rounded transition-all shadow-[0_2px_8px_rgba(0,120,212,0.35)] cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{t('update.inAppBtn') || '应用内一键下载更新'}</span>
                    </button>
                    
                    <button 
                      onClick={() => BrowserOpenURL(updateResult.htmlUrl)}
                      className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-[#858585] hover:text-[#cccccc] hover:underline cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{t('update.externalBtn') || '前往 GitHub 网页下载'}</span>
                    </button>
                  </div>
                )}

                {/* 状态 2: Downloading (下载中) */}
                {downloadState === 'downloading' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#0078d4] font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('update.downloading') || '正在下载更新包...'}
                      </span>
                      <span className="font-mono font-bold text-[#e0e0e0]">
                        {progress?.percent ? progress.percent.toFixed(1) : '0.0'}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#1b1b1b] rounded-full overflow-hidden border border-[#333333]">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-200"
                        style={{ width: `${Math.min(100, Math.max(0, progress?.percent || 0))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#858585] font-mono">
                      <span>
                        {formatBytes(progress?.downloadedBytes || 0)} / {formatBytes(progress?.totalBytes || targetAsset?.size || 0)}
                      </span>
                      <span>
                        {progress?.speedBytes ? `${formatBytes(progress.speedBytes)}/s` : '--'}
                      </span>
                    </div>

                    <button 
                      onClick={handleCancelDownload}
                      className="w-full py-1 text-xs text-[#858585] hover:text-[#f48771] hover:bg-[#332222] rounded transition-colors cursor-pointer"
                    >
                      {t('update.cancelBtn') || '取消下载'}
                    </button>
                  </div>
                )}

                {/* 状态 3: Ready (下载就绪，准备重启安装) */}
                {downloadState === 'ready' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{t('update.ready') || '更新安装包已就绪，等待重启'}</span>
                    </div>

                    <button 
                      onClick={handleApplyAndRestart}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-all shadow-[0_2px_8px_rgba(16,185,129,0.35)] cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{t('update.restartBtn') || '立即重启以完成更新'}</span>
                    </button>
                  </div>
                )}

                {/* 状态 4: Applying (重启中) */}
                {downloadState === 'applying' && (
                  <div className="flex flex-col items-center justify-center py-3 space-y-2 text-xs text-[#89d185]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('update.restarting') || '正在应用更新并重启应用...'}</span>
                  </div>
                )}

                {/* 状态 5: Error (下载异常) */}
                {downloadState === 'error' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">{errorMsg || '更新失败'}</span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={handleStartDownload}
                        className="flex-1 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-xs font-medium rounded transition-colors cursor-pointer"
                      >
                        重试下载
                      </button>
                      <button 
                        onClick={() => BrowserOpenURL(updateResult.htmlUrl)}
                        className="flex-1 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium rounded transition-colors cursor-pointer"
                      >
                        手动下载
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : updateResult && !hasUpdate ? (
              <div className="flex items-center justify-center space-x-2 text-[#89d185] text-xs font-medium py-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{t('update.upToDate') || '当前已是最新稳定版本 (Up to date)'}</span>
              </div>
            ) : (
              <div className="text-center text-xs text-[#cca700] py-2">
                {t('update.offline') || '未检测到新版本或处于离线模式'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-1 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors cursor-pointer"
          >
            {t('common.close') || '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

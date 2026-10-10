import React, { useState } from 'react';
import { 
  Terminal, Folder, Server, Shield, 
  UploadCloud, FileText, ChevronRight, RefreshCw, 
  Search
} from 'lucide-react';

interface Props {
  lang?: 'en' | 'zh' | 'ja' | 'ko';
}

export default function InteractiveTerminal({ lang = 'en' }: Props) {
  const [activeTab, setActiveTab] = useState<'bastion' | 'redis' | 'local'>('bastion');
  const [sftpOpen, setSftpOpen] = useState(true);
  const [activeTheme, setActiveTheme] = useState<'vscode' | 'tokyonight' | 'catppuccin'>('vscode');
  const [demoCommand, setDemoCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([
    'omni connect prod-bastion-01 --profile prod-vault',
    '✓ SSH2 connection established to 10.0.8.12:22 (ECDSA SHA256:d8a9f...)',
    '✓ Authenticated via Master Password Vault [AES-256-GCM]',
    '✓ GPU Acceleration WebGL enabled • Latency: 1.2ms • Keep-Alive: 30s',
  ]);

  const themes = {
    vscode: {
      name: 'VS Code Dark Modern',
      bg: 'bg-[#181818]',
      card: 'bg-[#1e1e1e]',
      border: 'border-[#2b2b2b]',
      accent: 'text-[#0078d4]',
      prompt: 'text-emerald-400',
    },
    tokyonight: {
      name: 'Tokyo Night Storm',
      bg: 'bg-[#1a1b26]',
      card: 'bg-[#24283b]',
      border: 'border-[#414868]',
      accent: 'text-[#7aa2f7]',
      prompt: 'text-[#73daca]',
    },
    catppuccin: {
      name: 'Catppuccin Mocha',
      bg: 'bg-[#181825]',
      card: 'bg-[#1e1e2e]',
      border: 'border-[#313244]',
      accent: 'text-[#89b4fa]',
      prompt: 'text-[#a6e3a1]',
    },
  };

  const handleRunCommand = (cmd: string) => {
    setDemoCommand(cmd);
    setTimeout(() => {
      if (cmd === 'sftp') {
        setSftpOpen(prev => !prev);
        setCommandHistory(prev => [
          ...prev,
          `$ sftp --toggle`,
          `[SFTP] Right-side drawer ${sftpOpen ? 'collapsed' : 'expanded'}. Synchronized with terminal context.`,
        ]);
      } else if (cmd === 'filter') {
        setCommandHistory(prev => [
          ...prev,
          `$ omni filter --regex "(ERROR|FAIL|FATAL)"`,
          `[Filter] Cmd+Shift+F live buffer stream active: 2 error lines captured.`,
          `\x1b[31m2026-10-10 15:32:01 [ERROR] connection pool timeout on replica-03\x1b[0m`,
        ]);
      } else if (cmd === 'sync') {
        setCommandHistory(prev => [
          ...prev,
          `$ omni split --sync-scroll --panes 2`,
          `✓ Split pane 1 (master) <-> pane 2 (slave) scroll ratio synchronized.`,
        ]);
      }
      setDemoCommand('');
    }, 400);
  };

  const currentTheme = themes[activeTheme];

  const labels = {
    theme: { en: 'Theme:', zh: '主题:', ja: 'テーマ:', ko: '테마:' }[lang],
    explorer: { en: 'SESSION EXPLORER', zh: '会话资源管理器', ja: 'セッション管理', ko: '세션 탐색기' }[lang],
    prod: { en: 'Production Cluster', zh: '生产机房 (Production)', ja: '本番環境 (Production)', ko: '운영 클러스터 (Production)' }[lang],
    staging: { en: 'Staging Environment', zh: '测试环境 (Staging)', ja: 'ステージング環境 (Staging)', ko: '스테이징 환경 (Staging)' }[lang],
    vault: { en: 'Master Vault', zh: '凭据主保险库', ja: 'マスター保管庫', ko: '마스터 볼트' }[lang],
    vaultInfo: {
      en: '12 sessions encrypted via AES-256-GCM derived key',
      zh: '12 个会话已使用 Master Password 派生密钥加锁',
      ja: '12個のセッションを AES-256-GCM で保護中',
      ko: '12개 세션이 AES-256-GCM 파생 키로 보호 중',
    }[lang],
    sftpToggle: sftpOpen 
      ? { en: 'Drawer Open', zh: '展开', ja: 'ドロワー表示', ko: '패널 표시' }[lang]
      : { en: 'Collapsed', zh: '收起', ja: '格納', ko: '숨김' }[lang],
    tryDemo: { en: 'Interactive Controls:', zh: '特性交互演示:', ja: '機能デモ:', ko: '기능 데모:' }[lang],
    toggleSftp: { en: 'Toggle Side SFTP', zh: '切换侧边 SFTP 面板', ja: 'サイド SFTP 切替', ko: '사이드 SFTP 전환' }[lang],
    filterBtn: { en: 'Cmd+Shift+F Live Filter', zh: 'Cmd+Shift+F 实时日志过滤', ja: 'Cmd+Shift+F リアルタイム抽出', ko: 'Cmd+Shift+F 실시간 로그 필터' }[lang],
    syncBtn: { en: 'Sync Panes Scroll', zh: '多分屏视口同步滚动', ja: 'マルチペイン同期スクロール', ko: '다중 분할 동기 스크롤' }[lang],
    sftpTitle: { en: 'SFTP File Manager', zh: 'SFTP 文件管理', ja: 'SFTP ファイル管理', ko: 'SFTP 파일 관리자' }[lang],
    connected: { en: 'CONNECTED', zh: '已连接', ja: '接続完了', ko: '연결됨' }[lang],
  };

  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl p-[1px] bg-gradient-to-b from-blue-500/30 via-slate-700/40 to-slate-800/20 shadow-2xl shadow-blue-500/10">
      {/* Top Application Frame */}
      <div className={`rounded-2xl overflow-hidden ${currentTheme.card} border ${currentTheme.border} text-slate-300 font-sans shadow-2xl`}>
        {/* macOS Title Bar & Omnibar */}
        <div className="h-11 bg-[#141414] border-b border-[#2b2b2b] px-4 flex items-center justify-between select-none">
          {/* Traffic lights */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
            <span className="ml-2 text-xs font-semibold tracking-wider text-slate-400">OmniTerminal</span>
          </div>

          {/* Omnibar / Quick Connect */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] border border-[#333333] rounded-lg text-xs text-slate-300 w-96 max-w-full">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">ssh://</span>
            <span className="text-blue-400 font-mono">root@10.0.8.12:22</span>
            <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
              Return ↵
            </span>
          </div>

          {/* Right Tools & Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">{labels.theme}</span>
            <div className="flex bg-[#1e1e1e] p-0.5 rounded-lg border border-[#333333] text-xs">
              <button
                onClick={() => setActiveTheme('vscode')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${activeTheme === 'vscode' ? 'bg-[#0078d4] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                VS Code
              </button>
              <button
                onClick={() => setActiveTheme('tokyonight')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${activeTheme === 'tokyonight' ? 'bg-[#7aa2f7] text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Tokyo
              </button>
              <button
                onClick={() => setActiveTheme('catppuccin')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${activeTheme === 'catppuccin' ? 'bg-[#89b4fa] text-slate-900 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Mocha
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Body: Left Tree + Center Terminal + Right SFTP */}
        <div className="flex flex-col md:flex-row h-[460px] text-xs">
          {/* Left Session Tree (Desktop only) */}
          <div className="w-56 bg-[#181818] border-r border-[#2b2b2b] p-3 hidden lg:flex flex-col select-none">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>{labels.explorer}</span>
              <span className="text-slate-500">AES-256 🔒</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium py-1 px-1.5 rounded hover:bg-[#252526] cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>{labels.prod}</span>
              </div>
              <div className="pl-4 space-y-0.5">
                <div 
                  onClick={() => setActiveTab('bastion')}
                  className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors ${activeTab === 'bastion' ? 'bg-[#0078d4]/20 text-blue-300 border border-blue-500/30' : 'text-slate-300 hover:bg-[#252526]'}`}
                >
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>prod-bastion-01</span>
                </div>
                <div 
                  onClick={() => setActiveTab('redis')}
                  className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors ${activeTab === 'redis' ? 'bg-[#0078d4]/20 text-blue-300 border border-blue-500/30' : 'text-slate-300 hover:bg-[#252526]'}`}
                >
                  <Server className="w-3.5 h-3.5 text-rose-400" />
                  <span>redis-master-node</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 py-1 px-1.5 rounded hover:bg-[#252526] cursor-pointer pt-2">
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                <Folder className="w-3.5 h-3.5 text-slate-500" />
                <span>{labels.staging}</span>
              </div>
            </div>

            {/* Quick credentials indicator */}
            <div className="mt-auto p-2 bg-[#1e1e1e] rounded-lg border border-[#2b2b2b]">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{labels.vault}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {labels.vaultInfo}
              </div>
            </div>
          </div>

          {/* Center Terminal View */}
          <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
            {/* Tabs Bar */}
            <div className="h-9 bg-[#181818] border-b border-[#2b2b2b] flex items-center px-1 overflow-x-auto gap-0.5">
              <div 
                onClick={() => setActiveTab('bastion')}
                className={`px-3 py-1.5 flex items-center gap-2 border-r border-[#2b2b2b] cursor-pointer transition-colors ${activeTab === 'bastion' ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#0078d4]' : 'text-slate-400 hover:bg-[#1e1e1e]/50'}`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono">prod-bastion-01 (SSH)</span>
              </div>
              <div 
                onClick={() => setActiveTab('redis')}
                className={`px-3 py-1.5 flex items-center gap-2 border-r border-[#2b2b2b] cursor-pointer transition-colors ${activeTab === 'redis' ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#0078d4]' : 'text-slate-400 hover:bg-[#1e1e1e]/50'}`}
              >
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="font-mono">redis-master (SSH)</span>
              </div>
              <div 
                onClick={() => setActiveTab('local')}
                className={`px-3 py-1.5 flex items-center gap-2 border-r border-[#2b2b2b] cursor-pointer transition-colors ${activeTab === 'local' ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#0078d4]' : 'text-slate-400 hover:bg-[#1e1e1e]/50'}`}
              >
                <Terminal className="w-3 h-3 text-slate-400" />
                <span className="font-mono">local zsh</span>
              </div>

              {/* Action toggles */}
              <div className="ml-auto flex items-center gap-1.5 pr-2">
                <button
                  onClick={() => setSftpOpen(!sftpOpen)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 ${sftpOpen ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-[#1e1e1e] text-slate-400 border-[#333333] hover:text-white'}`}
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>SFTP {labels.sftpToggle}</span>
                </button>
              </div>
            </div>

            {/* Terminal Screen / Log Canvas */}
            <div className={`flex-1 p-4 font-mono text-[12px] leading-relaxed overflow-y-auto ${currentTheme.bg}`}>
              <div className="text-slate-400 mb-2">
                Welcome to OmniTerminal v1.0.0 (Darwin arm64) • WebGL GPU Accelerated
              </div>
              
              {commandHistory.map((line, idx) => (
                <div key={idx} className="mb-1 text-slate-300">
                  {line.startsWith('$') ? (
                    <span className={currentTheme.prompt}>{line}</span>
                  ) : line.includes('✓') ? (
                    <span className="text-emerald-400">{line}</span>
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2 mt-2">
                <span className={currentTheme.prompt}>root@bastion-01:~$</span>
                <span className="text-white">{demoCommand}</span>
                <span className="w-2 h-4 bg-blue-400 animate-pulse" />
              </div>
            </div>

            {/* Interactive demo action buttons bar */}
            <div className="bg-[#181818] border-t border-[#2b2b2b] p-2 flex items-center justify-between text-xs overflow-x-auto">
              <span className="text-slate-400 text-[11px] hidden sm:inline">{labels.tryDemo}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleRunCommand('sftp')}
                  className="px-2.5 py-1 bg-[#252526] hover:bg-[#2d2d30] border border-[#333] rounded text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                >
                  <UploadCloud className="w-3 h-3 text-blue-400" />
                  <span>{labels.toggleSftp}</span>
                </button>
                <button
                  onClick={() => handleRunCommand('filter')}
                  className="px-2.5 py-1 bg-[#252526] hover:bg-[#2d2d30] border border-[#333] rounded text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                >
                  <Search className="w-3 h-3 text-rose-400" />
                  <span>{labels.filterBtn}</span>
                </button>
                <button
                  onClick={() => handleRunCommand('sync')}
                  className="px-2.5 py-1 bg-[#252526] hover:bg-[#2d2d30] border border-[#333] rounded text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>{labels.syncBtn}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right SFTP Side-by-side Panel */}
          {sftpOpen && (
            <div className="w-72 bg-[#181818] border-l border-[#2b2b2b] flex flex-col transition-all duration-300">
              <div className="p-2.5 bg-[#202020] border-b border-[#2b2b2b] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-slate-200 text-xs">
                  <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>{labels.sftpTitle}</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {labels.connected}
                </span>
              </div>

              {/* Path Bar */}
              <div className="px-3 py-1.5 bg-[#141414] border-b border-[#2b2b2b] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span className="truncate">/var/log/nginx/</span>
                <span className="text-slate-500">chmod 755</span>
              </div>

              {/* File list */}
              <div className="flex-1 p-2 space-y-1 overflow-y-auto font-mono text-[11px]">
                <div className="flex items-center justify-between p-1 rounded hover:bg-[#252526] cursor-pointer text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>access_logs/</span>
                  </div>
                  <span className="text-[10px] text-slate-500">4 KB</span>
                </div>
                <div className="flex items-center justify-between p-1 rounded hover:bg-[#252526] cursor-pointer text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>error.log</span>
                  </div>
                  <span className="text-[10px] text-slate-500">2.4 MB</span>
                </div>
                <div className="flex items-center justify-between p-1 rounded hover:bg-[#252526] cursor-pointer text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>nginx.conf</span>
                  </div>
                  <span className="text-[10px] text-slate-500">1.8 KB</span>
                </div>
              </div>

              {/* Active Transfer Progress */}
              <div className="p-2.5 bg-[#141414] border-t border-[#2b2b2b]">
                <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                  <span className="truncate">upload: bundle.tar.gz</span>
                  <span className="text-blue-400 font-mono">84%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-[84%] transition-all duration-300" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>42.5 MB / 50.8 MB</span>
                  <span>14.2 MB/s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

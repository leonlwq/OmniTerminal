import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Terminal, Folder, Sparkles, Activity, Shield, Server,
  Sliders, ArrowRight, CornerDownLeft, Lock, FileCode, Split, 
  Sun, Moon, Monitor, Upload, Download, Radio, Eye, Camera, Clock,
  Cpu, Wrench
} from 'lucide-react';
import { app, models } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';

export interface CommandPaletteItem {
  id: string;
  category: 'actions' | 'sessions' | 'quickCommands' | 'tools';
  categoryLabel: string;
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: app.SessionConfig[];
  quickCommandSets: models.QuickCommandSet[];
  onConnectSession: (session: app.SessionConfig) => void;
  onRunCommand: (cmd: string) => void;
  onAction: (actionId: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  sessions,
  quickCommandSets,
  onConnectSession,
  onRunCommand,
  onAction,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allItems: CommandPaletteItem[] = useMemo(() => {
    const list: CommandPaletteItem[] = [];

    // 1. 系统核心功能操作 (Actions)
    list.push(
      {
        id: 'new-session',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.newSessionTitle'),
        subtitle: t('commandPalette.newSessionDesc'),
        shortcut: 'Ctrl+N',
        icon: <Terminal className="w-4 h-4 text-blue-400" />,
        action: () => onAction('new_session'),
        keywords: ['xinjian', 'session', 'ssh', 'connect', 'new', 'create'],
      },
      {
        id: 'new-local-shell',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.newLocalShellTitle'),
        subtitle: t('commandPalette.newLocalShellDesc'),
        shortcut: 'Ctrl+L',
        icon: <FileCode className="w-4 h-4 text-emerald-400" />,
        action: () => onAction('new_local_shell'),
        keywords: ['local', 'shell', 'bendi', 'zsh', 'bash'],
      },
      {
        id: 'toggle-ai',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.toggleAiTitle'),
        subtitle: t('commandPalette.toggleAiDesc'),
        shortcut: 'Ctrl+K',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => onAction('open_ai'),
        keywords: ['ai', 'copilot', 'chat', 'zhineng', 'gpt', 'deepseek'],
      },
      {
        id: 'toggle-sftp',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.toggleSftpTitle'),
        subtitle: t('commandPalette.toggleSftpDesc'),
        icon: <Folder className="w-4 h-4 text-amber-400" />,
        action: () => onAction('toggle_sftp'),
        keywords: ['sftp', 'file', 'wenjian', 'upload', 'download'],
      },
      {
        id: 'split-vertical',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.splitVerticalTitle'),
        subtitle: t('commandPalette.splitVerticalDesc'),
        icon: <Split className="w-4 h-4 text-cyan-400" />,
        action: () => onAction('split_vertical'),
        keywords: ['fenping', 'split', 'vertical', 'chuizhi'],
      },
      {
        id: 'split-horizontal',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.splitHorizontalTitle'),
        subtitle: t('commandPalette.splitHorizontalDesc'),
        icon: <Split className="w-4 h-4 text-cyan-400 rotate-90" />,
        action: () => onAction('split_horizontal'),
        keywords: ['fenping', 'split', 'horizontal', 'shuiping'],
      },
      {
        id: 'split-grid',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.splitGridTitle'),
        subtitle: t('commandPalette.splitGridDesc'),
        icon: <Split className="w-4 h-4 text-cyan-400" />,
        action: () => onAction('split_grid'),
        keywords: ['fenping', 'grid', '4', 'sifenping'],
      },
      {
        id: 'close-split',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.closeSplitTitle'),
        subtitle: t('commandPalette.closeSplitDesc'),
        icon: <Split className="w-4 h-4 text-slate-400" />,
        action: () => onAction('close_split'),
        keywords: ['close split', 'danmianban'],
      },
      {
        id: 'toggle-broadcast',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.toggleBroadcastTitle'),
        subtitle: t('commandPalette.toggleBroadcastDesc'),
        icon: <Radio className="w-4 h-4 text-rose-400" />,
        action: () => onAction('toggle_broadcast'),
        keywords: ['guangbo', 'broadcast', 'tongbu'],
      },
      {
        id: 'lock-app',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.lockAppTitle'),
        subtitle: t('commandPalette.lockAppDesc'),
        icon: <Lock className="w-4 h-4 text-amber-400" />,
        action: () => onAction('lock_workspace'),
        keywords: ['suoding', 'lock', 'master password', 'mima'],
      },
      {
        id: 'screenshot-terminal',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.screenshotTitle'),
        subtitle: t('commandPalette.screenshotDesc'),
        icon: <Camera className="w-4 h-4 text-emerald-400" />,
        action: () => onAction('screenshot'),
        keywords: ['jieping', 'screenshot', 'snapshot', 'tupian'],
      },
      {
        id: 'import-openssh',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.importOpensshTitle'),
        subtitle: t('commandPalette.importOpensshDesc'),
        icon: <Upload className="w-4 h-4 text-blue-400" />,
        action: () => onAction('import_openssh'),
        keywords: ['import', 'openssh', 'ssh_config', 'daoru'],
      },
      {
        id: 'export-openssh',
        category: 'actions',
        categoryLabel: t('commandPalette.catActions'),
        title: t('commandPalette.exportOpensshTitle'),
        subtitle: t('commandPalette.exportOpensshDesc'),
        icon: <Download className="w-4 h-4 text-blue-400" />,
        action: () => onAction('export_openssh'),
        keywords: ['export', 'openssh', 'daochu'],
      }
    );

    // 2. 运维监控与高级工具 (Tools)
    list.push(
      {
        id: 'tool-host-monitor',
        category: 'tools',
        categoryLabel: t('commandPalette.catTools'),
        title: t('commandPalette.hostMonitorTitle'),
        subtitle: t('commandPalette.hostMonitorDesc'),
        icon: <Activity className="w-4 h-4 text-blue-400" />,
        action: () => onAction('open_host_monitor'),
        keywords: ['jiankong', 'monitor', 'cpu', 'memory', 'top', 'perf'],
      },
      {
        id: 'tool-remote-ops',
        category: 'tools',
        categoryLabel: t('commandPalette.catTools'),
        title: t('commandPalette.remoteOpsTitle'),
        subtitle: t('commandPalette.remoteOpsDesc'),
        icon: <Cpu className="w-4 h-4 text-indigo-400" />,
        action: () => onAction('open_remote_ops'),
        keywords: ['jincheng', 'process', 'systemd', 'service', 'kill', 'ps'],
      },
      {
        id: 'tool-realtime-log',
        category: 'tools',
        categoryLabel: t('commandPalette.catTools'),
        title: t('commandPalette.realtimeLogTitle'),
        subtitle: t('commandPalette.realtimeLogDesc'),
        icon: <Eye className="w-4 h-4 text-emerald-400" />,
        action: () => onAction('open_realtime_log'),
        keywords: ['tail', 'log', 'rizhi', 'syslog', 'nginx'],
      },
      {
        id: 'tool-ssh-tunnels',
        category: 'tools',
        categoryLabel: t('commandPalette.catTools'),
        title: t('commandPalette.sshTunnelsTitle'),
        subtitle: t('commandPalette.sshTunnelsDesc'),
        icon: <Server className="w-4 h-4 text-amber-400" />,
        action: () => onAction('open_tunnels'),
        keywords: ['tunnel', 'suidao', 'port forwarding', 'socks5', 'proxy'],
      },
      {
        id: 'tool-cloud-sync',
        category: 'tools',
        categoryLabel: t('commandPalette.catTools'),
        title: t('commandPalette.cloudSyncTitle'),
        subtitle: t('commandPalette.cloudSyncDesc'),
        icon: <Shield className="w-4 h-4 text-cyan-400" />,
        action: () => onAction('open_cloud_sync'),
        keywords: ['sync', 'cloud', 'webdav', 's3', 'tongbu', 'e2ee'],
      },
      {
        id: 'tool-settings',
        category: 'tools',
        categoryLabel: t('commandPalette.catTools'),
        title: t('commandPalette.settingsTitle'),
        subtitle: t('commandPalette.settingsDesc'),
        shortcut: 'Alt+O',
        icon: <Sliders className="w-4 h-4 text-slate-400" />,
        action: () => onAction('open_settings'),
        keywords: ['shezhi', 'settings', 'theme', 'font', 'preferences'],
      }
    );

    // 3. 快速连接会话 (Sessions)
    sessions.forEach(s => {
      if (!s.isFolder) {
        list.push({
          id: `session-${s.id}`,
          category: 'sessions',
          categoryLabel: t('commandPalette.catSessions'),
          title: s.name,
          subtitle: `${s.isLocal ? (t('commandPalette.newLocalShellTitle') || 'Local Shell') : `${s.protocol?.toUpperCase() || 'SSH'} · ${s.user || 'root'}@${s.host}:${s.port || 22}`}${s.colorLabel ? ` [${s.colorLabel}]` : ''}`,
          icon: <Server className="w-4 h-4 text-blue-400" />,
          action: () => onConnectSession(s),
          keywords: [s.name, s.host, s.user, String(s.port || 22), s.colorLabel || '', 'session', 'connect'],
        });
      }
    });

    // 4. 快捷命令 (Quick Commands)
    quickCommandSets.forEach(set => {
      (set.commands || []).forEach(cmd => {
        list.push({
          id: `cmd-${cmd.label}-${cmd.cmd}`,
          category: 'quickCommands',
          categoryLabel: t('commandPalette.catQuickCmds'),
          title: cmd.label,
          subtitle: cmd.cmd,
          icon: <Terminal className="w-4 h-4 text-amber-400" />,
          action: () => onRunCommand(cmd.cmd),
          keywords: [cmd.label, cmd.cmd, 'command', 'zhiling'],
        });
      });
    });

    return list;
  }, [sessions, quickCommandSets, onAction, onConnectSession, onRunCommand, t]);

  // 模糊搜索过滤
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 30);
    const q = query.trim().toLowerCase();
    return allItems.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle && item.subtitle.toLowerCase().includes(q)) return true;
      if (item.keywords && item.keywords.some(k => k.toLowerCase().includes(q))) return true;
      return false;
    }).slice(0, 40);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg flex flex-col overflow-hidden text-xs text-[#cccccc] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] gap-2.5">
          <Search className="w-4 h-4 text-[#0078d4] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 bg-transparent text-sm text-[#e0e0e0] placeholder:text-[#858585] focus:outline-none font-medium"
          />
          {query ? (
            <button 
              onClick={() => setQuery('')}
              className="text-[#858585] hover:text-[#e0e0e0] px-2 py-0.5 text-[11px] rounded bg-[#333333] transition-colors"
            >
              {t('commandPalette.clear')}
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-[#858585] bg-[#2d2d2d] border border-[#3c3c3c] rounded">
              ⌘P / Ctrl+P
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto p-2 space-y-0.5 bg-[#1e1e1e] scrollbar-thin scrollbar-thumb-[#3c3c3c]"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-[#858585] space-y-2">
              <Terminal className="w-8 h-8 mx-auto text-[#555555]" />
              <p className="text-xs">{t('commandPalette.emptyTitle')} &quot;{query}&quot;</p>
              <p className="text-[11px] text-[#666666]">{t('commandPalette.emptyHint')}</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-[#04395e] text-white' 
                      : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-1 rounded shrink-0 ${isSelected ? 'bg-[#0078d4] text-white' : 'bg-[#2d2d2d] border border-[#3c3c3c] text-[#858585]'}`}>
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-[#e0e0e0]'}`}>
                          {item.title}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal shrink-0 ${
                          isSelected ? 'bg-white/15 text-white' : 'bg-[#2d2d2d] text-[#858585] border border-[#3c3c3c]'
                        }`}>
                          {item.categoryLabel}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className={`text-[11px] truncate mt-0.5 font-mono ${
                          isSelected ? 'text-[#a9cce3]' : 'text-[#858585]'
                        }`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <kbd className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#2d2d2d] text-[#858585] border border-[#3c3c3c]'
                      }`}>
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#a9cce3]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585]">
          <div className="flex items-center space-x-3">
            <span>{t('commandPalette.navHint')}</span>
            <span>{t('commandPalette.enterHint')}</span>
            <span>{t('commandPalette.escHint')}</span>
          </div>
          <span>{t('commandPalette.footerTitle')}</span>
        </div>
      </div>
    </div>
  );
};

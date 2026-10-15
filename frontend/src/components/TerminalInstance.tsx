import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Filter, Play, Pause, Trash2, Copy, Check, ChevronDown, ChevronUp, Sparkles, Plus, Terminal as TermIcon, Lightbulb, Clock, Table, Bookmark, Flag, Layers } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { CanvasAddon } from '@xterm/addon-canvas';
import { SearchAddon } from '@xterm/addon-search';
import { ImageAddon } from '@xterm/addon-image';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { LigaturesAddon } from '@xterm/addon-ligatures';
import { Unicode11Addon } from '@xterm/addon-unicode11';

// 共享 TextDecoder 单例，消除热路径高频分配与垃圾回收
const sharedUtf8Decoder = new TextDecoder('utf-8', { fatal: false });
const sharedLatin1Decoder = new TextDecoder('latin1');
import { ZmodemAddon } from '../utils/ZmodemAddon';
import { HighlightAddon } from '../utils/HighlightAddon';
import { ConnectSSH, ConnectSerial, ConnectTelnet, ConnectRawTCP, ConnectLocalShell, WriteSSH, ResizeSSH, DisconnectSSH } from '../../wailsjs/go/app/App';
import { EventsOn, ClipboardSetText, ClipboardGetText, BrowserOpenURL } from '../../wailsjs/runtime/runtime';
import { SafePasteModal } from './SafePasteModal';
import { StructuredOutputOverlay } from './StructuredOutputOverlay';
import { CommandBlockOverlay, CommandBlock } from './CommandBlockOverlay';
import { models } from '../../wailsjs/go/models';
import { TerminalSearchBar } from './terminal/TerminalSearchBar';
import { TerminalTimerPopover } from './terminal/TerminalTimerPopover';
import { TerminalLiveFilterPane } from './terminal/TerminalLiveFilterPane';
import { TerminalContextMenu } from './terminal/TerminalContextMenu';
import { TerminalBookmarkDrawer } from './terminal/TerminalBookmarkDrawer';
import { TerminalStatusOverlays } from './terminal/TerminalStatusOverlays';
import { TerminalQuickCommandRibbon } from './terminal/TerminalQuickCommandRibbon';
import { TerminalCommandBlockView } from './terminal/TerminalCommandBlockView';
import { TerminalSearchMinimap } from './terminal/TerminalSearchMinimap';
import { InlineAICopilotPopover } from './terminal/InlineAICopilotPopover';
import { MiniServerTelemetryWidget } from './terminal/MiniServerTelemetryWidget';
import { MultiplexBadge } from './terminal/MultiplexBadge';
import { getContextAwareSuggestion } from '../constants/commandCompletionDb';
import { useI18n } from '../i18n/I18nContext';

const COMMON_COMMANDS = [
  'docker ps', 'docker ps -a', 'docker compose up -d', 'docker compose down', 'docker compose logs -f',
  'docker logs --tail 100 -f', 'docker exec -it', 'docker stop', 'docker restart',
  'systemctl status', 'systemctl restart', 'systemctl stop', 'systemctl start', 'systemctl enable',
  'journalctl -u', 'journalctl -xe', 'journalctl -f',
  'git status', 'git pull', 'git push', 'git checkout -b', 'git checkout', 'git commit -m ""', 'git diff', 'git log --oneline -n 10',
  'kubectl get pods', 'kubectl get nodes', 'kubectl get svc', 'kubectl logs -f', 'kubectl describe pod',
  'tar -czvf archive.tar.gz', 'tar -xzvf archive.tar.gz', 'tar -xvf', 'zip -r archive.zip', 'unzip',
  'grep -rnw "." -e ""', 'find . -name ""', 'find . -type f -size +100M',
  'netstat -tuln', 'ss -tuln', 'lsof -i :', 'ps aux | grep', 'top', 'htop',
  'df -h', 'free -h', 'du -sh *', 'uptime', 'chmod 755', 'chmod +x', 'chown -R',
  'curl -fsSL', 'curl -I', 'wget', 'ping -c 4', 'ssh-keygen -t ed25519',
  'cat /etc/os-release', 'cat /proc/cpuinfo', 'cat /proc/meminfo',
  'tail -f /var/log/syslog', 'tail -f /var/log/messages', 'tail -f /var/log/nginx/access.log',
  'sudo apt update && sudo apt upgrade -y', 'sudo yum update -y', 'sudo dnf update -y'
];

export const terminalBuffers: Record<string, () => string[]> = {};
export const activeTerminals: Record<string, Terminal> = {};
export const searchAddons: Record<string, SearchAddon> = {};
export const terminalCastRecordings: Record<string, () => string> = {};

import { THEMES, hexToRgba } from "../constants/terminalThemes";
export { THEMES, hexToRgba };

// 共享高效 Base64 编解码单例工具，消除每个组件实例与热路径下的重复定义与 GC 压力
export const fastBase64ToBytes = (b64: string): Uint8Array => {
  if (typeof (Uint8Array as any).fromBase64 === 'function') {
    try {
      return (Uint8Array as any).fromBase64(b64);
    } catch (_) {}
  }
  const binary = window.atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const fastBytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof (bytes as any).toBase64 === 'function') {
    try {
      return (bytes as any).toBase64();
    } catch (_) {}
  }
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
};

interface TerminalInstanceProps {
  sessionId: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  privateKey?: string;
  identityKeyId?: string;
  isActive: boolean;
  themeName: string;
  fontFamily: string;
  fontSize: number;
  loginScripts?: any[];
  triggers?: any[];
  overrideTheme?: string;
  overrideFontSize?: number;
  logConfig?: any;
  tunnels?: any[];
  isRecordingMacro?: boolean;
  onClosed?: () => void;
  onTerminalReady?: (cols: number, rows: number, sessionId?: string) => void;
  onStatusChange?: (sessionId: string, status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;
  onTrafficUpdate?: (sessionId: string, rx: number, tx: number) => void;
  onUserInput?: (data: string, sessionId: string) => void;
  encoding?: string;
  jumpHostSessionId?: string;
  termType?: string;
  isLocal?: boolean;
  proxyType?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUser?: string;
  proxyPassword?: string;
  ciphers?: string[];
  macs?: string[];
  sessionMode?: string;
  enableAgentForwarding?: boolean;
  enableX11Forwarding?: boolean;
  x11Display?: string;

  // Phase 2: 多协议属性
  protocol?: string;
  serialConfig?: models.SerialConfig;
  lineEnding?: string;
  wslDistro?: string;
  shellPath?: string;
  moshServerPath?: string;
  moshPortRange?: string;

  onDirectoryChange?: (sessionId: string, newDir: string) => void;
  scrollbackLines?: number;
  copyOnSelect?: boolean;
  cursorStyle?: 'block' | 'underline' | 'bar';
  cursorBlink?: boolean;
  enableBell?: boolean;

  enableHighlightRules?: boolean;
  highlightRules?: any[];
  onAddHighlightRule?: (rule: any) => void;
  keyMappings?: any[];
  rightClickAction?: string;
  doubleClickAction?: string;

  overrideScrollback?: number;
  overrideCursorStyle?: string;
  overrideCursorBlink?: number; // 0 继承，1 启用，2 禁用
  overrideEnableBell?: number;  // 0 继承，1 启用，2 禁用
  overrideCopyOnSelect?: number; // 0 继承，1 启用，2 禁用
  terminalOpacity?: number;
  overrideTerminalOpacity?: number;
  enableBlur?: boolean;
  lineHeight?: number;
  overrideLineHeight?: number;
  terminalPadding?: number;
  overrideTerminalPadding?: number;
  backgroundBlur?: number;
  backgroundFit?: string;
  enableLigatures?: boolean;
  overrideEnableLigatures?: number;
  customThemes?: models.CustomThemeConfig[];
  nonAsciiFontFamily?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;

  // Phase 7 P0: 终端外观增强
  fontWeight?: string;
  fontWeightBold?: string;
  letterSpacing?: number;
  minimumContrastRatio?: number;
  globalBackgroundImage?: string;
  globalBackgroundOpacity?: number;
  globalBackgroundBlur?: number;
  globalBackgroundFit?: string;

  // Phase 2 (P1): 终端进阶外观与符号控制
  customGlyphs?: boolean;
  unicodeVersion?: string;
  drawBoldTextInBrightColors?: boolean;
  cursorColor?: string;
  cursorAccentColor?: string;
  selectionBackground?: string;
  selectionForeground?: string;

  // Phase 3 (P2): 渲染引擎模式与抗锯齿
  rendererType?: string;
  fontSmoothing?: string;

  // Phase 8 (25.4.1): 终端内联图像协议 (Sixel & iTerm2)
  enableTerminalImages?: boolean;
  imageStorageLimitMB?: number;

  enableSafePaste?: boolean;
  enableDangerousGuard?: boolean;
  dangerousRules?: models.DangerousCommandRule[];
  useAltAsMeta?: boolean;
  wordSeparators?: string;
  openLinksOnClick?: boolean;
  quickCommands?: models.QuickCommand[];
  onOpenQuickCommandManager?: () => void;
  syncScroll?: boolean;
  onScrollSync?: (ratio: number, sessionId: string) => void;
  charSendDelayMs?: number;
  lineSendDelayMs?: number;
  overrideCharSendDelayMs?: number;
  overrideLineSendDelayMs?: number;
  onTriggerAIDiagnose?: (errorText: string, lastCommand: string) => void;
  aiConfig?: models.AIConfig;

  // Phase 8 (25.4.3): 终端视口 Mini 服务器硬件遥测小部件
  enableMiniTelemetry?: boolean;
  miniTelemetryIntervalSec?: number;

  // 选项卡切换与全局快捷键
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onSelectTabByIndex?: (index: number) => void;
  onNewLocalTab?: () => void;
  onCloseCurrentTab?: () => void;
  onNewSession?: () => void;
  onToggleAICopilot?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onOpenSettings?: () => void;
  onToggleSidebar?: () => void;
  onToggleCompose?: () => void;
  onToggleSftp?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenShortcuts?: () => void;
  onToggleBroadcast?: () => void;
  onToggleSplitVertical?: () => void;
  onToggleSplitHorizontal?: () => void;
  onToggleTunnelMonitor?: () => void;
  onToggleHostMonitor?: () => void;
  onToggleRemoteOps?: () => void;
  onToggleRealtimeLog?: () => void;
  onExplainText?: (text: string) => void;
  showCommandDuration?: boolean;
  osc52Mode?: string;
  osc52MaxBytes?: number;
  osc52ShowToast?: boolean;
  enableStructuredOutput?: boolean;
  containerType?: string;
  dockerHostSessionId?: string;
  dockerContainerId?: string;
  dockerShell?: string;
  k8sNamespace?: string;
  k8sPod?: string;
  k8sContainer?: string;
  k8sKubeconfig?: string;
  isCommandBlockMode?: boolean;
  onToggleCommandBlockMode?: (sessionId?: string) => void;
}

const TerminalInstanceComponent: React.FC<TerminalInstanceProps> = ({
  sessionId,
  name,
  host,
  port,
  user,
  onExplainText,
  showCommandDuration = false,
  osc52Mode = 'write',
  osc52MaxBytes = 102400,
  osc52ShowToast = true,
  enableStructuredOutput = false,
  isCommandBlockMode: isCommandBlockModeProp,
  onToggleCommandBlockMode: onToggleCommandBlockModeProp,
  password = '',
  privateKey = '',
  identityKeyId = '',
  isActive,
  themeName,
  fontFamily,
  fontSize,
  lineHeight = 1.2,
  overrideLineHeight = 0,
  terminalPadding = 8,
  overrideTerminalPadding = 0,
  backgroundBlur = 0,
  backgroundFit = 'cover',
  enableLigatures = true,
  overrideEnableLigatures = 0,
  fontWeight = 'normal',
  fontWeightBold = 'bold',
  letterSpacing = 0,
  minimumContrastRatio = 1,
  globalBackgroundImage = '',
  globalBackgroundOpacity = 0.3,
  globalBackgroundBlur = 0,
  globalBackgroundFit = 'cover',
  customGlyphs = true,
  unicodeVersion = '11',
  drawBoldTextInBrightColors = true,
  cursorColor = '',
  cursorAccentColor = '',
  selectionBackground = '',
  selectionForeground = '',
  rendererType = 'auto',
  fontSmoothing = 'antialiased',
  enableTerminalImages = true,
  imageStorageLimitMB = 128,
  enableMiniTelemetry = true,
  miniTelemetryIntervalSec = 3,
  customThemes = [],
  quickCommands = [],
  onOpenQuickCommandManager,
  syncScroll = false,
  onScrollSync,
  charSendDelayMs = 0,
  lineSendDelayMs = 0,
  overrideCharSendDelayMs = 0,
  overrideLineSendDelayMs = 0,
  loginScripts = [],
  triggers = [],
  overrideTheme = '',
  overrideFontSize = 0,
  logConfig,
  tunnels = [],
  isRecordingMacro = false,
  onClosed,
  onTerminalReady,
  onStatusChange,
  onTrafficUpdate,
  onUserInput,
  encoding = 'utf-8',
  jumpHostSessionId = '',
  termType = 'xterm-256color',
  isLocal = false,
  proxyType = 'none',
  proxyHost = '',
  proxyPort = 0,
  proxyUser = '',
  proxyPassword = '',
  ciphers = [],
  macs = [],
  sessionMode = "ssh",
  enableAgentForwarding = false,
  enableX11Forwarding = false,
  x11Display = "",
  terminalOpacity = 1.0,
  overrideTerminalOpacity = 0,
  enableBlur = false,
  nonAsciiFontFamily,
  backgroundImage,
  backgroundOpacity,

  scrollbackLines = 5000,
  copyOnSelect = false,
  cursorStyle = 'block',
  cursorBlink = true,
  enableBell = true,

  enableHighlightRules = true,
  highlightRules = [],
  onAddHighlightRule,
  keyMappings = [],
  rightClickAction = 'contextMenu',
  doubleClickAction = 'selectWord',

  overrideScrollback = 0,
  overrideCursorStyle = '',
  overrideCursorBlink = 0,
  overrideEnableBell = 0,
  overrideCopyOnSelect = 0,

  enableSafePaste = true,
  enableDangerousGuard = true,
  dangerousRules = [],
  useAltAsMeta = true,
  onDirectoryChange,
  wordSeparators = ` ~!@#$%^&*()=+[{]}\\|;:'",<>?`,
  openLinksOnClick = false,
  protocol = 'ssh',
  serialConfig,
  lineEnding = 'CRLF',
  wslDistro = '',
  shellPath = '',
  moshServerPath = 'mosh-server',
  moshPortRange = '60000:61000',
  containerType,
  dockerHostSessionId = '',
  dockerContainerId = '',
  dockerShell = '/bin/sh',
  k8sNamespace = 'default',
  k8sPod = '',
  k8sContainer = '',
  k8sKubeconfig = '',
  onTriggerAIDiagnose,
  aiConfig,
  onNextTab,
  onPrevTab,
  onSelectTabByIndex,
  onNewLocalTab,
  onCloseCurrentTab,
  onNewSession,
  onToggleAICopilot,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenSettings,
  onToggleSidebar,
  onToggleCompose,
  onToggleSftp,
  onOpenGlobalSearch,
  onOpenShortcuts,
  onToggleBroadcast,
  onToggleSplitVertical,
  onToggleSplitHorizontal,
  onToggleTunnelMonitor,
  onToggleHostMonitor,
  onToggleRemoteOps,
  onToggleRealtimeLog,
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const canvasAddonRef = useRef<CanvasAddon | null>(null);
  const imageAddonRef = useRef<ImageAddon | null>(null);
  const highlightAddonRef = useRef<HighlightAddon | null>(null);

  const disposeCanvas = useCallback(() => {
    if (canvasAddonRef.current) {
      try { canvasAddonRef.current.dispose(); } catch (_) {}
      canvasAddonRef.current = null;
    }
  }, []);

  const disposeWebgl = useCallback(() => {
    if (webglAddonRef.current) {
      try { webglAddonRef.current.dispose(); } catch (_) {}
      webglAddonRef.current = null;
    }
  }, []);

  const loadCanvasFallback = useCallback(() => {
    if (!termRef.current || canvasAddonRef.current) return;
    try {
      if (typeof document !== 'undefined') {
        const testEl = document.createElement('canvas');
        if (!testEl.getContext || !testEl.getContext('2d')) {
          return;
        }
      }
      const cAddon = new CanvasAddon();
      termRef.current.loadAddon(cAddon);
      canvasAddonRef.current = cAddon;
    } catch (err) {
      console.warn('CanvasAddon load error, falling back to DOM renderer', err);
    }
  }, []);

  // 终端智能补全与命令预测状态 (IntelliSense Ghost Text)
  const [ghostSuggestion, setGhostSuggestion] = useState<string | null>(null);
  const currentInputBufferRef = useRef<string>('');
  const commandHistoryRef = useRef<string[]>([]);
  const currentDirRef = useRef<string>('');

  // 终端报错特征智能捕获 (AI Error Detector)
  const [detectedError, setDetectedError] = useState<{ errorText: string; lastCmd: string } | null>(null);

  // Phase 8 (25.4.2): 行内即时 AI Copilot 浮层状态 (Cmd+K / Ctrl+K)
  const [isInlineAICopilotOpen, setIsInlineAICopilotOpen] = useState(false);
  const [inlineAICopilotMode, setInlineAICopilotMode] = useState<'command' | 'diagnose'>('command');
  const [inlineAICopilotError, setInlineAICopilotError] = useState('');
  const [inlineAICopilotLastCmd, setInlineAICopilotLastCmd] = useState('');

  // 选项卡切换与全局快捷键回调最新引用
  const tabShortcutsRef = useRef({
    onNextTab,
    onPrevTab,
    onSelectTabByIndex,
    onNewLocalTab,
    onCloseCurrentTab,
    onNewSession,
    onToggleAICopilot,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onOpenSettings,
    onToggleSidebar,
    onToggleCompose,
    onToggleSftp,
    onOpenGlobalSearch,
    onOpenShortcuts,
    onToggleBroadcast,
    onToggleSplitVertical,
    onToggleSplitHorizontal,
    onToggleTunnelMonitor,
    onToggleHostMonitor,
    onToggleRemoteOps,
    onToggleRealtimeLog,
  });
  useEffect(() => {
    tabShortcutsRef.current = {
      onNextTab,
      onPrevTab,
      onSelectTabByIndex,
      onNewLocalTab,
      onCloseCurrentTab,
      onNewSession,
      onToggleAICopilot,
      onZoomIn,
      onZoomOut,
      onZoomReset,
      onOpenSettings,
      onToggleSidebar,
      onToggleCompose,
      onToggleSftp,
      onOpenGlobalSearch,
      onOpenShortcuts,
      onToggleBroadcast,
      onToggleSplitVertical,
      onToggleSplitHorizontal,
      onToggleTunnelMonitor,
      onToggleHostMonitor,
      onToggleRemoteOps,
      onToggleRealtimeLog,
    };
  });

  // Write queue to guarantee order and prevent Wails IPC congestion
  const writeQueueRef = useRef<Uint8Array[]>([]);
  const isWritingRef = useRef<boolean>(false);
  // Dedup single-char input when xterm delivers the same keystroke via both paths
  const lastSentCharRef = useRef<{ data: string; time: number } | null>(null);


  // 辅助函数：将 Uint8Array 转为 Base64（复用全局快速分块转换单例）
  const bytesToBase64 = fastBytesToBase64;

  const processWriteQueue = async () => {
    if (isWritingRef.current || writeQueueRef.current.length === 0) return;
    isWritingRef.current = true;

    while (writeQueueRef.current.length > 0) {
      // 合并当前队列中所有的字节数组
      const pending = [...writeQueueRef.current];
      writeQueueRef.current = []; // 清空队列
      
      const totalLen = pending.reduce((acc, val) => acc + val.length, 0);
      const mergedBytes = new Uint8Array(totalLen);
      let offset = 0;
      for (const bytes of pending) {
        mergedBytes.set(bytes, offset);
        offset += bytes.length;
      }

      const b64Data = bytesToBase64(mergedBytes);
      if (b64Data && sessionId) {
        try {
          await WriteSSH(sessionId, b64Data);
        } catch (err) {
          console.error('Write SSH failed:', err);
        }
      }
    }
    
    isWritingRef.current = false;
  };
  
  const recordingRef = useRef(isRecordingMacro);
  useEffect(() => {
    recordingRef.current = isRecordingMacro;
  }, [isRecordingMacro]);

  const [connecting, setConnecting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 自动重连相关的 React 状态
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // 右键上下文菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 鼠标交互定制: 选区即复制 & 右键行为 (保持与最新配置动态同步，防止 useEffect 闭包陈旧)
  const copyOnSelectRef = useRef<boolean>(false);
  copyOnSelectRef.current = overrideCopyOnSelect === 1 ? true : overrideCopyOnSelect === 2 ? false : Boolean(copyOnSelect);

  const rightClickActionRef = useRef<string>(rightClickAction);
  rightClickActionRef.current = rightClickAction;

  const doubleClickActionRef = useRef<string>(doubleClickAction);
  doubleClickActionRef.current = doubleClickAction;

  const autoCopyTimerRef = useRef<any>(null);

  // 跨平台高可靠剪贴板读写助手 (同时支持 Wails IPC 与 Web 标准 API 互补)
  const safeCopyText = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await ClipboardSetText(text);
    } catch (e) {
      console.warn('Wails ClipboardSetText failed:', e);
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (e) {}
  }, []);

  const safeGetClipboardText = useCallback(async (): Promise<string> => {
    try {
      const text = await ClipboardGetText();
      if (text) return text;
    } catch (e) {
      console.warn('Wails ClipboardGetText failed:', e);
    }
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) return text;
      }
    } catch (e) {}
    return '';
  }, []);
  
  // 搜索栏状态
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchIsRegex, setSearchIsRegex] = useState(false);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchWholeWord, setSearchWholeWord] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [showLiveHex, setShowLiveHex] = useState(false);

  // 终端内嵌快捷命令带 (Quick Command Button Ribbon，默认不展开占用顶部控制台空间)
  const [isRibbonOpen, setIsRibbonOpen] = useState(false);

  // 实时日志过滤器状态 (Live Buffer Filter Pane)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPattern, setFilterPattern] = useState('');
  const [filterIsRegex, setFilterIsRegex] = useState(false);
  const [filterIsPaused, setFilterIsPaused] = useState(false);
  const [filterAutoScroll, setFilterAutoScroll] = useState(true);
  const [filterMatches, setFilterMatches] = useState<Array<{ id: string; time: string; lineNum: number; text: string }>>([]);
  const [copyNotice, setCopyNotice] = useState(false);
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const lineCounterRef = useRef<number>(0);
  const filterConfigRef = useRef({ isOpen: false, isPaused: false, pattern: '', isRegex: false });

  // 命令执行耗时与时间戳标注
  const [commandDurationInfo, setCommandDurationInfo] = useState<{ cmd: string; duration: string; timestamp: string } | null>(null);
  const commandStartTimeRef = useRef<number>(0);
  const lastExecutedCmdRef = useRef<string>('');

  // 24.1.1 & 24.1.5: OSC 52 剪贴板状态
  const [oscToast, setOscToast] = useState<string | null>(null);
  const oscToastTimerRef = useRef<any>(null);

  // 24.1.7: 终端语义化输出解析状态
  const [structuredOverlayOpen, setStructuredOverlayOpen] = useState(false);
  const [structuredContent, setStructuredContent] = useState<{ rawText: string; command: string }>({ rawText: '', command: '' });
  const [hasStructuredOutput, setHasStructuredOutput] = useState(false);
  const recentOutputBufferRef = useRef<string>('');

  // Asciinema Cast 录制事件缓冲
  const castEventsRef = useRef<Array<[number, string, string]>>([]);
  const castStartTimeRef = useRef<number>(0);

  // 24.2.4: 终端输出书签标记系统状态
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; line: number; previewText: string; createdAt: number; note?: string }>>([]);
  const [isBookmarkDrawerOpen, setIsBookmarkDrawerOpen] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);

  // 24.2.1: Warp 风格结构化命令块模式
  const [internalCommandBlockMode, setInternalCommandBlockMode] = useState(false);
  const activeCommandBlockMode = isCommandBlockModeProp !== undefined ? isCommandBlockModeProp : internalCommandBlockMode;
  const toggleCommandBlockMode = useCallback(() => {
    if (onToggleCommandBlockModeProp) {
      onToggleCommandBlockModeProp(sessionId);
    } else {
      setInternalCommandBlockMode(prev => !prev);
    }
  }, [onToggleCommandBlockModeProp, sessionId]);
  const [commandBlocks, setCommandBlocks] = useState<CommandBlock[]>([]);

  const addBookmarkAtCurrentLine = () => {
    if (!termRef.current) return;
    const buffer = termRef.current.buffer.active;
    const currentLine = buffer.baseY + buffer.cursorY;
    const lineObj = buffer.getLine(currentLine);
    const text = lineObj ? lineObj.translateToString(true) : '';
    const newBm = {
      id: `bm_${Date.now()}`,
      line: currentLine,
      previewText: text.slice(0, 80) || t('globalSearch.lineAt').replace('{line}', String(currentLine + 1)),
      createdAt: Date.now(),
    };
    setBookmarks(prev => [...prev.filter(b => b.line !== currentLine), newBm].sort((a, b) => a.line - b.line));
    setBookmarkToast(t('terminal.bookmarkAdded').replace('{line}', String(currentLine + 1)));
    setTimeout(() => setBookmarkToast(null), 2000);
  };

  const jumpToBookmark = (direction: 'prev' | 'next') => {
    if (!termRef.current || bookmarks.length === 0) return;
    const buffer = termRef.current.buffer.active;
    const currentViewportLine = buffer.viewportY;
    let target: typeof bookmarks[0] | undefined;

    if (direction === 'prev') {
      target = [...bookmarks].reverse().find(b => b.line < currentViewportLine) || bookmarks[bookmarks.length - 1];
    } else {
      target = bookmarks.find(b => b.line > currentViewportLine) || bookmarks[0];
    }

    if (target) {
      termRef.current.scrollToLine(target.line);
      setBookmarkToast(t('terminal.jumpToBookmark').replace('{line}', String(target.line + 1)));
      setTimeout(() => setBookmarkToast(null), 1500);
    }
  };

  useEffect(() => {
    if (isRecordingMacro) {
      castStartTimeRef.current = performance.now();
      castEventsRef.current = [];
    }
  }, [isRecordingMacro]);

  useEffect(() => {
    terminalCastRecordings[sessionId] = () => {
      const headerLine = JSON.stringify({
        version: 2,
        width: termRef.current?.cols || 80,
        height: termRef.current?.rows || 24,
        timestamp: Math.floor(Date.now() / 1000),
        title: `OmniTerminal Session - ${name}`,
        env: { SHELL: '/bin/bash', TERM: termType || 'xterm-256color' }
      });
      const lines = [headerLine, ...castEventsRef.current.map(e => JSON.stringify(e))].join('\n');
      return lines;
    };
    return () => {
      delete terminalCastRecordings[sessionId];
    };
  }, [sessionId, name, termType]);

  useEffect(() => {
    filterConfigRef.current = {
      isOpen: isFilterOpen,
      isPaused: filterIsPaused,
      pattern: filterPattern,
      isRegex: filterIsRegex
    };
  }, [isFilterOpen, filterIsPaused, filterPattern, filterIsRegex]);

  useEffect(() => {
    if (filterAutoScroll && filterScrollRef.current) {
      filterScrollRef.current.scrollTop = filterScrollRef.current.scrollHeight;
    }
  }, [filterMatches, filterAutoScroll]);

  const sendCommandToTerminal = (cmdText: string) => {
    if (!cmdText) return;
    const finalCmd = cmdText.endsWith('\r') || cmdText.endsWith('\n') ? cmdText : cmdText + '\r';
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(finalCmd);
    txBytesRef.current += rawBytes.length;
    writeQueueRef.current.push(rawBytes);
    processWriteQueue();
  };

  const highlightMatchText = (text: string, pattern: string, isRegex: boolean) => {
    if (!pattern) return text;
    try {
      const re = isRegex ? new RegExp(`(${pattern})`, 'gi') : new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(re);
      return parts.map((part, i) => 
        re.test(part) ? (
          <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  const hexLinesRef = useRef<string[]>([]);
  const [hexTick, setHexTick] = useState(0);
  const zmodemRef = useRef<ZmodemAddon | null>(null);
  
  const rxBytesRef = useRef<number>(0);
  const txBytesRef = useRef<number>(0);
  // 粘贴去重与防抖
  const lastPasteTimeRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  // 安全粘贴与高危拦截状态
  const [safePasteOpen, setSafePasteOpen] = useState(false);
  const [pendingPasteText, setPendingPasteText] = useState('');
  // 延时流控发送状态
  const [pacingProgress, setPacingProgress] = useState<{
    isActive: boolean;
    currentLine: number;
    totalLines: number;
    currentChar: number;
    totalChars: number;
  } | null>(null);
  const pacingAbortRef = useRef(false);

  const executePaste = async (
    text: string,
    options?: { charDelayMs?: number; lineDelayMs?: number }
  ) => {
    if (!text) return;

    const charDelay = options?.charDelayMs ?? (overrideCharSendDelayMs && overrideCharSendDelayMs > 0 ? overrideCharSendDelayMs : (charSendDelayMs ?? 0));
    const lineDelay = options?.lineDelayMs ?? (overrideLineSendDelayMs && overrideLineSendDelayMs > 0 ? overrideLineSendDelayMs : (lineSendDelayMs ?? 0));

    if (charDelay === 0 && lineDelay === 0) {
      const encoder = new TextEncoder();
      const rawBytes = encoder.encode(text);
      txBytesRef.current += rawBytes.length;
      writeQueueRef.current.push(rawBytes);
      processWriteQueue();
      return;
    }

    // 启用防吞字延时流控发送 (Paced Send Mode)
    pacingAbortRef.current = false;
    const lines = text.split('\n');
    const totalLines = lines.length;
    const totalChars = text.length;
    let sentChars = 0;

    setPacingProgress({
      isActive: true,
      currentLine: 1,
      totalLines,
      currentChar: 0,
      totalChars,
    });

    const encoder = new TextEncoder();

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      if (pacingAbortRef.current) break;
      const line = lines[lineIdx];
      const isLastLine = lineIdx === lines.length - 1;
      const lineWithEnd = isLastLine ? line : line + '\n';

      if (charDelay > 0) {
        // 按字符逐个延时发送
        for (let charIdx = 0; charIdx < lineWithEnd.length; charIdx++) {
          if (pacingAbortRef.current) break;
          const char = lineWithEnd[charIdx];
          const rawBytes = encoder.encode(char);
          txBytesRef.current += rawBytes.length;
          writeQueueRef.current.push(rawBytes);
          processWriteQueue();
          sentChars++;

          setPacingProgress({
            isActive: true,
            currentLine: lineIdx + 1,
            totalLines,
            currentChar: sentChars,
            totalChars,
          });

          await new Promise((r) => setTimeout(r, charDelay));
        }
      } else {
        // 按整行延时发送
        const rawBytes = encoder.encode(lineWithEnd);
        txBytesRef.current += rawBytes.length;
        writeQueueRef.current.push(rawBytes);
        processWriteQueue();
        sentChars += lineWithEnd.length;

        setPacingProgress({
          isActive: true,
          currentLine: lineIdx + 1,
          totalLines,
          currentChar: sentChars,
          totalChars,
        });
      }

      if (lineDelay > 0 && !isLastLine) {
        await new Promise((r) => setTimeout(r, lineDelay));
      }
    }

    setPacingProgress(null);
  };

  const checkAndPaste = (text: string) => {
    if (!text) return;
    const now = performance.now();
    // 200ms 内相同内容的重复粘贴请求（如同时触发 keydown 与 paste 事件）直接去重
    if (lastPasteTimeRef.current.text === text && (now - lastPasteTimeRef.current.time) < 200) {
      return;
    }
    lastPasteTimeRef.current = { text, time: now };

    const isMultiLine = /[\r\n]/.test(text.trim());
    let isDangerous = false;
    if (enableDangerousGuard && dangerousRules && dangerousRules.length > 0) {
      for (const r of dangerousRules) {
        if (r.enabled && r.pattern) {
          try {
            if (new RegExp(r.pattern, 'im').test(text)) {
              isDangerous = true;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if ((enableSafePaste && isMultiLine) || isDangerous) {
      setPendingPasteText(text);
      setSafePasteOpen(true);
    } else {
      executePaste(text);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      if (onTrafficUpdate) {
        onTrafficUpdate(sessionId, rxBytesRef.current, txBytesRef.current);
      }
      rxBytesRef.current = 0;
      txBytesRef.current = 0;
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId, isActive, onTrafficUpdate]);
  
  useEffect(() => {
    if (!showLiveHex) return;
    const t = setInterval(() => setHexTick(n => n + 1), 300);
    return () => clearInterval(t);
  }, [showLiveHex]);
  const [timerConfig, setTimerConfig] = useState<{ active: boolean; cmd: string; interval: number }>({ active: false, cmd: '', interval: 5 });
  const [searchText, setSearchText] = useState('');
  const [searchResultCount, setSearchResultCount] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 搜索迷你地图 (Search Minimap) 状态
  const [searchMatchLines, setSearchMatchLines] = useState<number[]>([]);
  const [searchViewportY, setSearchViewportY] = useState(0);
  const [searchTotalLines, setSearchTotalLines] = useState(0);
  const [searchViewportRows, setSearchViewportRows] = useState(24);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // 扫描终端缓冲区中的搜索匹配项，为 Minimap 提供精确定位
  useEffect(() => {
    if (!isSearchOpen || !searchText.trim() || !termRef.current) {
      setSearchMatchLines([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const term = termRef.current;
    const buffer = term.buffer.active;
    const total = buffer.length;
    setSearchTotalLines(total);
    setSearchViewportY(buffer.viewportY);
    setSearchViewportRows(term.rows);

    let reg: RegExp | null = null;
    try {
      if (searchIsRegex) {
        reg = new RegExp(searchText, searchCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = searchWholeWord ? `\\b${escaped}\\b` : escaped;
        reg = new RegExp(pattern, searchCaseSensitive ? 'g' : 'gi');
      }
    } catch {
      setSearchMatchLines([]);
      return;
    }

    const lines: number[] = [];
    const maxScan = Math.min(total, 5000);
    const start = Math.max(0, total - maxScan);
    for (let i = start; i < total; i++) {
      const line = buffer.getLine(i);
      if (!line) continue;
      const str = line.translateToString(true);
      if (str && reg.test(str)) {
        lines.push(i);
        reg.lastIndex = 0;
      }
    }

    setSearchMatchLines(lines);
    if (lines.length > 0) {
      setSearchResultCount(t('terminal.matchesCount').replace('{count}', String(lines.length)));
    } else {
      setSearchResultCount(t('termSearch.noResult'));
    }
  }, [isSearchOpen, searchText, searchIsRegex, searchCaseSensitive, searchWholeWord, t]);

  // 辅助函数：将 Base64 转为 Uint8Array（复用全局快速单例）
  const base64ToBytes = fastBase64ToBytes;


  // 封装 SSH 连接的核心方法
  const connectSSHInstance = (isRetry = false) => {
    if (!termRef.current) return;
    const term = termRef.current;

    if (isRetry) {
      setReconnecting(true);
      onStatusChange?.(sessionId, 'reconnecting');
      term.write(`\r\n\x1b[33m${t('terminal.reconnecting').replace('{retry}', String(retryCount + 1))} \x1b[0m\r\n`);
    } else {
      setConnecting(true);
      onStatusChange?.(sessionId, 'connecting');
    }
    setErrorMsg(null);

    const cols = term.cols > 0 ? term.cols : 80;
    const rows = term.rows > 0 ? term.rows : 24;

    const proto = protocol || (isLocal ? 'local' : 'ssh');
    let connectPromise: Promise<void>;

    if (proto === 'serial') {
      const sCfg = serialConfig || {
        port: host || '/dev/ttyUSB0',
        baudRate: port || 115200,
        dataBits: 8,
        stopBits: '1',
        parity: 'none',
        flowControl: 'none',
        dtr: true,
        rts: true
      };
      connectPromise = ConnectSerial(sessionId, name, sCfg as any, overrideTheme || '', overrideFontSize || 0, logConfig, encoding);
    } else if (proto === 'telnet') {
      connectPromise = ConnectTelnet(sessionId, name, host, port || 23, termType || 'xterm-256color', cols, rows, overrideTheme || '', overrideFontSize || 0, logConfig, encoding);
    } else if (proto === 'rlogin') {
      const fn = (window as any).go?.app?.App?.ConnectRlogin;
      if (typeof fn === 'function') {
        connectPromise = fn(sessionId, name, host, port || 513, user || 'root', user || 'root', termType || 'xterm-256color', cols, rows, overrideTheme || '', overrideFontSize || 0, logConfig, encoding);
      } else {
        connectPromise = Promise.reject(new Error("ConnectRlogin is not available in App runtime"));
      }
    } else if (proto === 'mosh') {
      const fn = (window as any).go?.app?.App?.ConnectMosh;
      if (typeof fn === 'function') {
        connectPromise = fn(sessionId, name, host, port || 22, user, password, privateKey, moshServerPath, moshPortRange, cols, rows, overrideTheme || '', overrideFontSize || 0, logConfig, encoding);
      } else {
        connectPromise = Promise.reject(new Error("ConnectMosh is not available in App runtime"));
      }
    } else if (proto === 'raw_tcp') {
      connectPromise = ConnectRawTCP(sessionId, name, host, port || 8080, lineEnding || 'CRLF', overrideTheme || '', overrideFontSize || 0, logConfig, encoding);
    } else if (proto === 'local') {
      connectPromise = ConnectLocalShell(sessionId, name, shellPath || '', wslDistro || '', cols, rows, overrideTheme || '', overrideFontSize || 0, logConfig, encoding);
    } else if (proto === 'docker' || proto === 'k8s') {
      const fn = (window as any).go?.app?.App?.ConnectContainerShell;
      if (typeof fn === 'function') {
        connectPromise = fn(
          sessionId,
          name,
          proto,
          dockerHostSessionId || '',
          dockerContainerId || '',
          k8sPod || '',
          k8sNamespace || 'default',
          k8sContainer || '',
          dockerShell || '/bin/sh',
          cols,
          rows,
          overrideTheme || '',
          overrideFontSize || 0,
          logConfig,
          encoding
        );
      } else {
        connectPromise = Promise.reject(new Error("ConnectContainerShell is not available in App runtime"));
      }
    } else {
      connectPromise = ConnectSSH(
        sessionId, 
        name, 
        host, 
        port, 
        user, 
        password, 
        privateKey, 
        cols, 
        rows, 
        loginScripts, 
        overrideTheme, 
        overrideFontSize, 
        logConfig,
        tunnels,
        encoding,
        jumpHostSessionId,
        termType,
        isLocal,
        proxyType,
        proxyHost,
        proxyPort,
        proxyUser,
        proxyPassword,
        ciphers,
        macs,
        sessionMode,
        enableAgentForwarding,
        enableX11Forwarding,
        x11Display,
        triggers,
        identityKeyId || ''
      );
    }

    connectPromise
      .then(() => {
        setConnecting(false);
        setReconnecting(false);
        setRetryCount(0);
        setCountdown(null);
        onStatusChange?.(sessionId, 'connected');
        if (proto === 'serial') {
          term.write(`\r\n\x1b[32m*** Serial Connected: ${serialConfig?.port || host} ***\x1b[0m\r\n\r\n`);
        } else if (proto === 'telnet') {
          term.write(`\r\n\x1b[32m*** Telnet Connected: ${host}:${port || 23} ***\x1b[0m\r\n\r\n`);
        } else if (proto === 'rlogin') {
          term.write(`\r\n\x1b[32m*** Rlogin Connected: ${host}:${port || 513} ***\x1b[0m\r\n\r\n`);
        } else if (proto === 'mosh') {
          term.write(`\r\n\x1b[32m*** Mosh Connected (UDP Roaming Active: ${host}) ***\x1b[0m\r\n\r\n`);
        } else if (proto === 'raw_tcp') {
          term.write(`\r\n\x1b[32m*** Raw TCP Connected: ${host}:${port || 8080} ***\x1b[0m\r\n\r\n`);
        } else if (proto === 'local') {
          term.write('\r\n\x1b[32m*** Local Shell / WSL Ready ***\x1b[0m\r\n\r\n');
        } else {
          term.write('\r\n\x1b[32m*** Connection Established ***\x1b[0m\r\n\r\n');
        }

        const currentCols = term.cols > 0 ? term.cols : 80;
        const currentRows = term.rows > 0 ? term.rows : 24;
        ResizeSSH(sessionId, currentCols, currentRows).catch(() => {});
        term.focus();
        
        if (onTerminalReady) {
          onTerminalReady(currentCols, currentRows, sessionId);
        }
      })
      .catch((err: any) => {
        setConnecting(false);
        setReconnecting(false);
        const errMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
        setErrorMsg(errMsg);
        term.write(`\r\n\x1b[31m${t('terminal.connFailed')}${errMsg}\x1b[0m\r\n`);
        onStatusChange?.(sessionId, 'disconnected');

        // 如果是自动重连期间报错，则触发下一个重试周期
        if (isRetry) {
          triggerAutoReconnect();
        }
      });
  };

  // 自动重连的触发逻辑（采用 1s → 2s → 4s → 8s → 16s 指数退避算法）
  const triggerAutoReconnect = () => {
    if (retryCount < 5) {
      const backoffSec = Math.min(16, Math.max(1, Math.pow(2, retryCount)));
      setCountdown(backoffSec);
      if (termRef.current) {
        termRef.current.write(`\r\n\x1b[33m${t('terminal.reconnectBackoff').replace('{retry}', String(retryCount + 1)).replace('{sec}', String(backoffSec))}\x1b[0m\r\n`);
      }
    } else {
      if (termRef.current) {
        termRef.current.write(`\r\n\x1b[31m${t('terminal.reconnectMaxReached')}\x1b[0m\r\n`);
      }
      setCountdown(null);
      setReconnecting(false);
      onStatusChange?.(sessionId, 'disconnected');
    }
  };

  // 倒计时 Timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setRetryCount(prev => prev + 1);
      connectSSHInstance(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!containerRef.current) return;

    const activeThemeName = overrideTheme || themeName;
    const activeFontSize = overrideFontSize && overrideFontSize > 0 ? overrideFontSize : fontSize;

    const finalOpacity = (overrideTerminalOpacity && overrideTerminalOpacity > 0) ? overrideTerminalOpacity : (terminalOpacity ?? 1.0);
    const isTransparentBg = finalOpacity < 1.0 || Boolean(backgroundImage || globalBackgroundImage);
    const baseTheme = (customThemes || []).find((t: any) => t.name === activeThemeName) || THEMES[activeThemeName] || THEMES["VS Code Dark Modern"] || THEMES["Classic Dark"];
    const currentTheme = {
      ...baseTheme,
      background: isTransparentBg ? '#00000000' : baseTheme.background,
      cursor: cursorColor || baseTheme.cursor || '#00ff00',
      cursorAccent: cursorAccentColor || baseTheme.cursorAccent || '#000000',
      selectionBackground: selectionBackground || baseTheme.selectionBackground || 'rgba(59, 130, 246, 0.35)',
      selectionForeground: selectionForeground || baseTheme.selectionForeground || undefined,
    };

    // 解析最终控制项属性
    const MAX_SCROLLBACK = 100000;
    let finalScrollback = (overrideScrollback && overrideScrollback > 0) ? overrideScrollback : scrollbackLines;
    if (finalScrollback > MAX_SCROLLBACK) finalScrollback = MAX_SCROLLBACK;
    const finalCursorStyle = (overrideCursorStyle && overrideCursorStyle !== '') ? overrideCursorStyle as 'block' | 'underline' | 'bar' : cursorStyle;
    
    let finalCursorBlink = cursorBlink;
    if (overrideCursorBlink === 1) finalCursorBlink = true;
    else if (overrideCursorBlink === 2) finalCursorBlink = false;

    let finalCopyOnSelect = copyOnSelect;
    if (overrideCopyOnSelect === 1) finalCopyOnSelect = true;
    else if (overrideCopyOnSelect === 2) finalCopyOnSelect = false;

    let finalEnableBell = enableBell;
    if (overrideEnableBell === 1) finalEnableBell = true;
    else if (overrideEnableBell === 2) finalEnableBell = false;

    const activeLineHeight = (overrideLineHeight && overrideLineHeight > 0) ? overrideLineHeight : (lineHeight ?? 1.2);

    const term = new Terminal({
      cursorBlink: finalCursorBlink,
      cursorStyle: finalCursorStyle,
      fontSize: activeFontSize,
      lineHeight: activeLineHeight,
      fontFamily: nonAsciiFontFamily ? `${fontFamily}, ${nonAsciiFontFamily}` : fontFamily,
      fontWeight: (fontWeight || 'normal') as any,
      fontWeightBold: (fontWeightBold || 'bold') as any,
      letterSpacing: letterSpacing ?? 0,
      minimumContrastRatio: minimumContrastRatio ?? 1,
      customGlyphs: (customGlyphs !== false),
      drawBoldTextInBrightColors: (drawBoldTextInBrightColors !== false),
      theme: currentTheme,
      allowProposedApi: true,
      allowTransparency: true,
      scrollback: finalScrollback,
      wordSeparator: wordSeparators,
    });

    // 注册 LinkProvider 支持终端超链接检测与点击跳转
    if (typeof term.registerLinkProvider === 'function') {
      const urlRegex = /(?:https?:\/\/|ftp:\/\/|file:\/\/|git@|ssh:\/\/)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/i;
      term.registerLinkProvider({
        provideLinks: (bufferLineNumber: number, callback: (links: any[] | undefined) => void) => {
          const line = term.buffer?.active?.getLine(bufferLineNumber - 1);
          if (!line) {
            callback(undefined);
            return;
          }
          const lineText = line.translateToString(true);
          const matches: any[] = [];
          let match: RegExpExecArray | null;
          const globalRegex = new RegExp(urlRegex.source, 'gi');
          while ((match = globalRegex.exec(lineText)) !== null) {
            const url = match[0];
            const startX = match.index + 1;
            const endX = startX + url.length;
            matches.push({
              range: { start: { x: startX, y: bufferLineNumber }, end: { x: endX, y: bufferLineNumber } },
              text: url,
              activate: (event: MouseEvent, uri: string) => {
                if (openLinksOnClick || event.metaKey || event.ctrlKey) {
                  let finalUri = uri;
                  if (!/^https?:\/\//i.test(finalUri) && !/^file:\/\//i.test(finalUri) && !/^ssh:\/\//i.test(finalUri)) {
                    finalUri = 'http://' + finalUri;
                  }
                  BrowserOpenURL(finalUri);
                }
              },
            });
          }
          callback(matches.length > 0 ? matches : undefined);
        }
      });
    }

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;

    // 挂载 Sixel / iTerm2 内联图像渲染插件 (ImageAddon - Phase 8 25.4.1)
    if (enableTerminalImages !== false) {
      try {
        const imageAddon = new ImageAddon({
          enableSizeReports: true,
          pixelLimit: 16777216,
          storageLimit: imageStorageLimitMB || 128,
          showPlaceholder: true,
          sixelSupport: true,
          sixelScrolling: true,
          sixelPaletteLimit: 256,
          sixelSizeLimit: 25000000,
          iipSupport: true,
          iipSizeLimit: 20000000,
        });
        term.loadAddon(imageAddon);
        imageAddonRef.current = imageAddon;
      } catch (e) {
        console.warn('ImageAddon load error:', e);
      }
    }

    // 挂载终端超链接识别插件 (WebLinksAddon)
    try {
      const webLinksAddon = new WebLinksAddon((event, uri) => {
        BrowserOpenURL(uri);
      });
      term.loadAddon(webLinksAddon);
    } catch (e) {
      console.warn('WebLinksAddon load error:', e);
    }

    // 挂载代码连字插件 (LigaturesAddon)
    const finalEnableLigatures = overrideEnableLigatures === 1 ? true : (overrideEnableLigatures === 2 ? false : (enableLigatures ?? true));
    if (finalEnableLigatures) {
      try {
        const ligaturesAddon = new LigaturesAddon();
        term.loadAddon(ligaturesAddon);
      } catch (e) {
        console.warn('LigaturesAddon load error:', e);
      }
    }

    // 挂载 Unicode 11 CJK 宽字符对齐插件 (消除中日韩宽字符与 Emoji 渲染错位)
    try {
      const unicode11Addon = new Unicode11Addon();
      term.loadAddon(unicode11Addon);
      if (term.unicode && typeof term.unicode === 'object') {
        term.unicode.activeVersion = unicodeVersion || '11';
      }
    } catch (e) {
      console.warn('Unicode11Addon load error:', e);
    }

    // 挂载动态智能高亮插件 (HighlightAddon - 开箱即用日志与关键字自动着色)
    try {
      const highlightAddon = new HighlightAddon(
        highlightRules && highlightRules.length > 0 ? highlightRules : undefined,
        enableHighlightRules !== false
      );
      term.loadAddon(highlightAddon);
      highlightAddonRef.current = highlightAddon;
    } catch (e) {
      console.warn('HighlightAddon load error:', e);
    }

    // 捕获远端 Shell 发送的 OSC 7 目录变更序列 (OSC 7 Directory Tracking)
    try {
      if (term.parser && typeof term.parser.registerOscHandler === 'function') {
        term.parser.registerOscHandler(7, (data) => {
          let path = data;
          if (path.startsWith('file://')) {
            try {
              const url = new URL(path);
              path = decodeURIComponent(url.pathname);
            } catch (_) {
              const match = path.match(/file:\/\/[^\/]*(\/.*)/);
              if (match) path = match[1];
            }
          }
          if (path) {
            currentDirRef.current = path;
            if (onDirectoryChange) {
              onDirectoryChange(sessionId, path);
            }
          }
          return true;
        });

        // 24.1.1: 注册 OSC 52 远程剪贴板双向同步处理器
        term.parser.registerOscHandler(52, (data) => {
          const mode = osc52Mode || 'write';
          if (mode === 'disabled') return true;

          const semiIdx = data.indexOf(';');
          if (semiIdx === -1) return false;

          const pc = data.substring(0, semiIdx);
          const pd = data.substring(semiIdx + 1);

          // 读剪贴板请求
          if (pd === '?') {
            if (mode === 'readwrite') {
              ClipboardGetText().then((clipText) => {
                if (clipText) {
                  try {
                    const b64 = btoa(unescape(encodeURIComponent(clipText)));
                    WriteSSH(sessionId, `\x1b]52;${pc};${b64}\x07`);
                  } catch (_) {}
                }
              }).catch(() => {});
            }
            return true;
          }

          // 写剪贴板请求
          const maxBytes = osc52MaxBytes || 102400;
          if (pd.length > maxBytes * 1.5) {
            return true;
          }

          try {
            const decoded = decodeURIComponent(escape(atob(pd)));
            ClipboardSetText(decoded).then(() => {
              if (osc52ShowToast) {
                setOscToast(t('terminal.oscSynced').replace('{count}', String(decoded.length)));
                if (oscToastTimerRef.current) clearTimeout(oscToastTimerRef.current);
                oscToastTimerRef.current = setTimeout(() => setOscToast(null), 2500);
              }
            }).catch(() => {
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(decoded).then(() => {
                  if (osc52ShowToast) {
                    setOscToast(t('terminal.oscSynced').replace('{count}', String(decoded.length)));
                    if (oscToastTimerRef.current) clearTimeout(oscToastTimerRef.current);
                    oscToastTimerRef.current = setTimeout(() => setOscToast(null), 2500);
                  }
                });
              }
            });
          } catch (_) {}

          return true;
        });
      }
    } catch (e) {
      console.warn('Register OSC error:', e);
    }

    activeTerminals[sessionId] = term;
    searchAddons[sessionId] = searchAddon;

    terminalBuffers[sessionId] = () => {
      const lines: string[] = [];
      const buffer = term.buffer.active;
      if (buffer) {
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) lines.push(line.translateToString(true));
        }
      }
      return lines;
    };
    
    term.open(containerRef.current);

    if (finalOpacity < 1.0 && containerRef.current) {
      containerRef.current.style.backgroundColor = hexToRgba(baseTheme.background, finalOpacity);
      if (enableBlur) {
        containerRef.current.style.backdropFilter = 'blur(16px)';
        (containerRef.current.style as any).webkitBackdropFilter = 'blur(16px)';
      } else {
        containerRef.current.style.backdropFilter = 'none';
        (containerRef.current.style as any).webkitBackdropFilter = 'none';
      }
      
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        .xterm, 
        .xterm .xterm-viewport, 
        .xterm-viewport, 
        .xterm-screen, 
        .xterm-screen canvas, 
        .xterm-rows, 
        .xterm-rows > div {
          background-color: transparent !important;
        }
      `;
      containerRef.current.appendChild(styleEl);
    } else if (containerRef.current) {
      containerRef.current.style.backgroundColor = '';
      containerRef.current.style.backdropFilter = 'none';
      (containerRef.current.style as any).webkitBackdropFilter = 'none';
    }

    // 捕获 Xterm.js 声音响铃
    term.onBell(() => {
      if (finalEnableBell) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.15);
          }
        } catch (err) {
          console.warn("Bell play failed:", err);
        }
      }
    });

    // 鼠标选中即复制 (利用 ref 动态感知最新配置，并防抖避免拖拽高频写入)
    term.onSelectionChange(() => {
      if (copyOnSelectRef.current && term.hasSelection()) {
        const sel = term.getSelection();
        if (sel) {
          if (autoCopyTimerRef.current) clearTimeout(autoCopyTimerRef.current);
          autoCopyTimerRef.current = setTimeout(() => {
            const finalSel = term.getSelection();
            if (finalSel && copyOnSelectRef.current) {
              safeCopyText(finalSel);
            }
          }, 120);
        }
      }
    });

    // 释放鼠标选区时自动复制至系统剪贴板 (严格对齐设置项说明)
    const handleMouseUpCapture = () => {
      if (copyOnSelectRef.current && term.hasSelection()) {
        const sel = term.getSelection();
        if (sel) {
          if (autoCopyTimerRef.current) clearTimeout(autoCopyTimerRef.current);
          safeCopyText(sel);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUpCapture);

    // 优化：我们在单独的 useEffect 中根据 isActive 状态动态挂载/卸载 WebglAddon，
    // 防止开启大量后台 Tab 导致 WebGL context 耗尽 (通常限制在 16 个左右)

    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const currentProto = protocol || (isLocal ? 'local' : 'ssh');
    if (currentProto !== 'local') {
      zmodemRef.current = new ZmodemAddon({
        term: term,
        sendData: (data: Uint8Array) => {
          WriteSSH(sessionId, bytesToBase64(data)).catch(err => console.error("ZMODEM WriteSSH fail", err));
        },
        onNormalData: (data: Uint8Array) => {
          term.write(data);
        }
      });
    } else {
      zmodemRef.current = null;
    }

    if (currentProto === 'local') {
      term.write('\x1b[36mStarting Local Shell...\x1b[0m\r\n');
    } else {
      term.write('Connecting to ' + host + ':' + port + '...\r\n');
    }

    // macOS WKWebView fix:
    // xterm.js v6 registers BOTH keydown and input listeners in capture phase.
    // Printable chars may arrive via keydown interceptor AND onData (input event).
    // lastSentCharRef deduplicates same-keystroke duplicates (~10ms window);
    // captureInputHandler blocks the redundant input event before xterm runs.
    const captureInputHandler = (e: Event) => {
      const inputEvent = e as InputEvent;
      if (
        inputEvent.inputType === 'insertText' &&
        inputEvent.data &&
        inputEvent.data.length === 1 &&
        !inputEvent.isComposing
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    term.textarea?.addEventListener('input', captureInputHandler, true);

    // 捕获阶段拦截原生 paste 事件：阻止 xterm 重复处理，交由 checkAndPaste 统一处理
    const capturePasteHandler = (e: ClipboardEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        checkAndPaste(text);
      } else {
        ClipboardGetText().then(t => {
          if (t) checkAndPaste(t);
        }).catch(err => console.error("Capture paste fallback failed:", err));
      }
    };
    term.textarea?.addEventListener('paste', capturePasteHandler as EventListener, true);

    const sendTerminalInput = (data: string) => {
      if (data.length === 1) {
        const now = performance.now();
        const last = lastSentCharRef.current;
        // Same physical keypress may hit both keydown and onData within ~1ms
        if (last && last.data === data && now - last.time < 10) {
          return;
        }
        lastSentCharRef.current = { data, time: now };
      }

      // IntelliSense 智能补全与执行耗时追踪
      if (data === '\r' || data === '\n') {
        const trimmed = currentInputBufferRef.current.trim();
        if (trimmed) {
          commandStartTimeRef.current = performance.now();
          lastExecutedCmdRef.current = trimmed;
          commandHistoryRef.current = [trimmed, ...commandHistoryRef.current.filter(c => c !== trimmed)].slice(0, 50);

          // 跨会话命令历史持久化记录
          try {
            const appRpc = (window as any).go?.app?.App;
            if (appRpc?.RecordCommandHistory) {
              appRpc.RecordCommandHistory(sessionId, name, host, trimmed, 0);
            }
          } catch (e) {
            console.warn('Failed to record command history:', e);
          }

          // 24.2.1: 创建结构化命令块
          const newBlock: CommandBlock = {
            id: `cmd_${Date.now()}`,
            command: trimmed,
            output: '',
            exitCode: 0,
            startTime: Date.now(),
            isRunning: true,
          };
          setCommandBlocks(prev => [...prev.slice(-30), newBlock]);
        }
        currentInputBufferRef.current = '';
        setGhostSuggestion(null);
      } else if (data === '\x7f' || data === '\x08') {
        currentInputBufferRef.current = currentInputBufferRef.current.slice(0, -1);
        const suggestion = getContextAwareSuggestion(currentInputBufferRef.current, commandHistoryRef.current);
        setGhostSuggestion(suggestion);
      } else if (data.length === 1 && data >= ' ') {
        currentInputBufferRef.current += data;
        const suggestion = getContextAwareSuggestion(currentInputBufferRef.current, commandHistoryRef.current);
        setGhostSuggestion(suggestion);
      }

      const encoder = new TextEncoder();
      const rawBytes = encoder.encode(data);
      txBytesRef.current += rawBytes.length;

      if (recordingRef.current) {
        const base64Str = bytesToBase64(rawBytes);
        window.dispatchEvent(new CustomEvent('macro-record-char', { detail: base64Str }));
      }

      writeQueueRef.current.push(rawBytes);
      processWriteQueue();
      onUserInput?.(bytesToBase64(rawBytes), sessionId);
    };

    const handleInputDuringReconnect = () => {
      if (countdown !== null) {
        setCountdown(null);
        setRetryCount(prev => prev + 1);
        connectSSHInstance(true);
        return true;
      }
      return false;
    };

    // 绑定键盘输入 (handles non-character keys: Backspace, Enter, Arrow, Ctrl+C, etc.)
    // Character keys are intercepted in attachCustomKeyEventHandler below;
    // sendTerminalInput deduplicates against that path.
    term.onData((data) => {
      if (handleInputDuringReconnect()) return;
      sendTerminalInput(data);
    });

    term.attachCustomKeyEventHandler((event) => {
      if (event.type === 'keydown') {
        // 1. 下一个选项卡 (Next Tab)
        // 支持: Ctrl+Tab, Ctrl+PageDown, ⌘⇧], ⌃⇧], ⌥⌘→, ⌃⌥→, Alt+→
        const isNextTab = (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) ||
                          (event.ctrlKey && event.key === 'PageDown') ||
                          ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === ']' || event.key === '}')) ||
                          ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'ArrowRight') ||
                          (event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowRight');

        if (isNextTab) {
          event.preventDefault();
          tabShortcutsRef.current.onNextTab?.();
          return false;
        }

        // 2. 上一个选项卡 (Prev Tab)
        // 支持: Ctrl+Shift+Tab, Ctrl+PageUp, ⌘⇧[, ⌃⇧[, ⌥⌘←, ⌃⌥←, Alt+←
        const isPrevTab = (event.ctrlKey && event.shiftKey && event.key === 'Tab') ||
                          (event.ctrlKey && event.key === 'PageUp') ||
                          ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === '[' || event.key === '{')) ||
                          ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'ArrowLeft') ||
                          (event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowLeft');

        if (isPrevTab) {
          event.preventDefault();
          tabShortcutsRef.current.onPrevTab?.();
          return false;
        }

        // 3. 数字键直接切换选项卡 (⌘1~9 / Ctrl+1~9 / Alt+1~9)
        if ((event.metaKey || event.ctrlKey || (event.altKey && !event.metaKey && !event.ctrlKey)) && !event.shiftKey) {
          if (event.key >= '1' && event.key <= '9') {
            const idx = parseInt(event.key, 10) - 1;
            event.preventDefault();
            tabShortcutsRef.current.onSelectTabByIndex?.(idx);
            return false;
          }
        }

        // 4. 新建本地终端选项卡 (⌘T / Ctrl+T)
        if ((event.metaKey || event.ctrlKey) && (event.key === 't' || event.key === 'T') && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          tabShortcutsRef.current.onNewLocalTab?.();
          return false;
        }

        // 5. 关闭当前终端选项卡 (⌘W / Ctrl+Shift+W)
        if (((event.metaKey && (event.key === 'w' || event.key === 'W')) || 
             (event.ctrlKey && event.shiftKey && (event.key === 'w' || event.key === 'W'))) && !event.altKey) {
          event.preventDefault();
          tabShortcutsRef.current.onCloseCurrentTab?.();
          return false;
        }

        // 6. 新建会话属性弹窗 (⌘N / Ctrl+N)
        if ((event.metaKey || event.ctrlKey) && (event.key === 'n' || event.key === 'N') && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          tabShortcutsRef.current.onNewSession?.();
          return false;
        }

        // 7. OmniAI Copilot 行内即时助手 (⌘K / Ctrl+K)
        if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K') && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          setInlineAICopilotMode('command');
          setInlineAICopilotError('');
          setInlineAICopilotLastCmd(currentInputBufferRef.current || '');
          setIsInlineAICopilotOpen(prev => !prev);
          return false;
        }

        // 8. 终端字体缩放 (⌘= / ⌘+ / ⌘- / ⌘0 / Ctrl+= / Ctrl+- / Ctrl+0)
        if ((event.metaKey || event.ctrlKey) && (event.key === '=' || event.key === '+')) {
          event.preventDefault();
          tabShortcutsRef.current.onZoomIn?.();
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && (event.key === '-' || event.key === '_')) {
          event.preventDefault();
          tabShortcutsRef.current.onZoomOut?.();
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.key === '0') {
          event.preventDefault();
          tabShortcutsRef.current.onZoomReset?.();
          return false;
        }

        // 9. 全选终端屏幕内容 (⌘A / Ctrl+Shift+A)
        if ((event.metaKey && (event.key === 'a' || event.key === 'A')) ||
            (event.ctrlKey && event.shiftKey && (event.key === 'a' || event.key === 'A'))) {
          event.preventDefault();
          term.selectAll();
          return false;
        }

        // 10. 终端清屏与清空回滚缓冲区 (⌘L / Ctrl+Shift+L / ⌘Backspace)
        if ((event.metaKey && (event.key === 'l' || event.key === 'L') && !event.shiftKey && !event.altKey) ||
            (event.metaKey && event.key === 'Backspace')) {
          event.preventDefault();
          term.clear();
          return false;
        }

        // 11. 终端回滚缓冲区平滑滚动 (Shift+PageUp / Shift+PageDown / ⌘↑ / ⌘↓ / Shift+Home / Shift+End)
        if (event.shiftKey && event.key === 'PageUp') {
          event.preventDefault();
          term.scrollLines(-10);
          return false;
        }
        if (event.shiftKey && event.key === 'PageDown') {
          event.preventDefault();
          term.scrollLines(10);
          return false;
        }
        if ((event.metaKey && event.key === 'ArrowUp') || (event.shiftKey && event.key === 'Home')) {
          event.preventDefault();
          term.scrollToTop();
          return false;
        }
        if ((event.metaKey && event.key === 'ArrowDown') || (event.shiftKey && event.key === 'End')) {
          event.preventDefault();
          term.scrollToBottom();
          return false;
        }

        // 11.1: 终端书签标记打标 (Ctrl+Shift+M / ⌘⇧M)
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'm' || event.key === 'M')) {
          event.preventDefault();
          addBookmarkAtCurrentLine();
          return false;
        }

        // 11.2: 书签间快速穿梭 (Ctrl+Shift+↑ / ⌘⇧↑ 跳转上一书签, Ctrl+Shift+↓ / ⌘⇧↓ 跳转下一书签)
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'ArrowUp') {
          event.preventDefault();
          jumpToBookmark('prev');
          return false;
        }
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'ArrowDown') {
          event.preventDefault();
          jumpToBookmark('next');
          return false;
        }

        // 11.3: 展开/收起书签抽屉 (Ctrl+Shift+K / ⌘⇧K)
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'k' || event.key === 'K')) {
          event.preventDefault();
          setIsBookmarkDrawerOpen(prev => !prev);
          return false;
        }

        // 12. 偏好设置中心 (⌘, / Ctrl+, / Alt+O)
        if (((event.metaKey || event.ctrlKey) && event.key === ',') || 
            (event.altKey && (event.key === 'o' || event.key === 'O') && !event.metaKey && !event.ctrlKey)) {
          event.preventDefault();
          tabShortcutsRef.current.onOpenSettings?.();
          return false;
        }

        // 13. 侧边栏展开/收起 (⌘B / Ctrl+B)
        if ((event.metaKey || event.ctrlKey) && (event.key === 'b' || event.key === 'B') && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleSidebar?.();
          return false;
        }

        // 13b. 切换 Warp 命令块模式 (⌘⇧B / Ctrl+Shift+B)
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey && (event.key === 'b' || event.key === 'B')) {
          event.preventDefault();
          toggleCommandBlockMode();
          return false;
        }

        // 14. 多行指令撰写窗格 (⌘⇧P / Ctrl+Shift+P)
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'p' || event.key === 'P')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleCompose?.();
          return false;
        }

        // 15. SFTP 文件管理面板 (⌘⇧S / Ctrl+Shift+S)
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 's' || event.key === 'S')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleSftp?.();
          return false;
        }

        // 16. 全局缓冲区搜索 (⌘⌥F / Ctrl+Alt+F)
        if ((event.metaKey || event.ctrlKey) && event.altKey && (event.key === 'f' || event.key === 'F')) {
          event.preventDefault();
          tabShortcutsRef.current.onOpenGlobalSearch?.();
          return false;
        }

        // 17. 快捷键帮助中心 (⌘/ / ⌘? / Ctrl+/ / F1)
        if (((event.metaKey || event.ctrlKey) && (event.key === '/' || event.key === '?')) || event.key === 'F1') {
          event.preventDefault();
          tabShortcutsRef.current.onOpenShortcuts?.();
          return false;
        }

        // 18. 多终端输入广播 (Alt+B / ⌘⌥B)
        if ((event.altKey && (event.key === 'b' || event.key === 'B') && !event.metaKey && !event.ctrlKey) ||
            ((event.metaKey || event.ctrlKey) && event.altKey && (event.key === 'b' || event.key === 'B'))) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleBroadcast?.();
          return false;
        }

        // 19. 终端分屏 (⌘⇧D 左右分屏 / ⌘⇧E 上下分屏)
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'd' || event.key === 'D')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleSplitVertical?.();
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'e' || event.key === 'E')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleSplitHorizontal?.();
          return false;
        }

        // 20. 端口转发 (⌘⇧U) / 主机监控 (⌘⇧M) / 远程运维 (⌘⇧O) / 实时日志 (⌘⇧L)
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'u' || event.key === 'U')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleTunnelMonitor?.();
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'm' || event.key === 'M')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleHostMonitor?.();
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'o' || event.key === 'O')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleRemoteOps?.();
          return false;
        }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'l' || event.key === 'L')) {
          event.preventDefault();
          tabShortcutsRef.current.onToggleRealtimeLog?.();
          return false;
        }
      }

      // IntelliSense Ghost Text 快速采纳 (Tab / ArrowRight)
      if (ghostSuggestion && event.type === 'keydown' && (event.key === 'Tab' || (event.key === 'ArrowRight' && currentInputBufferRef.current.length > 0))) {
        event.preventDefault();
        sendTerminalInput(ghostSuggestion);
        return false;
      }

      // Intercept printable character keys at keydown level to bypass macOS WKWebView
      // IME composition guard which buffers/drops rapidly typed chars when xterm reads
      // from the textarea input event. We send chars ourselves and block the input event
      // in capture phase (captureInputHandler above) to prevent double-sending.
      const isCharacterKey = event.key.length === 1 &&
                             !event.ctrlKey &&
                             !event.metaKey &&
                             !event.altKey &&
                             !event.isComposing &&
                             event.key !== 'Process';

      if (isCharacterKey && event.type === 'keydown') {
        if (handleInputDuringReconnect()) return false;
        sendTerminalInput(event.key);
        return false; // Prevent xterm's own keydown processing
      }

      const isCopy = (event.metaKey && (event.key === 'c' || event.key === 'C')) || 
                     (event.ctrlKey && event.shiftKey && (event.key === 'c' || event.key === 'C')) ||
                     (event.ctrlKey && (event.key === 'c' || event.key === 'C') && term.hasSelection());
      const isPaste = (event.metaKey && (event.key === 'v' || event.key === 'V')) || 
                      (event.ctrlKey && event.shiftKey && (event.key === 'v' || event.key === 'V')) ||
                      (event.ctrlKey && (event.key === 'v' || event.key === 'V')) ||
                      (event.shiftKey && event.key === 'Insert');
      const isLiveFilter = ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'f' || event.key === 'F'));
      if (isLiveFilter && event.type === 'keydown') {
        setIsFilterOpen(prev => !prev);
        return false;
      }

      const isFind = (event.metaKey && (event.key === 'f' || event.key === 'F')) || 
                     (event.ctrlKey && (event.key === 'f' || event.key === 'F'));

      if (isFind && event.type === 'keydown') {
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return false;
      }

      if (isCopy && event.type === 'keydown') {
        if (term.hasSelection()) {
          safeCopyText(term.getSelection());
          return false;
        }
      }

      // Alt as Meta Key: Send ESC prefix
      if (useAltAsMeta && event.altKey && !event.ctrlKey && !event.metaKey && event.type === 'keydown') {
        if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
          const char = event.key === 'Backspace' ? '\x7f' : event.key;
          sendTerminalInput('\x1b' + char);
          return false;
        }
      }

      if (isPaste && event.type === 'keydown') {
        event.preventDefault();
        safeGetClipboardText()
          .then((text) => {
            if (text) {
              checkAndPaste(text);
            }
          })
          .catch(err => console.error("Paste failed:", err));
        return false;
      }

      return true;
    });

    // 订阅后端事件
    let unlistenData: (() => void) | null = null;
    unlistenData = EventsOn(`ssh-data:${sessionId}`, (b64Data: string) => {
      const rawBytes = base64ToBytes(b64Data);
      rxBytesRef.current += rawBytes.length;

      // 终端数据显示层直接投递（最高优先级渲染，零阻塞）
      const activeProto = protocol || (isLocal ? 'local' : 'ssh');
      if (activeProto !== 'local' && zmodemRef.current) {
        zmodemRef.current.consume(rawBytes);
      } else {
        term.write(rawBytes);
      }

      // 命令执行耗时计算
      if (commandStartTimeRef.current > 0 && lastExecutedCmdRef.current) {
        const elapsed = performance.now() - commandStartTimeRef.current;
        if (elapsed > 40) {
          const durationStr = elapsed < 1000 ? `${Math.round(elapsed)}ms` : `${(elapsed / 1000).toFixed(2)}s`;
          const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
          setCommandDurationInfo({
            cmd: lastExecutedCmdRef.current,
            duration: durationStr,
            timestamp: timeStr,
          });
        }
        commandStartTimeRef.current = 0;
      }

      // 单例共享 TextDecoder，按需延迟惰性解码，杜绝热路径重复解码与垃圾回收
      let _strChunk: string | null = null;
      const getStrChunk = () => {
        if (_strChunk === null) _strChunk = sharedUtf8Decoder.decode(rawBytes);
        return _strChunk;
      };

      let _cleanChunk: string | null = null;
      const getCleanChunk = () => {
        if (_cleanChunk === null) _cleanChunk = getStrChunk().replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
        return _cleanChunk;
      };

      // 24.2.1: 命令块输出追加与完成状态更新（仅在命令块模式下解析）
      if (activeCommandBlockMode) {
        try {
          const cleanChunk = getCleanChunk();
          setCommandBlocks(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.isRunning) {
              const isEnded = cleanChunk.includes('$ ') || cleanChunk.includes('# ') || cleanChunk.includes('> ');
              const hasErr = cleanChunk.includes('command not found') || cleanChunk.includes('error:') || cleanChunk.includes('Error:');
              return prev.map((b, i) => i === prev.length - 1 ? {
                ...b,
                output: (b.output + cleanChunk).slice(-8000),
                isRunning: !isEnded,
                exitCode: hasErr ? 1 : b.exitCode,
              } : b);
            }
            return prev;
          });
        } catch (_) {}
      }

      // 24.1.7: 智能结构化语法特征嗅探 (JSON / 表格)
      if (enableStructuredOutput) {
        try {
          const strChunk = getStrChunk();
          recentOutputBufferRef.current = (recentOutputBufferRef.current + strChunk).slice(-8000);
          const buf = recentOutputBufferRef.current;
          const isJSON = (buf.includes('{') && buf.includes('}')) || (buf.includes('[') && buf.includes(']'));
          const isTable = /\n[A-Za-z0-9_-]{2,}(\s{2,}[A-Za-z0-9_-]{2,}){2,}\n/.test(buf);
          if (isJSON || isTable) {
            setHasStructuredOutput(true);
          }
        } catch (_) {}
      }
      
      // Update Hex Buffer（仅在 Hex 面板打开时执行转换）
      if (showLiveHex) {
        if (hexLinesRef.current.length > 500) {
          hexLinesRef.current = hexLinesRef.current.slice(-300);
        }
        const str = sharedLatin1Decoder.decode(rawBytes);
        for (let i = 0; i < str.length; i += 16) {
          const chunk = str.slice(i, i + 16);
          let hex = '';
          let ascii = '';
          for (let j = 0; j < chunk.length; j++) {
            const code = chunk.charCodeAt(j);
            hex += code.toString(16).padStart(2, '0').toUpperCase() + ' ';
            ascii += (code >= 32 && code <= 126) ? chunk[j] : '.';
          }
          hexLinesRef.current.push(hex.padEnd(48, ' ') + '  |' + ascii + '|');
        }
      }

      // 实时日志过滤器抓取 (Live Buffer Filter)
      if (filterConfigRef.current.isOpen && !filterConfigRef.current.isPaused && filterConfigRef.current.pattern) {
        try {
          const decodedText = getStrChunk();
          const lines = decodedText.split(/\r?\n/);
          const p = filterConfigRef.current.pattern;
          const isReg = filterConfigRef.current.isRegex;
          let matcher: RegExp | null = null;
          try {
            matcher = isReg ? new RegExp(p, 'i') : new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          } catch (e) {}

          if (matcher) {
            const matchesToAdd: Array<{ id: string; time: string; lineNum: number; text: string }> = [];
            for (const line of lines) {
              const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
              if (cleanLine && matcher.test(cleanLine)) {
                lineCounterRef.current++;
                const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
                matchesToAdd.push({
                  id: `${Date.now()}_${Math.random()}`,
                  time: timeStr,
                  lineNum: lineCounterRef.current,
                  text: cleanLine,
                });
              }
            }
            if (matchesToAdd.length > 0) {
              setFilterMatches(prev => [...prev.slice(-400), ...matchesToAdd]);
            }
          }
        } catch (e) {}
      }

      // Asciinema Cast 录制事件抓取
      if (recordingRef.current && castStartTimeRef.current > 0) {
        const offsetSec = (performance.now() - castStartTimeRef.current) / 1000;
        const textChunk = getStrChunk();
        castEventsRef.current.push([Number(offsetSec.toFixed(4)), 'o', textChunk]);
      }

      // AI 智能报错检测 (AI Error Sniffer)
      try {
        const cleanChunk = getCleanChunk();
        if (cleanChunk.length > 5 && /\b(?:Permission denied|No space left on device|Command not found|Connection refused|fatal error|Address already in use|No such file or directory|SyntaxError)\b/i.test(cleanChunk)) {
          setDetectedError({
            errorText: cleanChunk.trim().slice(0, 400),
            lastCmd: currentInputBufferRef.current || '',
          });
        }
      } catch (_) {}
    });

    const scrollDisp = term.onScroll ? term.onScroll(() => {
      setSearchViewportY(term.buffer.active.viewportY);
      setSearchTotalLines(term.buffer.active.length);
      if (syncScroll && onScrollSync) {
        const buffer = term.buffer.active;
        const maxScroll = Math.max(1, buffer.baseY);
        const ratio = buffer.viewportY / maxScroll;
        onScrollSync(ratio, sessionId);
      }
    }) : null;

    const handleClosed = (data: any) => {
      if (data && data.id === sessionId) {
        const isLoc = isLocal || protocol === 'local';
        const msg = isLoc 
          ? `\r\n\x1b[33m${t('terminal.localProcessExited')} ${data.error || ''}\x1b[0m\r\n`
          : `\r\n\x1b[33mConnection closed by remote host. ${data.error || ''}\x1b[0m\r\n`;
        term.write(msg);
        onStatusChange?.(sessionId, 'disconnected');
        
        if (Notification.permission === "granted") {
          new Notification(t('terminal.sessionDisconnected'), { body: t('terminal.sessionDisconnectedBody').replace('{name}', name || '') });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => p === "granted" && new Notification(t('terminal.sessionDisconnected'), { body: t('terminal.sessionDisconnectedBody').replace('{name}', name || '') }));
        }
      }
    };
    const unlistenClosed = EventsOn('ssh-closed', handleClosed);

    const handleDisconnected = (data: any) => {
      if (data && data.id === sessionId) {
        term.write(`\r\n\x1b[31m⚠ ${data.error || 'Keep-Alive timeout'}\x1b[0m\r\n`);
        onStatusChange?.(sessionId, 'disconnected');
        
        if (Notification.permission === "granted") {
          new Notification(t('terminal.networkDropped'), { body: t('terminal.networkDroppedBody').replace('{name}', name || '') });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(p => p === "granted" && new Notification(t('terminal.networkDropped'), { body: t('terminal.networkDroppedBody').replace('{name}', name || '') }));
        }
        
        triggerAutoReconnect();
      }
    };
    const unlistenDisconnected = EventsOn('ssh-disconnected', handleDisconnected);

    connectSSHInstance(false);

    const resizeObserver = new ResizeObserver(() => {
      if (termRef.current && fitAddonRef.current) {
        fitAddonRef.current.fit();
        const currentCols = termRef.current.cols;
        const currentRows = termRef.current.rows;
        ResizeSSH(sessionId, currentCols, currentRows).catch((e) => {
          console.warn('Resize SSH fail:', e);
        });
        if (onTerminalReady) {
          onTerminalReady(currentCols, currentRows, sessionId);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    const containerDom = containerRef.current;
    const handleNativeContextMenu = (e: MouseEvent) => {
      handleContextMenu(e);
    };
    containerDom?.addEventListener('contextmenu', handleNativeContextMenu);

    return () => {
      containerDom?.removeEventListener('contextmenu', handleNativeContextMenu);
      term.textarea?.removeEventListener('input', captureInputHandler, true);

      delete terminalBuffers[sessionId];
      delete activeTerminals[sessionId];
      delete searchAddons[sessionId];
      window.removeEventListener('mouseup', handleMouseUpCapture);
      if (autoCopyTimerRef.current) clearTimeout(autoCopyTimerRef.current);
      term.textarea?.removeEventListener('input', captureInputHandler, true);
      term.textarea?.removeEventListener('paste', capturePasteHandler as EventListener, true);
      resizeObserver.disconnect();
      if (unlistenData) unlistenData();
      unlistenClosed();
      unlistenDisconnected();
      DisconnectSSH(sessionId).catch(() => {});
      if (imageAddonRef.current) {
        try {
          imageAddonRef.current.dispose();
        } catch (_) {}
        imageAddonRef.current = null;
      }
      if (highlightAddonRef.current) {
        try {
          highlightAddonRef.current.dispose();
        } catch (_) {}
        highlightAddonRef.current = null;
      }
      disposeCanvas();
      disposeWebgl();
      term.dispose();
      termRef.current = null;
      zmodemRef.current = null;
    };
  }, [sessionId]);

  // 当全局配置或会话配置热变化时刷新终端
  useEffect(() => {
    if (termRef.current) {
      const activeThemeName = overrideTheme || themeName;
      const activeFontSize = overrideFontSize && overrideFontSize > 0 ? overrideFontSize : fontSize;
      const finalOpacity = (overrideTerminalOpacity && overrideTerminalOpacity > 0) ? overrideTerminalOpacity : (terminalOpacity ?? 1.0);
      const isTransparentBg = finalOpacity < 1.0 || Boolean(backgroundImage || globalBackgroundImage);
      const baseTheme = (customThemes || []).find((t: any) => t.name === activeThemeName) || THEMES[activeThemeName] || THEMES["VS Code Dark Modern"] || THEMES["Classic Dark"];
      const currentTheme = {
        ...baseTheme,
        background: isTransparentBg ? '#00000000' : baseTheme.background,
        cursor: cursorColor || baseTheme.cursor || '#00ff00',
        cursorAccent: cursorAccentColor || baseTheme.cursorAccent || '#000000',
        selectionBackground: selectionBackground || baseTheme.selectionBackground || 'rgba(59, 130, 246, 0.35)',
        selectionForeground: selectionForeground || baseTheme.selectionForeground || undefined,
      };
      
      const activeLineHeight = (overrideLineHeight && overrideLineHeight > 0) ? overrideLineHeight : (lineHeight ?? 1.2);
      
      termRef.current.options.theme = currentTheme;
      termRef.current.options.fontFamily = nonAsciiFontFamily ? `${fontFamily}, ${nonAsciiFontFamily}` : fontFamily;
      termRef.current.options.fontSize = activeFontSize;
      termRef.current.options.lineHeight = activeLineHeight;
      termRef.current.options.fontWeight = (fontWeight || 'normal') as any;
      termRef.current.options.fontWeightBold = (fontWeightBold || 'bold') as any;
      termRef.current.options.letterSpacing = letterSpacing ?? 0;
      termRef.current.options.minimumContrastRatio = minimumContrastRatio ?? 1;
      termRef.current.options.customGlyphs = (customGlyphs !== false);
      termRef.current.options.drawBoldTextInBrightColors = (drawBoldTextInBrightColors !== false);
      if (termRef.current.unicode && typeof termRef.current.unicode === 'object') {
        termRef.current.unicode.activeVersion = unicodeVersion || '11';
      }

      if (containerRef.current) {
        // Phase 3 (P2): 文字抗锯齿与字体平滑
        (containerRef.current.style as any).webkitFontSmoothing = fontSmoothing || 'antialiased';
        (containerRef.current.style as any).fontSmooth = fontSmoothing || 'antialiased';
        if (fontSmoothing === 'none') {
          (containerRef.current.style as any).mozOsxFontSmoothing = 'auto';
        } else if (fontSmoothing === 'subpixel-antialiased') {
          (containerRef.current.style as any).mozOsxFontSmoothing = 'auto';
        } else {
          (containerRef.current.style as any).mozOsxFontSmoothing = 'grayscale';
        }

        if (finalOpacity < 1.0) {
          containerRef.current.style.backgroundColor = hexToRgba(baseTheme.background, finalOpacity);
          if (enableBlur) {
            containerRef.current.style.backdropFilter = 'blur(16px)';
            (containerRef.current.style as any).webkitBackdropFilter = 'blur(16px)';
          } else {
            containerRef.current.style.backdropFilter = 'none';
            (containerRef.current.style as any).webkitBackdropFilter = 'none';
          }
        } else {
          containerRef.current.style.backgroundColor = '';
          containerRef.current.style.backdropFilter = 'none';
          (containerRef.current.style as any).webkitBackdropFilter = 'none';
        }
      }

      // WebGL 互斥控制：rendererType 设定为 canvas/dom 或在 auto 模式下有半透明/背景图时禁用 WebGL
      const shouldDisableWebgl = rendererType === 'canvas' || rendererType === 'dom' || (rendererType === 'auto' && isTransparentBg);
      const shouldEnableWebgl = (rendererType === 'webgl') || (rendererType === 'auto' && !isTransparentBg);

      if (shouldDisableWebgl) {
        disposeWebgl();
        if (rendererType !== 'dom' && isActive && !canvasAddonRef.current) {
          loadCanvasFallback();
        }
      } else if (shouldEnableWebgl && isActive && !webglAddonRef.current) {
        disposeCanvas();
        try {
          const addon = new WebglAddon();
          addon.onContextLoss(() => {
            addon.dispose();
            webglAddonRef.current = null;
            loadCanvasFallback();
          });
          termRef.current.loadAddon(addon);
          webglAddonRef.current = addon;
        } catch (e) {
          console.warn('WebGL addon could not be loaded, smoothly degrading to Canvas', e);
          loadCanvasFallback();
        }
      }

      // 深度刷新终端视口并清空 WebGL 纹理字符图元贴图，确保字体、字重与字号即时全屏生效
      const refreshTerminalViewport = () => {
        if (!termRef.current) return;
        try {
          const core = (termRef.current as any)._core;

          // 1. 重新测量字符尺寸（确保新字体/异步字体加载后度量数据精准）
          if (core?._charSizeService && typeof core._charSizeService.measure === 'function') {
            try {
              core._charSizeService.measure();
            } catch (e) {}
          }

          // 2. 清空 WebGL 图元纹理缓存，请求重绘视口（解决改字体后需选中文本才生效的核心缺陷）
          if (typeof (termRef.current as any).clearTextureAtlas === 'function') {
            try {
              (termRef.current as any).clearTextureAtlas();
            } catch (e) {}
          }
          if (webglAddonRef.current && typeof (webglAddonRef.current as any).clearTextureAtlas === 'function') {
            try {
              (webglAddonRef.current as any).clearTextureAtlas();
            } catch (e) {}
          }

          // 3. 清除渲染服务缓存并重设尺寸
          if (core?._renderService) {
            try {
              if (typeof core._renderService.clear === 'function') {
                core._renderService.clear();
              }
              if (typeof core._renderService.handleResize === 'function') {
                core._renderService.handleResize(termRef.current.cols || 80, termRef.current.rows || 24);
              }
            } catch (e) {}
          }

          // 4. 强制重绘整个视口所有行
          if (typeof (termRef.current as any).refresh === 'function') {
            const rows = termRef.current.rows || 24;
            termRef.current.refresh(0, Math.max(0, rows - 1));
          }

          // 5. 自适应终端网格尺寸
          fitAddonRef.current?.fit();
        } catch (e) {
          console.warn('刷新终端字体视口失败:', e);
        }
      };

      // 立即触发一次全屏重绘
      refreshTerminalViewport();

      // 在字体文件完全加载完毕时二次刷新（针对系统新字体首次渲染）
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          refreshTerminalViewport();
        }).catch(() => {});
      }

      // 动态同步图像插件缓存上限
      if (imageAddonRef.current && imageStorageLimitMB && imageStorageLimitMB > 0) {
        try {
          imageAddonRef.current.storageLimit = imageStorageLimitMB;
        } catch (_) {}
      }

      // 宏任务延迟触发，确保浏览器渲染帧及字符度量完成对齐
      const t1 = setTimeout(refreshTerminalViewport, 50);
      const t2 = setTimeout(refreshTerminalViewport, 150);
      const t3 = setTimeout(refreshTerminalViewport, 300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [
    themeName, 
    customThemes,
    fontFamily, 
    nonAsciiFontFamily, 
    fontSize, 
    lineHeight,
    overrideLineHeight,
    enableLigatures,
    overrideEnableLigatures,
    overrideTheme, 
    overrideFontSize, 
    terminalOpacity, 
    overrideTerminalOpacity, 
    enableBlur,
    fontWeight,
    fontWeightBold,
    letterSpacing,
    minimumContrastRatio,
    customGlyphs,
    unicodeVersion,
    drawBoldTextInBrightColors,
    cursorColor,
    cursorAccentColor,
    selectionBackground,
    selectionForeground,
    rendererType,
    fontSmoothing,
    backgroundImage,
    globalBackgroundImage,
    imageStorageLimitMB,
    isActive
  ]);

  // 管理 WebGL / Canvas / DOM 三级平滑渲染降级架构
  useEffect(() => {
    if (!termRef.current) return;
    const finalOpacity = (overrideTerminalOpacity && overrideTerminalOpacity > 0) ? overrideTerminalOpacity : (terminalOpacity ?? 1.0);
    const isTransparentBg = finalOpacity < 1.0 || Boolean(backgroundImage || globalBackgroundImage);
    const shouldDisableWebgl = rendererType === 'canvas' || rendererType === 'dom' || (rendererType === 'auto' && isTransparentBg);
    const shouldEnableWebgl = (rendererType === 'webgl') || (rendererType === 'auto' && !isTransparentBg);

    if (isActive) {
      if (rendererType === 'dom') {
        disposeWebgl();
        disposeCanvas();
      } else if (shouldEnableWebgl) {
        disposeCanvas();
        if (!webglAddonRef.current) {
          try {
            const addon = new WebglAddon();
            addon.onContextLoss(() => {
              addon.dispose();
              webglAddonRef.current = null;
              loadCanvasFallback();
            });
            termRef.current.loadAddon(addon);
            webglAddonRef.current = addon;
          } catch (e) {
            console.warn('WebGL addon could not be loaded on active, smoothly degrading to Canvas', e);
            loadCanvasFallback();
          }
        }
      } else {
        disposeWebgl();
        if (!canvasAddonRef.current) {
          loadCanvasFallback();
        }
      }
    } else {
      // 非活动 Tab 释放 WebGL 上下文，避免超过浏览器 8~16 个 GPU context 硬件上限
      disposeWebgl();
      disposeCanvas();
    }
  }, [isActive, terminalOpacity, overrideTerminalOpacity, backgroundImage, globalBackgroundImage, rendererType, disposeWebgl, disposeCanvas, loadCanvasFallback]);

  // 动态同步智能高亮规则与启闭状态
  useEffect(() => {
    if (highlightAddonRef.current) {
      highlightAddonRef.current.setEnabled(enableHighlightRules !== false);
      if (highlightRules) {
        highlightAddonRef.current.setRules(highlightRules);
      }
    }
  }, [enableHighlightRules, highlightRules]);

  // 右键快捷高亮所选文本词条
  const handleAddHighlightWord = useCallback((text: string) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = trimmed.includes(' ') ? escaped : `\\b${escaped}\\b`;
    const colors = ['#e5c07b', '#4ec9b0', '#c678dd', '#61afef', '#f14c4c', '#98c379', '#dcdcaa'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newRule = {
      id: `custom_${Date.now()}`,
      name: trimmed.length > 20 ? trimmed.substring(0, 20) + '...' : trimmed,
      pattern,
      color: randomColor,
      category: 'custom' as const,
      enabled: true,
      ignoreCase: true,
      showInRuler: false,
    };
    if (highlightAddonRef.current) {
      const currentRules = highlightAddonRef.current.getRules();
      highlightAddonRef.current.setRules([...currentRules, newRule]);
    }
    if (onAddHighlightRule) {
      onAddHighlightRule(newRule);
    }
  }, [onAddHighlightRule]);

  // 当激活标签改变时获取焦点并对齐
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        const currentCols = termRef.current?.cols || 80;
        const currentRows = termRef.current?.rows || 24;
        ResizeSSH(sessionId, currentCols, currentRows).catch(() => {});
        termRef.current?.focus();
        if (onTerminalReady) {
          onTerminalReady(currentCols, currentRows, sessionId);
        }
      }, 50);
    }
  }, [isActive]);

  const handleScrollToLine = (targetLine: number) => {
    if (!termRef.current) return;
    termRef.current.scrollToLine(targetLine);
    setSearchViewportY(termRef.current.buffer.active.viewportY);
  };

  const handleSearchNext = () => {
    if (searchAddonRef.current && searchText) {
      const found = searchAddonRef.current.findNext(searchText, { 
        regex: searchIsRegex, 
        caseSensitive: searchCaseSensitive,
        wholeWord: searchWholeWord
      });
      if (termRef.current) {
        setSearchViewportY(termRef.current.buffer.active.viewportY);
        const curY = termRef.current.buffer.active.viewportY;
        const idx = searchMatchLines.findIndex(l => Math.abs(l - curY) <= (termRef.current?.rows || 24));
        if (idx >= 0) setCurrentMatchIndex(idx);
      }
      setSearchResultCount(found ? (searchMatchLines.length > 0 ? t('terminal.matchesCount').replace('{count}', String(searchMatchLines.length)) : t('termSearch.matching')) : t('termSearch.noResult'));
    }
  };

  const handleSearchPrev = () => {
    if (searchAddonRef.current && searchText) {
      const found = searchAddonRef.current.findPrevious(searchText, { 
        regex: searchIsRegex, 
        caseSensitive: searchCaseSensitive,
        wholeWord: searchWholeWord
      });
      if (termRef.current) {
        setSearchViewportY(termRef.current.buffer.active.viewportY);
        const curY = termRef.current.buffer.active.viewportY;
        const idx = searchMatchLines.findIndex(l => Math.abs(l - curY) <= (termRef.current?.rows || 24));
        if (idx >= 0) setCurrentMatchIndex(idx);
      }
      setSearchResultCount(found ? (searchMatchLines.length > 0 ? t('terminal.matchesCount').replace('{count}', String(searchMatchLines.length)) : t('termSearch.matching')) : t('termSearch.noResult'));
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchText('');
    setSearchResultCount('');
    setSearchMatchLines([]);
    setCurrentMatchIndex(-1);
    searchAddonRef.current?.clearDecorations();
    termRef.current?.focus();
  };

  const handleContextMenu = async (e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const action = rightClickActionRef.current;
    if (action === 'none') {
      return;
    }
    if (action === 'paste') {
      // 1. 若当前终端存在鼠标激活选区，先同步复制该选区内容
      if (termRef.current?.hasSelection()) {
        const sel = termRef.current.getSelection();
        if (sel) {
          await safeCopyText(sel);
        }
      }
      // 2. 读取系统剪贴板并执行粘贴流程
      const text = await safeGetClipboardText();
      if (text) {
        checkAndPaste(text);
      }
      setContextMenu(null);
      termRef.current?.focus();
      return;
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleCopy = () => {
    if (termRef.current && termRef.current.hasSelection()) {
      safeCopyText(termRef.current.getSelection());
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    const text = await safeGetClipboardText();
    if (text) {
      checkAndPaste(text);
    }
    setContextMenu(null);
    termRef.current?.focus();
  };

  const handleSendClipboardToRemote = async () => {
    try {
      let text = await ClipboardGetText();
      if (!text && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      if (text) {
        const b64 = btoa(unescape(encodeURIComponent(text)));
        await WriteSSH(sessionId, `\x1b]52;c;${b64}\x07`);
        setOscToast(t('terminal.oscPushed').replace('{count}', String(text.length)));
        if (oscToastTimerRef.current) clearTimeout(oscToastTimerRef.current);
        oscToastTimerRef.current = setTimeout(() => setOscToast(null), 2500);
      }
    } catch (err) {
      console.warn('Send clipboard error:', err);
    }
  };

  const handleSelectAll = () => {
    if (termRef.current) {
      termRef.current.selectAll();
    }
    setContextMenu(null);
  };

  const handleClearTerminal = () => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.focus();
    }
    setContextMenu(null);
  };

  const handleScreenshot = async () => {
    setContextMenu(null);
    if (!containerRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#000000',
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `OmniTerminal_${name}_${new Date().getTime()}.png`;
      a.click();
    } catch (e) {
      console.error('Screenshot failed:', e);
      alert(t('terminal.screenshotFailed') + String(e));
    }
  };

  const handleFindFromMenu = () => {
    setContextMenu(null);
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [contextMenu]);

  const activeThemeName = overrideTheme || themeName;
  const baseTheme = (customThemes || []).find((t: any) => t.name === activeThemeName) || THEMES[activeThemeName] || THEMES["VS Code Dark Modern"] || THEMES["Classic Dark"];
  const finalOpacity = (overrideTerminalOpacity && overrideTerminalOpacity > 0) ? overrideTerminalOpacity : (terminalOpacity ?? 1.0);
  // 全局背景图降级逻辑: 会话独立背景优先，否则使用全局背景
  const effectiveBgImage = backgroundImage || globalBackgroundImage || '';
  const effectiveBgOpacity = backgroundImage ? (backgroundOpacity ?? 0.5) : (globalBackgroundOpacity ?? 0.3);
  const effectiveBgBlur = backgroundImage ? (backgroundBlur ?? 0) : (globalBackgroundBlur ?? 0);
  const effectiveBgFit = backgroundImage ? (backgroundFit || 'cover') : (globalBackgroundFit || 'cover');
  const isTransparentBg = finalOpacity < 1.0 || Boolean(effectiveBgImage);
  const activePadding = (overrideTerminalPadding && overrideTerminalPadding > 0) ? overrideTerminalPadding : (terminalPadding ?? 8);

  const getBackgroundFitStyle = () => {
    switch (effectiveBgFit) {
      case 'contain':
        return { backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
      case 'tile':
        return { backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'top left' };
      case 'cover':
      default:
        return { backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    }
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden flex flex-col"
      style={{ backgroundColor: isTransparentBg ? 'transparent' : 'var(--app-tab)' }}
      onContextMenu={handleContextMenu}
    >
      {effectiveBgImage && (
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-200"
          style={{
            backgroundImage: `url(${effectiveBgImage})`,
            opacity: effectiveBgOpacity,
            filter: effectiveBgBlur && effectiveBgBlur > 0 ? `blur(${effectiveBgBlur}px)` : 'none',
            transform: effectiveBgBlur && effectiveBgBlur > 0 ? 'scale(1.05)' : 'none',
            zIndex: 0,
            ...getBackgroundFitStyle()
          }}
        />
      )}

      {/* Quick Command Button Ribbon (终端内嵌快捷命令按钮带) */}
      <TerminalQuickCommandRibbon
        isOpen={isRibbonOpen}
        quickCommands={quickCommands}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        onClose={() => setIsRibbonOpen(false)}
        onSendCommand={sendCommandToTerminal}
        onOpenQuickCommandManager={onOpenQuickCommandManager}
      />

      {/* Terminal Viewport */}
      <div 
        className="flex-1 min-w-0 h-full relative z-[1]"
        style={{ 
          padding: `${activePadding}px`,
          backgroundColor: isTransparentBg ? hexToRgba(baseTheme.background, finalOpacity) : undefined,
          backdropFilter: (isTransparentBg && enableBlur) ? 'blur(16px)' : undefined,
          WebkitBackdropFilter: (isTransparentBg && enableBlur) ? 'blur(16px)' : undefined,
          fontVariantLigatures: (overrideEnableLigatures === 1 || (overrideEnableLigatures === 0 && enableLigatures !== false)) ? 'normal' : 'none',
          fontFeatureSettings: (overrideEnableLigatures === 1 || (overrideEnableLigatures === 0 && enableLigatures !== false)) ? '"liga" 1, "calt" 1' : '"liga" 0, "calt" 0'
        }}
        onContextMenu={handleContextMenu}
      >
        <div ref={containerRef} className="w-full h-full bg-transparent" onContextMenu={handleContextMenu} />

        {/* 终端视口顶部状态胶囊组 (多路复用通道 + Mini 硬件遥测) */}
        <div className="absolute top-2.5 right-4 z-30 flex items-center gap-2 pointer-events-auto select-none">
          <MultiplexBadge
            sessionId={sessionId}
            sessionName={name}
            isActive={isActive}
            isLocal={isLocal}
          />
          <MiniServerTelemetryWidget
            sessionId={sessionId}
            sessionName={name}
            isActive={isActive}
            isLocal={isLocal}
            enableMiniTelemetry={enableMiniTelemetry}
            intervalSec={miniTelemetryIntervalSec}
            onOpenFullMonitor={tabShortcutsRef.current.onToggleHostMonitor}
            className="relative top-0 right-0"
          />
        </div>
      </div>

      {/* 实时日志过滤器 (Live Buffer Filter Pane) */}
      <TerminalLiveFilterPane
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filterMatches={filterMatches}
        setFilterMatches={setFilterMatches}
        filterIsPaused={filterIsPaused}
        setFilterIsPaused={setFilterIsPaused}
        copyNotice={copyNotice}
        setCopyNotice={setCopyNotice}
        filterPattern={filterPattern}
        setFilterPattern={setFilterPattern}
        filterIsRegex={filterIsRegex}
        setFilterIsRegex={setFilterIsRegex}
        filterAutoScroll={filterAutoScroll}
        setFilterAutoScroll={setFilterAutoScroll}
        filterScrollRef={filterScrollRef}
        highlightMatchText={highlightMatchText}
        onCopyAll={(text) => {
          ClipboardSetText(text);
          setCopyNotice(true);
          setTimeout(() => setCopyNotice(false), 2000);
        }}
      />

      {/* 定时发送指令 UI */}
      <TerminalTimerPopover
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        timerConfig={timerConfig}
        setTimerConfig={setTimerConfig}
      />

      {/* 搜索框 UI */}
      <TerminalSearchBar
        isSearchOpen={isSearchOpen}
        searchInputRef={searchInputRef}
        searchText={searchText}
        setSearchText={setSearchText}
        searchCaseSensitive={searchCaseSensitive}
        setSearchCaseSensitive={setSearchCaseSensitive}
        searchWholeWord={searchWholeWord}
        setSearchWholeWord={setSearchWholeWord}
        searchIsRegex={searchIsRegex}
        setSearchIsRegex={setSearchIsRegex}
        searchResultCount={searchResultCount}
        setSearchResultCount={setSearchResultCount}
        searchAddonRef={searchAddonRef}
        handleSearchPrev={handleSearchPrev}
        handleSearchNext={handleSearchNext}
        closeSearch={closeSearch}
      />

      {/* 终端搜索结果迷你地图 (Search Minimap) */}
      <TerminalSearchMinimap
        isOpen={isSearchOpen && searchMatchLines.length > 0}
        matchLines={searchMatchLines}
        totalLines={searchTotalLines || (termRef.current?.buffer?.active?.length || 1)}
        viewportY={searchViewportY}
        viewportRows={searchViewportRows || (termRef.current?.rows || 24)}
        onScrollToLine={handleScrollToLine}
        currentMatchIndex={currentMatchIndex}
      />

      {/* 状态与诊断覆盖层 */}
      <TerminalStatusOverlays
        connecting={connecting}
        isLocal={isLocal}
        reconnecting={reconnecting}
        retryCount={retryCount}
        countdown={countdown}
        errorMsg={errorMsg}
        onRetrySSH={() => connectSSHInstance(false)}
        pacingProgress={pacingProgress}
        onAbortPacing={() => { pacingAbortRef.current = true; }}
        ghostSuggestion={ghostSuggestion}
        currentInputBuffer={currentInputBufferRef.current}
        isActive={isActive}
        detectedError={detectedError}
        onTriggerAIDiagnose={(errText, lastCmd) => {
          setInlineAICopilotMode('diagnose');
          setInlineAICopilotError(errText);
          setInlineAICopilotLastCmd(lastCmd);
          setIsInlineAICopilotOpen(true);
          setDetectedError(null);
        }}
        onClearDetectedError={() => setDetectedError(null)}
        showCommandDuration={showCommandDuration}
        commandDurationInfo={commandDurationInfo}
        oscToast={oscToast}
        showLiveHex={showLiveHex}
        onCloseLiveHex={() => setShowLiveHex(false)}
        hexContent={hexLinesRef.current.slice(-100).join('\n')}
      />

      {/* Phase 8 (25.4.2): 行内即时 AI Copilot 浮层 (Cmd+K / Ctrl+K & 智能报错一键修复) */}
      <InlineAICopilotPopover
        isOpen={isInlineAICopilotOpen}
        onClose={() => {
          setIsInlineAICopilotOpen(false);
          termRef.current?.focus();
        }}
        onInsertToTerminal={(cmd) => {
          if (!cmd) return;
          const encoder = new TextEncoder();
          const rawBytes = encoder.encode(cmd);
          writeQueueRef.current.push(rawBytes);
          processWriteQueue();
          termRef.current?.focus();
        }}
        onRunInTerminal={(cmd) => {
          if (!cmd) return;
          const encoder = new TextEncoder();
          const rawBytes = encoder.encode(cmd + '\r');
          writeQueueRef.current.push(rawBytes);
          processWriteQueue();
          termRef.current?.focus();
        }}
        activeSessionId={sessionId}
        activeSessionName={name}
        terminalContextDir={currentDirRef.current || ''}
        osType={isLocal ? (navigator.userAgent.includes('Win') ? 'Windows (PowerShell)' : 'macOS / Linux (Zsh/Bash)') : 'Linux / Unix'}
        shellType={isLocal ? (navigator.userAgent.includes('Win') ? 'powershell' : 'zsh') : 'bash'}
        initialMode={inlineAICopilotMode}
        initialErrorText={inlineAICopilotError}
        initialLastCommand={inlineAICopilotLastCmd}
        aiConfig={aiConfig}
        onOpenSettings={tabShortcutsRef.current.onOpenSettings}
        onOpenFullCopilotModal={tabShortcutsRef.current.onToggleAICopilot}
      />

      {/* 右键气泡菜单 */}
      <TerminalContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onSendClipboardToRemote={handleSendClipboardToRemote}
        onAddBookmark={addBookmarkAtCurrentLine}
        hasSelection={Boolean(termRef.current?.hasSelection ? termRef.current.hasSelection() : false)}
        selectionText={(termRef.current?.getSelection ? termRef.current.getSelection() : '') || ''}
        onExplainText={onExplainText}
        onTriggerAIDiagnose={(errText, lastCmd) => {
          setInlineAICopilotMode('diagnose');
          setInlineAICopilotError(errText);
          setInlineAICopilotLastCmd(lastCmd);
          setIsInlineAICopilotOpen(true);
          setDetectedError(null);
        }}
        onOpenUrl={(url) => BrowserOpenURL(url)}
        onSelectAll={handleSelectAll}
        onClearTerminal={handleClearTerminal}
        showLiveHex={showLiveHex}
        onToggleLiveHex={() => setShowLiveHex(!showLiveHex)}
        onFindFromMenu={handleFindFromMenu}
        onScreenshot={handleScreenshot}
        isCommandBlockMode={activeCommandBlockMode}
        onToggleCommandBlockMode={toggleCommandBlockMode}
        onAddHighlightWord={handleAddHighlightWord}
      />

      {/* 📊 智能输出语义化解析浮动按钮 */}
      {enableStructuredOutput && hasStructuredOutput && isActive && (
        <button
          onClick={() => {
            const sel = termRef.current?.getSelection() || '';
            const raw = sel || recentOutputBufferRef.current || '';
            setStructuredContent({ rawText: raw, command: lastExecutedCmdRef.current });
            setStructuredOverlayOpen(true);
          }}
          className="absolute top-3 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#252526] hover:bg-[#0078d4] border border-[#2b2b2b] hover:border-[#0078d4] text-xs font-medium text-[#cccccc] hover:text-white shadow-lg transition-all animate-in fade-in"
          title={t('terminal.structuredOutputTitle')}
        >
          <Table className="w-3.5 h-3.5 text-[#3794ff]" />
          <span>{t('terminal.structuredOutput')}</span>
        </button>
      )}

      {/* 📊 结构化解析视图覆盖层 */}
      <StructuredOutputOverlay
        isOpen={structuredOverlayOpen}
        onClose={() => setStructuredOverlayOpen(false)}
        rawText={structuredContent.rawText}
        command={structuredContent.command}
      />

      {/* 🚩 书签抽屉与浮标 */}
      <TerminalBookmarkDrawer
        bookmarks={bookmarks}
        isOpen={isBookmarkDrawerOpen}
        isActive={isActive}
        toast={bookmarkToast}
        onOpen={() => setIsBookmarkDrawerOpen(true)}
        onClose={() => setIsBookmarkDrawerOpen(false)}
        onJumpTo={(line) => {
          termRef.current?.scrollToLine(line);
          setBookmarkToast(t('terminal.jumpToBookmark').replace('{line}', String(line + 1)));
          setTimeout(() => setBookmarkToast(null), 1500);
        }}
        onDelete={(id) => {
          setBookmarks(prev => prev.filter(b => b.id !== id));
        }}
      />

      {/* 🚀 Warp 风格结构化命令块模式 */}
      <TerminalCommandBlockView
        commandBlocks={commandBlocks}
        isActive={isActive}
        isCommandBlockMode={activeCommandBlockMode}
        onToggleMode={toggleCommandBlockMode}
        onCloseMode={() => {
          if (activeCommandBlockMode) toggleCommandBlockMode();
        }}
        onToggleCollapse={(id) => {
          setCommandBlocks(prev => prev.map(b => b.id === id ? { ...b, isCollapsed: !b.isCollapsed } : b));
        }}
        onToggleBookmark={(id) => {
          setCommandBlocks(prev => prev.map(b => b.id === id ? { ...b, isBookmarked: !b.isBookmarked } : b));
        }}
        onExplainWithAI={(b) => {
          if (onExplainText) onExplainText(b.output || b.command);
        }}
      />

      {/* 安全粘贴与危险命令拦截确认弹窗 */}
      <SafePasteModal 
        isOpen={safePasteOpen}
        onClose={() => setSafePasteOpen(false)}
        textToPaste={pendingPasteText}
        dangerousRules={dangerousRules}
        defaultCharDelay={overrideCharSendDelayMs && overrideCharSendDelayMs > 0 ? overrideCharSendDelayMs : charSendDelayMs}
        defaultLineDelay={overrideLineSendDelayMs && overrideLineSendDelayMs > 0 ? overrideLineSendDelayMs : lineSendDelayMs}
        onConfirm={(text, opts) => executePaste(text, opts)}
      />
    </div>
  );
};

export const TerminalInstance = React.memo(TerminalInstanceComponent);

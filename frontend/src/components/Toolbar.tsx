
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Settings, Search, X, Terminal as TermIcon, 
  ChevronDown, Folder, FolderPlus, Lock, KeyRound, 
  ShieldCheck, UploadCloud, Monitor, Shield, Globe, 
  Languages, Type, Layout, RefreshCw, Columns, Printer,
  TerminalSquare, Loader2, Unplug, RefreshCcw, Camera,
  FileText, SplitSquareHorizontal, Circle, Square,
  ArrowLeft, ArrowRight, Keyboard, Code, Network, Grid2X2,
  Activity, Server, Sparkles, Cloud, Sun, Moon, Laptop, Share2,
  Wrench, SlidersHorizontal, Zap, Maximize2
} from 'lucide-react';
import { SaveTerminalLog, SetSerialDTR, SetSerialRTS, SendSerialBreak, SaveSettings, CheckAppUpdate, GetAppVersion } from '../../wailsjs/go/app/App';
import { WindowToggleMaximise, WindowMinimise, Quit, BrowserOpenURL, EventsOn, ClipboardSetText, ClipboardGetText } from '../../wailsjs/runtime/runtime';
import { activeTerminals, searchAddons, terminalBuffers } from './TerminalInstance';
import * as models from '../../wailsjs/go/models';
import { MacroManagerModal } from './MacroManagerModal';
import { UpdateModal } from './UpdateModal';
import { PrintTerminalModal } from './PrintTerminalModal';
import appIcon from '../assets/images/appicon.png';

// Menu item type supporting separators and shortcut annotations
interface MenuItem {
  label: string;
  shortcut?: string;
  isSeparator?: boolean;
}

const MENU_ITEM_I18N: Record<string, { en: string; ja: string; ko: string }> = {
  '新建(N)...': { en: 'New(N)...', ja: '新規作成(N)...', ko: '새로 만들기(N)...' },
  '新建本地 Shell(L)': { en: 'New Local Shell(L)', ja: '新規ローカルシェル(L)', ko: '새 로컬 셸(L)' },
  '从 OpenSSH ~/.ssh/config 导入...': { en: 'Import from ~/.ssh/config...', ja: '~/.ssh/config からインポート...', ko: '~/.ssh/config에서 가져오기...' },
  '导出为 OpenSSH ~/.ssh/config': { en: 'Export as ~/.ssh/config', ja: '~/.ssh/config にエクスポート', ko: '~/.ssh/config로 내보내기' },
  '打开会话管理器(O)': { en: 'Session Manager(O)', ja: 'セッションマネージャー(O)', ko: '세션 관리자(O)' },
  '关闭当前标签页(C)': { en: 'Close Current Tab(C)', ja: '現在のタブを閉じる(C)', ko: '현재 탭 닫기(C)' },
  '另存为日志(A)...': { en: 'Save As Log(A)...', ja: 'ログとして保存(A)...', ko: '로그로 저장(A)...' },
  '打印(P)...': { en: 'Print(P)...', ja: '印刷(P)...', ko: '인쇄(P)...' },
  '退出(X)': { en: 'Quit(X)', ja: '終了(X)', ko: '종료(X)' },

  '复制(C)': { en: 'Copy(C)', ja: 'コピー(C)', ko: '복사(C)' },
  '粘贴(P)': { en: 'Paste(P)', ja: '貼り付け(P)', ko: '붙여넣기(P)' },
  '全选(A)': { en: 'Select All(A)', ja: 'すべて選択(A)', ko: '모두 선택(A)' },
  '查找(F)...': { en: 'Find(F)...', ja: '検索(F)...', ko: '찾기(F)...' },
  '清空屏幕(L)': { en: 'Clear Screen(L)', ja: '画面をクリア(L)', ko: '화면 지우기(L)' },
  '清空滚动缓冲区': { en: 'Clear Scrollback Buffer', ja: 'スクロールバッファをクリア', ko: '스크롤 버퍼 지우기' },

  '工具栏(T)': { en: 'Toolbar(T)', ja: 'ツールバー(T)', ko: '도구 모음(T)' },
  '地址栏(A)': { en: 'Address Bar(A)', ja: 'アドレスバー(A)', ko: '주소 표시줄(A)' },
  '状态栏(S)': { en: 'Status Bar(S)', ja: 'ステータスバー(S)', ko: '상태 표시줄(S)' },
  '会话管理器(M)': { en: 'Session Manager(M)', ja: 'セッションマネージャー(M)', ko: '세션 관리자(M)' },
  '暗黑主题模式(Dark)': { en: 'Dark Theme Mode', ja: 'ダークテーマモード', ko: '다크 테마 모드' },
  '明亮主题模式(Light)': { en: 'Light Theme Mode', ja: 'ライトテーマモード', ko: '라이트 테마 모드' },
  '跟随系统外观(Auto)': { en: 'Follow System (Auto)', ja: 'システム設定に従う (Auto)', ko: '시스템 설정 따름 (Auto)' },
  'Quake 下拉模式(Q)': { en: 'Quake Dropdown Mode(Q)', ja: 'Quake ドロップダウンモード(Q)', ko: 'Quake 드롭다운 모드(Q)' },
  '全屏(F)': { en: 'Fullscreen(F)', ja: '全画面表示(F)', ko: '전체 화면(F)' },
  '放大字体(=)': { en: 'Zoom In(=)', ja: 'フォント拡大(=)', ko: '글꼴 확대(=)' },
  '缩小字体(-)': { en: 'Zoom Out(-)', ja: 'フォント縮小(-)', ko: '글꼴 축소(-)' },
  '重置字体大小(0)': { en: 'Reset Font Size(0)', ja: 'フォントサイズ初期化(0)', ko: '글꼴 크기 초기화(0)' },

  '命令调色板(P)...': { en: 'Command Palette(P)...', ja: 'コマンドパレット(P)...', ko: '명령 팔레트(P)...' },
  '跨会话命令历史(H)...': { en: 'Cross-Session Command History(H)...', ja: 'セッション横断コマンド履歴(H)...', ko: '세션 간 명령 기록(H)...' },
  '选项(O)...': { en: 'Options(O)...', ja: '設定オプション(O)...', ko: '옵션(O)...' },
  'OmniAI 智能运维 Copilot(AI)...': { en: 'OmniAI Smart Copilot(AI)...', ja: 'OmniAI スマート運用 Copilot(AI)...', ko: 'OmniAI 스마트 운영 Copilot(AI)...' },
  '端到端加密云同步与团队资产(Sync)...': { en: 'E2E Encrypted Cloud Sync(Sync)...', ja: 'E2E 暗号化クラウド同期(Sync)...', ko: '종단간 암호화 클라우드 동기화(Sync)...' },
  'SOP 运维手册与交互式执行流(SOP)...': { en: 'SOP Runbook & Interactive Flow(SOP)...', ja: 'SOP 運用マニュアル＆実行フロー(SOP)...', ko: 'SOP 운영 매뉴얼 및 대화형 흐름(SOP)...' },
  '密钥管理(K)...': { en: 'Key Manager(K)...', ja: '鍵管理(K)...', ko: '키 관리자(K)...' },
  '认证配置管理(A)...': { en: 'Auth Profiles(A)...', ja: '認証プロファイル管理(A)...', ko: '인증 프로필 관리(A)...' },
  'SSH 端口转发与隧道监控(U)...': { en: 'SSH Tunnels & Port Forwarding(U)...', ja: 'SSH トンネル＆ポート転送(U)...', ko: 'SSH 터널 및 포트 전달 모니터(U)...' },
  '网络拓扑与隧道可视化(Topo)...': { en: 'Network Topology Visualization(Topo)...', ja: 'ネットワークトポロジー可視化(Topo)...', ko: '네트워크 토폴로지 시각화(Topo)...' },
  '多主机命令对比执行(Diff)...': { en: 'Multi-Host Command Diff(Diff)...', ja: '複数ホストコマンド比較実行(Diff)...', ko: '다중 호스트 명령 비교 실행(Diff)...' },
  'TOTP / MFA 令牌管理(TOTP)...': { en: 'TOTP / MFA Token Manager(TOTP)...', ja: 'TOTP / MFA トークン管理(TOTP)...', ko: 'TOTP / MFA 토큰 관리자(TOTP)...' },
  '批量主机健康巡检(Insp)...': { en: 'Batch Host Health Inspection(Insp)...', ja: '一括ホスト健全性点検(Insp)...', ko: '일괄 호스트 상태 점검(Insp)...' },
  '运行自动化脚本(S)...': { en: 'Run Automated Script(S)...', ja: '自動化スクリプト実行(S)...', ko: '자동화 스크립트 실행(S)...' },
  '主机性能实时监控(Activity)...': { en: 'Host Performance Monitor(Activity)...', ja: 'ホストパフォーマンス監視(Activity)...', ko: '호스트 성능 실시간 모니터(Activity)...' },
  '远程进程与服务管理(Ops)...': { en: 'Remote Processes & Services(Ops)...', ja: 'リモートプロセス＆サービス管理(Ops)...', ko: '원격 프로세스 및 서비스 관리(Ops)...' },
  '远程实时日志追踪器(Tail)...': { en: 'Remote Realtime Log Tail(Tail)...', ja: 'リモートリアルタイムログ追跡(Tail)...', ko: '원격 실시간 로그 추적기(Tail)...' },
  '一键断开全部连接(D)': { en: 'Disconnect All Connections(D)', ja: 'すべての接続を切断(D)', ko: '모든 연결 끊기(D)' },
  '日志查看器(L)...': { en: 'Log Viewer(L)...', ja: 'ログビューア(L)...', ko: '로그 뷰어(L)...' },
  '宏管理器(M)...': { en: 'Macro Manager(M)...', ja: 'マクロマネージャー(M)...', ko: '매크로 관리자(M)...' },
  '触发器管理(R)...': { en: 'Trigger Manager(R)...', ja: 'トリガー管理(R)...', ko: '트리거 관리자(R)...' },
  'SFTP 文件管理器(F)': { en: 'SFTP File Manager(F)', ja: 'SFTP ファイルマネージャー(F)', ko: 'SFTP 파일 관리자(F)' },
  '多行撰写窗格(P)': { en: 'Compose Pane(P)', ja: '複数行入力ペイン(P)', ko: '다중 줄 입력창(P)' },
  '立即锁定工作区(Lock)...': { en: 'Lock Workspace Now(Lock)...', ja: '今すぐワークスペースをロック(Lock)...', ko: '지금 워크스페이스 잠금(Lock)...' },

  '新建选项卡(N)': { en: 'New Tab(N)', ja: '新規タブ(N)', ko: '새 탭(N)' },
  '克隆当前选项卡(D)': { en: 'Clone Current Tab(D)', ja: '現在のタブを複製(D)', ko: '현재 탭 복제(D)' },
  '拆离到独立窗口(D)': { en: 'Detach to Window(D)', ja: '別ウィンドウに分離(D)', ko: '독립 창으로 분리(D)' },
  '关闭当前选项卡(C)': { en: 'Close Current Tab(C)', ja: '現在のタブを閉じる(C)', ko: '현재 탭 닫기(C)' },
  '关闭其他选项卡': { en: 'Close Other Tabs', ja: '他のタブを閉じる', ko: '다른 탭 닫기' },
  '关闭右侧全部': { en: 'Close All to the Right', ja: '右側のタブをすべて閉じる', ko: '오른쪽 탭 모두 닫기' },
  '锁定/解锁当前选项卡(L)': { en: 'Lock/Unlock Tab(L)', ja: 'タブの固定/固定解除(L)', ko: '탭 잠금/잠금 해제(L)' },
  '重命名选项卡(R)': { en: 'Rename Tab(R)', ja: 'タブの名前変更(R)', ko: '탭 이름 바꾸기(R)' },
  '选项卡管理器(M)': { en: 'Tab Manager(M)', ja: 'タブマネージャー(M)', ko: '탭 관리자(M)' },
  '上一个选项卡': { en: 'Previous Tab', ja: '前のタブ', ko: '이전 탭' },
  '下一个选项卡': { en: 'Next Tab', ja: '次のタブ', ko: '다음 탭' },

  '垂直分屏(V)': { en: 'Split Vertically(V)', ja: '垂直分割(V)', ko: '수직 분할(V)' },
  '水平分屏(H)': { en: 'Split Horizontally(H)', ja: '水平分割(H)', ko: '수평 분할(H)' },
  '四分屏 (2x2 田字格)': { en: '4-Way Split (2x2 Grid)', ja: '4画面分割 (2x2)', ko: '4분할 (2x2 그리드)' },
  '三分屏 (1+2 品字形)': { en: '3-Way Split (1+2)', ja: '3画面分割 (1+2)', ko: '3분할 (1+2)' },
  '关闭分屏': { en: 'Close Split', ja: '分割を閉じる', ko: '분할 닫기' },
  '在所有选项卡中广播输入': { en: 'Broadcast Input to All Tabs', ja: '全タブに入力を配信', ko: '모든 탭에 입력 브로드캐스트' },
  '最小化窗口(M)': { en: 'Minimize Window(M)', ja: 'ウィンドウを最小化(M)', ko: '창 최소화(M)' },
  '最大化窗口(Z)': { en: 'Maximize Window(Z)', ja: 'ウィンドウを最大化(Z)', ko: '창 최대화(Z)' },

  '在线文档(D)': { en: 'Documentation(D)', ja: 'ドキュメント(D)', ko: '문서(D)' },
  '报告问题(R)': { en: 'Report Issue(R)', ja: '問題を報告(R)', ko: '문제 신고(R)' },
  '快捷键参考(K)': { en: 'Shortcuts Reference(K)', ja: 'ショートカット一覧(K)', ko: '단축키 안내(K)' },
  '关于 OmniTerminal(A)...': { en: 'About OmniTerminal(A)...', ja: 'OmniTerminal について(A)...', ko: 'OmniTerminal 정보(A)...' },
  '检查更新(U)...': { en: 'Check for Updates(U)...', ja: '更新を確認(U)...', ko: '업데이트 확인(U)...' },
};


interface ToolbarProps {
  t: any;
  resetSessionFormData: () => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (isOpen: boolean) => void;
  resetFolderFormData: () => void;
  loadSessions: () => void;
  handleLocalShell: () => void;
  activeDockPanel: 'sessions' | 'containers' | 'sftp' | 'none';
  setActiveDockPanel: (panel: 'sessions' | 'containers' | 'sftp' | 'none') => void;
  toggleSftpPanel: () => void;
  activeTabId: string | null;
  openSftpTabs: string[];
  isTasksOpen: boolean;
  setIsTasksOpen: (isOpen: boolean) => void;
  activeTasksCount: number;
  isComposeOpen: boolean;
  setIsComposeOpen: (isOpen: boolean) => void;
  setIsGlobalSearchOpen: (isOpen: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsKeyManagerOpen: (isOpen: boolean) => void;
  setIsAuthManagerOpen: (isOpen: boolean) => void;
  setIsImportModalOpen?: (isOpen: boolean) => void;
  handleQuickConnect: (e: React.FormEvent) => void;
  quickConnectInput: string;
  setQuickConnectInput: (val: string) => void;
  tabs: any[];
  setActiveTabId: (id: string) => void;
  removeTab: (id: string) => void;
  handleCloseOtherTabs: (id: string) => void;
  handleCloseRightTabs: (id: string) => void;
  handleCloneTab: (tab: any) => void;
  handleDetachTab?: (id: string) => void;
  toggleTabLock: (id: string) => void;
  splitMode?: 'none' | 'vertical' | 'horizontal' | 'grid2x2' | 'grid1plus2';
  setSplitMode: (mode: 'none' | 'vertical' | 'horizontal' | 'grid2x2' | 'grid1plus2') => void;
  setIsBroadcast: (val: boolean) => void;
  settings: any;
  setSettings: (val: any) => void;
  lang: string;
  setLang: (val: string) => void;
  setIsLogViewerOpen: (val: boolean) => void;
  // New props for Phase 2/3 features
  handlePrevTab?: () => void;
  handleNextTab?: () => void;
  handleDisconnect?: () => void;
  handleReconnect?: () => void;
  startRecordingMacro?: () => void;
  stopRecordingMacro?: () => void;
  isRecordingMacro?: boolean;
  handleRenameTab?: (id: string) => void;
  isTabManagerOpen?: boolean;
  setIsTabManagerOpen?: (val: boolean) => void;
  isShortcutRefOpen?: boolean;
  setIsShortcutRefOpen?: (val: boolean) => void;
  isTriggerManagerOpen?: boolean;
  setIsTriggerManagerOpen?: (val: boolean) => void;
  // Phase 4: 隧道监控与脚本执行器
  isTunnelMonitorOpen?: boolean;
  setIsTunnelMonitorOpen?: (val: boolean) => void;
  isScriptRunnerOpen?: boolean;
  setIsScriptRunnerOpen?: (val: boolean) => void;
  // Phase 5B: 主机监控与远程运维
  isHostMonitorOpen?: boolean;
  setIsHostMonitorOpen?: (val: boolean) => void;
  isRemoteOpsOpen?: boolean;
  setIsRemoteOpsOpen?: (val: boolean) => void;
  // Phase 5C/D: 实时日志与 SSH Config 导出
  isRealtimeLogOpen?: boolean;
  setIsRealtimeLogOpen?: (val: boolean) => void;
  handleExportSSHConfig?: () => void;
  // Phase 5D: AI Copilot 与端到端加密云同步
  isAICopilotOpen?: boolean;
  setIsAICopilotOpen?: (val: boolean) => void;
  isAIChatDrawerOpen?: boolean;
  setIsAIChatDrawerOpen?: any;
  isCloudSyncOpen?: boolean;
  setIsCloudSyncOpen?: (val: boolean) => void;
  isRunbookOpen?: boolean;
  setIsRunbookOpen?: (val: boolean) => void;
  isTopologyOpen?: boolean;
  setIsTopologyOpen?: (val: boolean) => void;
  isMultiExecDiffOpen?: boolean;
  setIsMultiExecDiffOpen?: (val: boolean) => void;
  isTotpManagerOpen?: boolean;
  setIsTotpManagerOpen?: (val: boolean) => void;
  isInspectionModalOpen?: boolean;
  setIsInspectionModalOpen?: (val: boolean) => void;
  onLockWorkspace?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenCommandHistory?: () => void;
}

interface UpdateInfo {
  tag_name: string;
  body: string;
  html_url: string;
}

export function Toolbar({
  t,
  resetSessionFormData,
  setModalMode,
  setIsModalOpen,
  resetFolderFormData,
  loadSessions,
  handleLocalShell,
  activeDockPanel,
  setActiveDockPanel,
  toggleSftpPanel,
  activeTabId,
  openSftpTabs,
  isTasksOpen,
  setIsTasksOpen,
  activeTasksCount,
  isComposeOpen,
  setIsComposeOpen,
  setIsGlobalSearchOpen,
  setIsSettingsOpen,
  setIsKeyManagerOpen,
  setIsAuthManagerOpen,
  setIsImportModalOpen,
  handleQuickConnect,
  quickConnectInput,
  setQuickConnectInput,
  tabs,
  setActiveTabId,
  removeTab,
  handleCloseOtherTabs,
  handleCloseRightTabs,
  handleCloneTab,
  handleDetachTab,
  toggleTabLock,
  splitMode = 'none',
  setSplitMode,
  setIsBroadcast,
  settings,
  setSettings,
  lang,
  setLang,
  setIsLogViewerOpen,
  handlePrevTab,
  handleNextTab,
  handleDisconnect,
  handleReconnect,
  startRecordingMacro,
  stopRecordingMacro,
  isRecordingMacro = false,
  handleRenameTab,
  isTabManagerOpen,
  setIsTabManagerOpen,
  isShortcutRefOpen,
  setIsShortcutRefOpen,
  isTriggerManagerOpen,
  setIsTriggerManagerOpen,
  isTunnelMonitorOpen,
  setIsTunnelMonitorOpen,
  isScriptRunnerOpen,
  setIsScriptRunnerOpen,
  isHostMonitorOpen,
  setIsHostMonitorOpen,
  isRemoteOpsOpen,
  setIsRemoteOpsOpen,
  isRealtimeLogOpen,
  setIsRealtimeLogOpen,
  handleExportSSHConfig,
  isAICopilotOpen,
  setIsAICopilotOpen,
  isAIChatDrawerOpen,
  setIsAIChatDrawerOpen,
  isCloudSyncOpen,
  setIsCloudSyncOpen,
  isRunbookOpen,
  setIsRunbookOpen,
  isTopologyOpen,
  setIsTopologyOpen,
  isMultiExecDiffOpen,
  setIsMultiExecDiffOpen,
  isTotpManagerOpen,
  setIsTotpManagerOpen,
  isInspectionModalOpen,
  setIsInspectionModalOpen,
  onLockWorkspace,
  onOpenCommandPalette,
  onOpenCommandHistory,
}: ToolbarProps) {
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [appVersion, setAppVersion] = useState<string>("v1.0.0");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 串口会话控制状态
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isSerial = activeTab?.protocol === 'serial';
  const [dtrState, setDtrState] = useState(true);
  const [rtsState, setRtsState] = useState(true);

  useEffect(() => {
    if (activeTab && activeTab.protocol === 'serial') {
      setDtrState(activeTab.serialConfig?.dtr ?? true);
      setRtsState(activeTab.serialConfig?.rts ?? true);
    }
  }, [activeTabId, activeTab]);

  const toggleDTR = () => {
    if (!activeTabId) return;
    const next = !dtrState;
    SetSerialDTR(activeTabId, next).then(() => setDtrState(next)).catch(() => {});
  };

  const toggleRTS = () => {
    if (!activeTabId) return;
    const next = !rtsState;
    SetSerialRTS(activeTabId, next).then(() => setRtsState(next)).catch(() => {});
  };

  const triggerBreak = () => {
    if (!activeTabId) return;
    SendSerialBreak(activeTabId).catch(() => {});
  };

  useEffect(() => {
    GetAppVersion().then((ver: string) => {
      if (ver) setAppVersion(ver);
    }).catch(() => {});
  }, []);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [popover, setPopover] = useState<'lang'|'font'|'opacity'|'theme'|'toolbox'|null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== 'undefined' && (/Mac|Darwin/.test(navigator.platform || '') || /Macintosh/.test(navigator.userAgent || ''));
  
  const displayMenuLabel = useCallback((label: string) => {
    let localized = label;
    if (lang === 'en-US' && MENU_ITEM_I18N[label]?.en) localized = MENU_ITEM_I18N[label].en;
    else if (lang === 'ja-JP' && MENU_ITEM_I18N[label]?.ja) localized = MENU_ITEM_I18N[label].ja;
    else if (lang === 'ko-KR' && MENU_ITEM_I18N[label]?.ko) localized = MENU_ITEM_I18N[label].ko;

    return isMac ? localized.replace(/\([A-Za-z0-9_]+\)/g, '') : localized;
  }, [isMac, lang]);

  const formatMacShortcut = useCallback((shortcut?: string) => {
    if (!shortcut) return '';
    if (!isMac) return shortcut;
    return shortcut
      .replace(/Ctrl\+Shift\+/gi, '⇧⌘')
      .replace(/Ctrl\+Alt\+/gi, '⌥⌘')
      .replace(/Cmd\+Alt\+/gi, '⌥⌘')
      .replace(/Ctrl\+/gi, '⌘')
      .replace(/Cmd\+/gi, '⌘')
      .replace(/Alt\+/gi, '⌥')
      .replace(/Shift\+/gi, '⇧');
  }, [isMac]);

  const getMenuItemIcon = useCallback((label: string) => {
    const l = label.toLowerCase();
    if (l.includes('新建本地') || l.includes('local shell')) return <TerminalSquare className="w-3.5 h-3.5 text-emerald-400" />;
    if (l.includes('新建') || l.includes('new')) return <Plus className="w-3.5 h-3.5 text-blue-400" />;
    if (l.includes('导入') || l.includes('import')) return <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />;
    if (l.includes('导出') || l.includes('export')) return <UploadCloud className="w-3.5 h-3.5 text-sky-400" />;
    if (l.includes('会话管理') || l.includes('session')) return <Folder className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes('关闭') || l.includes('close')) return <X className="w-3.5 h-3.5 text-rose-400" />;
    if (l.includes('另存为') || l.includes('日志查看') || l.includes('log')) return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    if (l.includes('打印') || l.includes('print')) return <Printer className="w-3.5 h-3.5 text-slate-400" />;
    if (l.includes('退出') || l.includes('断开') || l.includes('quit')) return <Unplug className="w-3.5 h-3.5 text-rose-400" />;
    if (l.includes('复制') || l.includes('粘贴') || l.includes('全选')) return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
    if (l.includes('查找') || l.includes('search') || l.includes('find')) return <Search className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes('清空') || l.includes('重置') || l.includes('clear')) return <RefreshCw className="w-3.5 h-3.5 text-slate-400" />;
    if (l.includes('暗黑') || l.includes('dark')) return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
    if (l.includes('明亮') || l.includes('light')) return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes('跟随系统') || l.includes('auto')) return <Laptop className="w-3.5 h-3.5 text-cyan-400" />;
    if (l.includes('全屏') || l.includes('fullscreen')) return <Maximize2 className="w-3.5 h-3.5 text-blue-400" />;
    if (l.includes('放大') || l.includes('缩小') || l.includes('字体')) return <Type className="w-3.5 h-3.5 text-purple-400" />;
    if (l.includes('命令调色板') || l.includes('palette')) return <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />;
    if (l.includes('历史') || l.includes('history')) return <Activity className="w-3.5 h-3.5 text-blue-400" />;
    if (l.includes('选项') || l.includes('settings')) return <Settings className="w-3.5 h-3.5 text-slate-400" />;
    if (l.includes('omniai') || l.includes('copilot') || l.includes('ai')) return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    if (l.includes('云同步') || l.includes('sync')) return <Cloud className="w-3.5 h-3.5 text-sky-400" />;
    if (l.includes('密钥') || l.includes('key')) return <KeyRound className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes('认证') || l.includes('auth')) return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    if (l.includes('端口转发') || l.includes('隧道') || l.includes('tunnel')) return <Network className="w-3.5 h-3.5 text-blue-400" />;
    if (l.includes('对比') || l.includes('diff')) return <Columns className="w-3.5 h-3.5 text-indigo-400" />;
    if (l.includes('totp') || l.includes('mfa')) return <Shield className="w-3.5 h-3.5 text-teal-400" />;
    if (l.includes('巡检') || l.includes('监控') || l.includes('health') || l.includes('activity')) return <Activity className="w-3.5 h-3.5 text-rose-400" />;
    if (l.includes('脚本') || l.includes('script')) return <Code className="w-3.5 h-3.5 text-emerald-400" />;
    if (l.includes('进程') || l.includes('服务') || l.includes('ops')) return <Server className="w-3.5 h-3.5 text-blue-400" />;
    if (l.includes('宏') || l.includes('macro')) return <Keyboard className="w-3.5 h-3.5 text-indigo-400" />;
    if (l.includes('触发器') || l.includes('trigger')) return <Zap className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes('sftp') || l.includes('文件')) return <Folder className="w-3.5 h-3.5 text-cyan-400" />;
    if (l.includes('锁') || l.includes('lock')) return <Lock className="w-3.5 h-3.5 text-yellow-400" />;
    if (l.includes('分屏') || l.includes('split')) return <Grid2X2 className="w-3.5 h-3.5 text-indigo-400" />;
    if (l.includes('广播') || l.includes('broadcast')) return <TerminalSquare className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes('选项卡') || l.includes('tab')) return <SplitSquareHorizontal className="w-3.5 h-3.5 text-sky-400" />;
    if (l.includes('文档') || l.includes('doc')) return <Globe className="w-3.5 h-3.5 text-sky-400" />;
    if (l.includes('关于') || l.includes('更新') || l.includes('help')) return <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />;
    return <Circle className="w-2.5 h-2.5 text-slate-500 fill-slate-500/30" />;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setMenuSearch('');
      }
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = async (item: string) => {
    setActiveMenu(null);
    
    // 帮助
    if (item === '关于 OmniTerminal(A)...' || item === '检查更新(U)...') {
      checkForUpdates();
      return;
    }
    if (item === '在线文档(D)') {
      BrowserOpenURL("https://github.com/leonlwq/omniterminal/wiki");
      return;
    }
    if (item === '报告问题(R)') {
      BrowserOpenURL("https://github.com/leonlwq/omniterminal/issues");
      return;
    }

    // 文件
    if (item === '新建(N)...') { resetSessionFormData(); setModalMode('create'); setIsModalOpen(true); return; }
    if (item === '新建本地 Shell(L)') { handleLocalShell(); return; }
    if (item === '打开会话管理器(O)') { setActiveDockPanel('sessions'); return; }
    if (item === '关闭当前标签页(C)' || item === '关闭当前选项卡(C)') { if (activeTabId) removeTab(activeTabId); return; }
    if (item === '另存为日志(A)...') {
      if (activeTabId && terminalBuffers[activeTabId]) {
        const content = terminalBuffers[activeTabId]().join('\n');
        try {
          await SaveTerminalLog(content, `terminal_${activeTabId}_${Date.now()}.log`);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
    if (item === '打印(P)...' || item === '打印终端(P)...' || item === '打印...') {
      setIsPrintModalOpen(true);
      return;
    }
    if (item === '退出(X)') { Quit(); return; }

    // 编辑
    const term = activeTabId ? activeTerminals[activeTabId] : null;
    const search = activeTabId ? searchAddons[activeTabId] : null;

    if (item === '复制(C)') {
      if (term && term.hasSelection()) {
        ClipboardSetText(term.getSelection()).catch(() => {
          navigator.clipboard?.writeText(term.getSelection());
        });
      }
      return;
    }
    if (item === '粘贴(P)') {
      ClipboardGetText()
        .then(text => {
          if (text && term) term.paste(text);
        })
        .catch(() => {
          navigator.clipboard?.readText().then(text => {
            if (text && term) term.paste(text);
          });
        });
      return;
    }
    if (item === '全选(A)') {
      if (term) term.selectAll();
      return;
    }
    if (item === '查找(F)...') {
      setIsGlobalSearchOpen(true);
      return;
    }
    if (item === '清空屏幕(L)') {
      if (term) {
        term.write('\x1b[2J\x1b[H');
      }
      return;
    }
    if (item === '清空滚动缓冲区') {
      if (term) term.clear();
      return;
    }

    // 查看
    if (item === '工具栏(T)') { setSettings(new models.models.AppSettings({ ...settings, showToolbar: !settings.showToolbar })); return; }
    if (item === '状态栏(S)') { setSettings(new models.models.AppSettings({ ...settings, showStatusBar: !settings.showStatusBar })); return; }
    if (item === '暗黑主题模式(Dark)') {
      const newSettings = new models.models.AppSettings({
        ...settings,
        appThemeMode: 'dark',
        themeName: (settings.themeName === 'GitHub Light' || settings.themeName === 'Classic Light' || settings.themeName === 'Solarized Light') ? 'Classic Dark' : settings.themeName
      } as any);
      setSettings(newSettings);
      SaveSettings(newSettings).catch(() => {});
      return;
    }
    if (item === '明亮主题模式(Light)') {
      const newSettings = new models.models.AppSettings({
        ...settings,
        appThemeMode: 'light',
        themeName: (!settings.themeName || settings.themeName === 'Classic Dark' || settings.themeName === 'Tokyo Night') ? 'GitHub Light' : settings.themeName
      } as any);
      setSettings(newSettings);
      SaveSettings(newSettings).catch(() => {});
      return;
    }
    if (item === '跟随系统外观(Auto)') {
      const newSettings = new models.models.AppSettings({
        ...settings,
        appThemeMode: 'auto'
      } as any);
      setSettings(newSettings);
      SaveSettings(newSettings).catch(() => {});
      return;
    }
    if (item === '全屏(F)') { WindowToggleMaximise(); return; }
    if (item === '放大字体(=)') {
      const newSize = Math.min(settings.fontSize + 1, 36);
      setSettings(new models.models.AppSettings({ ...settings, fontSize: newSize }));
      return;
    }
    if (item === '缩小字体(-)') {
      const newSize = Math.max(settings.fontSize - 1, 8);
      setSettings(new models.models.AppSettings({ ...settings, fontSize: newSize }));
      return;
    }
    if (item === '重置字体大小(0)') {
      setSettings(new models.models.AppSettings({ ...settings, fontSize: 13 })); // default 13
      return;
    }

    // 文件
    if (item === '导入会话(I)...') { setIsImportModalOpen?.(true); return; }

    // 工具
    if (item === '选项(O)...' || item === '全局选项(O)...') { setIsSettingsOpen(true); return; }
    if (item === '导入外部会话(I)...') { setIsImportModalOpen?.(true); return; }
    if (item === '密钥管理(K)...' || item === '密钥管理器(K)...' || item === '密钥管理...' || item.includes('密钥管理')) { setIsKeyManagerOpen(true); return; }
    if (item === '认证配置管理(A)...' || item === '认证配置管理...' || item.includes('认证配置管理')) { setIsAuthManagerOpen(true); return; }
    if (item === '一键断开全部连接(D)') {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.DisconnectAllSessions) {
        appRpc.DisconnectAllSessions()
          .then(() => alert("已成功断开所有终端连接"))
          .catch((e: any) => alert("断开失败: " + e));
      }
      return;
    }
    if (item === 'SSH 端口转发与隧道监控(U)...') { setIsTunnelMonitorOpen?.(true); return; }
    if (item === '网络拓扑与隧道可视化(Topo)...') { setIsTopologyOpen?.(true); return; }
    if (item === '多主机命令对比执行(Diff)...') { setIsMultiExecDiffOpen?.(true); return; }
    if (item === 'TOTP / MFA 令牌管理(TOTP)...') { setIsTotpManagerOpen?.(true); return; }
    if (item === '批量主机健康巡检(Insp)...') { setIsInspectionModalOpen?.(true); return; }
    if (item === '运行自动化脚本(S)...') { setIsScriptRunnerOpen?.(true); return; }
    if (item === '主机性能实时监控(Activity)...') { setIsHostMonitorOpen?.(!isHostMonitorOpen); return; }
    if (item === '远程进程与服务管理(Ops)...') { setIsRemoteOpsOpen?.(true); return; }
    if (item === '远程实时日志追踪器(Tail)...') { setIsRealtimeLogOpen?.(true); return; }
    if (item === 'OmniAI 智能运维 Copilot(AI)...') {
      if (setIsAIChatDrawerOpen) {
        setIsAIChatDrawerOpen((prev: boolean) => !prev);
      } else {
        setIsAICopilotOpen?.(true);
      }
      return;
    }
    if (item === '端到端加密云同步与团队资产(Sync)...') { setIsCloudSyncOpen?.(true); return; }
    if (item === 'SOP 运维手册与交互式执行流(SOP)...' || item.includes('SOP 运维手册')) { setIsRunbookOpen?.(true); return; }
    if (item === '日志查看器(L)...') { setIsLogViewerOpen(true); return; }
    if (item === 'SFTP 文件管理器(F)') { toggleSftpPanel(); return; }
    if (item === '多行撰写窗格(P)') { setIsComposeOpen(!isComposeOpen); return; }
    if (item === '立即锁定工作区(Lock)...' || item === '锁定工作区(L)') { onLockWorkspace?.(); return; }
    if (item === '命令调色板(P)...' || item === '命令调色板 (Command Palette)...') { onOpenCommandPalette?.(); return; }
    if (item === '跨会话命令历史(H)...') { onOpenCommandHistory?.(); return; }

    // 文件 - 导入与导出 SSH Config
    if (item === '从 OpenSSH ~/.ssh/config 导入...' || item === '导入会话(I)...') { setIsImportModalOpen?.(true); return; }
    if (item === '导出为 OpenSSH ~/.ssh/config') { handleExportSSHConfig?.(); return; }

    // 查看
    if (item === 'Quake 下拉模式(Q)') {
      const appRpc = (window as any).go?.app?.App;
      if (appRpc?.ToggleQuakeWindow) {
        appRpc.ToggleQuakeWindow(settings.quakeHeightPercent || 50);
      }
      return;
    }

    // 工具 - 宏管理器 & 触发器
    if (item === '宏管理器(M)...') { setIsMacroModalOpen(true); return; }
    if (item === '触发器管理(R)...') { setIsTriggerManagerOpen?.(true); return; }

    // 查看 - 会话管理器显/隐 & 地址栏
    if (item === '会话管理器(M)') { setActiveDockPanel(activeDockPanel === 'sessions' ? 'none' : 'sessions'); return; }
    if (item === '地址栏(A)') { setSettings(new models.models.AppSettings({ ...settings, showAddressBar: !settings.showAddressBar })); return; }

    // 选项卡
    if (item === '新建选项卡(N)') { handleLocalShell(); return; }
    if (item === '克隆当前选项卡(D)' && activeTabId) { 
      const t = tabs.find(t => t.id === activeTabId);
      if (t) handleCloneTab(t);
      return; 
    }
    if (item === '拆离到独立窗口(D)' && activeTabId) {
      handleDetachTab?.(activeTabId);
      return;
    }
    if (item === '关闭其他选项卡' && activeTabId) { handleCloseOtherTabs(activeTabId); return; }
    if (item === '关闭右侧全部' && activeTabId) { handleCloseRightTabs(activeTabId); return; }
    if (item === '锁定/解锁当前选项卡(L)' && activeTabId) { toggleTabLock(activeTabId); return; }
    if (item === '重命名选项卡(R)' && activeTabId) { handleRenameTab?.(activeTabId); return; }
    if (item === '选项卡管理器(M)') { setIsTabManagerOpen?.(true); return; }
    if (item === '上一个选项卡') { handlePrevTab?.(); return; }
    if (item === '下一个选项卡') { handleNextTab?.(); return; }

    // 工具
    if (item === 'SSH 端口转发与隧道监控(U)...') { setIsTunnelMonitorOpen?.(true); return; }
    if (item === '运行自动化脚本(S)...') { setIsScriptRunnerOpen?.(true); return; }

    // 窗口
    if (item === '垂直分屏(V)') { setSplitMode('vertical'); return; }
    if (item === '水平分屏(H)') { setSplitMode('horizontal'); return; }
    if (item === '四分屏 (2x2 田字格)') { setSplitMode('grid2x2' as any); return; }
    if (item === '三分屏 (1+2 品字形)') { setSplitMode('grid1plus2' as any); return; }
    if (item === '关闭分屏') { setSplitMode('none'); return; }
    if (item === '在所有选项卡中广播输入') { setIsBroadcast(true); return; }
    if (item === '最小化窗口(M)') { WindowMinimise(); return; }
    if (item === '最大化窗口(Z)') { WindowToggleMaximise(); return; }

    // 帮助
    if (item === '快捷键参考(K)') { setIsShortcutRefOpen?.(true); return; }
  };


  const checkForUpdates = async () => {
    setIsUpdateModalOpen(true);
    setIsCheckingUpdate(true);
    try {
      const res = await CheckAppUpdate();
      if (res) {
        setUpdateResult(res);
        if (res.currentVersion) setAppVersion(res.currentVersion);
      }
    } catch (e) {
      console.warn("Backend CheckAppUpdate failed, fallback to GitHub API:", e);
      try {
        const res = await fetch('https://api.github.com/repos/leonlwq/omniterminal/releases/latest');
        if (res.ok) {
          const data = await res.json();
          setUpdateResult({
            hasUpdate: data.tag_name !== appVersion,
            currentVersion: appVersion,
            latestVersion: data.tag_name,
            releaseNotes: data.body,
            htmlUrl: data.html_url,
            targetAsset: null,
          });
        }
      } catch (err) {
        console.error("Update check failed", err);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Complete menu definitions with separators and shortcut annotations
  const menus: { label: string; id: string; items: MenuItem[] }[] = [
    { label: t('menu.file') || '文件(F)', id: 'file', items: [
      { label: '新建(N)...', shortcut: 'Ctrl+N' },
      { label: '新建本地 Shell(L)' },
      { label: '从 OpenSSH ~/.ssh/config 导入...', shortcut: 'Ctrl+I' },
      { label: '导出为 OpenSSH ~/.ssh/config' },
      { label: '', isSeparator: true },
      { label: '打开会话管理器(O)', shortcut: 'Ctrl+Alt+S' },
      { label: '', isSeparator: true },
      { label: '关闭当前标签页(C)', shortcut: 'Ctrl+W' },
      { label: '', isSeparator: true },
      { label: '另存为日志(A)...' },
      { label: '打印(P)...' },
      { label: '', isSeparator: true },
      { label: '退出(X)', shortcut: 'Ctrl+Q' },
    ]},
    { label: t('menu.editMenu') || '编辑(E)', id: 'edit', items: [
      { label: '复制(C)', shortcut: 'Ctrl+C' },
      { label: '粘贴(P)', shortcut: 'Ctrl+V' },
      { label: '全选(A)', shortcut: 'Ctrl+A' },
      { label: '查找(F)...', shortcut: 'Ctrl+F' },
      { label: '', isSeparator: true },
      { label: '清空屏幕(L)' },
      { label: '清空滚动缓冲区' },
    ]},
    { label: t('menu.view') || '查看(V)', id: 'view', items: [
      { label: '工具栏(T)' },
      { label: '地址栏(A)' },
      { label: '状态栏(S)' },
      { label: '会话管理器(M)' },
      { label: '', isSeparator: true },
      { label: '暗黑主题模式(Dark)' },
      { label: '明亮主题模式(Light)' },
      { label: '跟随系统外观(Auto)' },
      { label: '', isSeparator: true },
      { label: 'Quake 下拉模式(Q)', shortcut: 'Ctrl+`' },
      { label: '全屏(F)', shortcut: 'F11' },
      { label: '', isSeparator: true },
      { label: '放大字体(=)', shortcut: 'Ctrl+=' },
      { label: '缩小字体(-)', shortcut: 'Ctrl+-' },
      { label: '重置字体大小(0)', shortcut: 'Ctrl+0' },
    ]},
    { label: t('menu.tools') || '工具(T)', id: 'tools', items: [
      { label: '命令调色板(P)...', shortcut: 'Ctrl+P' },
      { label: '跨会话命令历史(H)...', shortcut: 'Ctrl+Shift+H' },
      { label: '选项(O)...', shortcut: 'Alt+O' },
      { label: 'OmniAI 智能运维 Copilot(AI)...', shortcut: 'Ctrl+K' },
      { label: '端到端加密云同步与团队资产(Sync)...' },
      { label: 'SOP 运维手册与交互式执行流(SOP)...', shortcut: 'Ctrl+Shift+R' },
      { label: '', isSeparator: true },
      { label: '密钥管理(K)...' },
      { label: '认证配置管理(A)...' },
      { label: '', isSeparator: true },
      { label: 'SSH 端口转发与隧道监控(U)...' },
      { label: '网络拓扑与隧道可视化(Topo)...' },
      { label: '多主机命令对比执行(Diff)...' },
      { label: 'TOTP / MFA 令牌管理(TOTP)...' },
      { label: '批量主机健康巡检(Insp)...' },
      { label: '运行自动化脚本(S)...' },
      { label: '主机性能实时监控(Activity)...' },
      { label: '远程进程与服务管理(Ops)...' },
      { label: '远程实时日志追踪器(Tail)...' },
      { label: '一键断开全部连接(D)' },
      { label: '', isSeparator: true },
      { label: '日志查看器(L)...' },
      { label: '宏管理器(M)...' },
      { label: '触发器管理(R)...' },
      { label: '', isSeparator: true },
      { label: 'SFTP 文件管理器(F)' },
      { label: '多行撰写窗格(P)' },
      { label: '', isSeparator: true },
      { label: '立即锁定工作区(Lock)...' },
    ]},
    { label: t('menu.tabs') || '选项卡(B)', id: 'tabs', items: [
      { label: '新建选项卡(N)', shortcut: 'Ctrl+T' },
      { label: '克隆当前选项卡(D)' },
      { label: '拆离到独立窗口(D)', shortcut: 'Ctrl+Shift+D' },
      { label: '', isSeparator: true },
      { label: '关闭当前选项卡(C)', shortcut: 'Ctrl+W' },
      { label: '关闭其他选项卡' },
      { label: '关闭右侧全部' },
      { label: '', isSeparator: true },
      { label: '锁定/解锁当前选项卡(L)' },
      { label: '重命名选项卡(R)' },
      { label: '', isSeparator: true },
      { label: '选项卡管理器(M)' },
      { label: '', isSeparator: true },
      { label: '上一个选项卡', shortcut: 'Ctrl+Shift+Tab' },
      { label: '下一个选项卡', shortcut: 'Ctrl+Tab' },
    ]},
    { label: t('menu.window') || '窗口(W)', id: 'window', items: [
      { label: '垂直分屏(V)' },
      { label: '水平分屏(H)' },
      { label: '四分屏 (2x2 田字格)' },
      { label: '三分屏 (1+2 品字形)' },
      { label: '关闭分屏' },
      { label: '', isSeparator: true },
      { label: '在所有选项卡中广播输入' },
      { label: '', isSeparator: true },
      { label: '最小化窗口(M)', shortcut: 'Cmd+M' },
      { label: '最大化窗口(Z)' },
    ]},
    { label: t('menu.help') || '帮助(H)', id: 'help', items: [
      { label: '在线文档(D)' },
      { label: '报告问题(R)' },
      { label: '', isSeparator: true },
      { label: '快捷键参考(K)' },
      { label: '', isSeparator: true },
      { label: '关于 OmniTerminal(A)...' },
      { label: '检查更新(U)...' },
    ]},
  ];

  // Keyboard navigation for menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeMenu && e.key === 'Escape') {
        setActiveMenu(null);
        setMenuSearch('');
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeMenu]);

  return (
    <header className="flex flex-col bg-app-toolbar border-b border-app-border z-30 shrink-0 text-app-text select-none">
      {/* 现代一体化 Unified Command Center 顶栏 */}
      <div 
        className={`wails-drag flex items-center justify-between ${isMac ? 'pl-[76px]' : 'pl-3'} pr-3 h-[42px] min-h-[42px] bg-app-toolbar relative select-none`}
        style={{
          height: 42,
          minHeight: 42,
          '--wails-draggable': 'drag',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.wails-no-drag') || target.closest('button') || target.closest('input') || target.closest('form')) {
            return;
          }
          WindowToggleMaximise();
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const target = e.target as HTMLElement;
          if (target.closest('.wails-no-drag') || target.closest('button') || target.closest('input') || target.closest('form')) {
            return;
          }
          if ((window as any).wails?.flags) {
            (window as any).wails.flags.shouldDrag = true;
          }
        }}
      >
        {/* 左侧：Logo、应用主菜单、快速新建 */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* OmniTerminal 品牌 Logo (Squircle 微晶质感，支持窗口拖拽) */}
          <div 
            className="wails-drag flex items-center space-x-2 pr-2.5 border-r border-white/[0.08] cursor-default"
            style={{ '--wails-draggable': 'drag', WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <img 
              src={appIcon} 
              alt="OmniTerminal" 
              className="w-[22px] h-[22px] object-contain drop-shadow-sm pointer-events-none select-none" 
            />
            <span className="text-[12px] font-semibold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-200 to-indigo-200 bg-clip-text text-transparent pointer-events-none select-none">
              OmniTerminal
            </span>
          </div>

          {/* 应用主菜单 (净化 Windows 助记符，Mac 风格柔和微胶囊) */}
          <div 
            ref={menuRef} 
            className="wails-no-drag flex items-center space-x-0.5"
            style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {menus.map((menu) => (
              <div key={menu.id} className="relative">
                <button
                  className={`px-2.5 py-1 text-[12.5px] font-medium transition-all duration-150 rounded-lg outline-none active:scale-95 ${
                    activeMenu === menu.id
                      ? 'bg-app-accent/15 text-app-accent ring-1 ring-app-accent/30 shadow-sm'
                      : 'text-app-text hover:bg-app-hover'
                  }`}
                  onClick={() => {
                    if (activeMenu === menu.id) {
                      setActiveMenu(null);
                      setMenuSearch('');
                    } else {
                      setActiveMenu(menu.id);
                      setMenuSearch('');
                    }
                  }}
                  onMouseEnter={() => {
                    if (activeMenu && activeMenu !== menu.id) {
                      setActiveMenu(menu.id);
                      setMenuSearch('');
                    }
                  }}
                >
                  {displayMenuLabel(menu.label)}
                </button>
                {activeMenu === menu.id && (
                  <div className="absolute top-full left-0 mt-1.5 bg-app-surface/95 border border-app-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)] rounded-2xl p-1.5 z-50 min-w-[260px] max-w-[340px] backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                    {/* IDEA 风格即时搜索栏 (当菜单项较多时展示) */}
                    {menu.items.length > 6 && (
                      <div className="px-1.5 pt-1 pb-1.5 border-b border-app-border mb-1">
                        <div className="relative flex items-center">
                          <Search className="absolute left-2.5 w-3.5 h-3.5 text-app-text-muted pointer-events-none" />
                          <input
                            type="text"
                            placeholder={t('toolbar.menuSearchPlaceholder')}
                            value={menuSearch}
                            onChange={(e) => setMenuSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-8 pr-6 py-1.5 text-[12px] bg-app-input border border-app-border rounded-xl focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 text-app-text placeholder:text-app-text-muted shadow-inner"
                            autoFocus
                          />
                          {menuSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuSearch('');
                              }}
                              className="absolute right-2 p-0.5 text-app-text-muted hover:text-app-text rounded-full hover:bg-app-hover"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="max-h-[65vh] overflow-y-auto space-y-0.5 pr-0.5">
                      {menu.items
                        .filter(item => {
                          if (!menuSearch) return true;
                          if (item.isSeparator) return false;
                          const query = menuSearch.toLowerCase().trim();
                          return item.label.toLowerCase().includes(query) || (item.shortcut && item.shortcut.toLowerCase().includes(query));
                        })
                        .map((item, j) =>
                          item.isSeparator ? (
                            <div key={j} className="h-px bg-app-border mx-2 my-1" />
                          ) : (
                            <button
                              key={j}
                              onClick={() => {
                                handleMenuClick(item.label);
                                setActiveMenu(null);
                                setMenuSearch('');
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-[12.5px] text-app-text hover:bg-app-active hover:text-white dark:hover:text-white rounded-md transition-all duration-100 flex items-center justify-between group active:scale-[0.99]"
                            >
                              <div className="flex items-center space-x-2.5 truncate">
                                <span className="w-4 h-4 flex items-center justify-center shrink-0 text-app-text-muted group-hover:text-app-accent">
                                  {getMenuItemIcon(item.label)}
                                </span>
                                <span className="truncate">{displayMenuLabel(item.label)}</span>
                              </div>
                              {item.shortcut && (
                                <span className="text-[11px] font-mono text-app-text-muted group-hover:text-blue-200 ml-4 shrink-0 tracking-wider">
                                  {formatMacShortcut(item.shortcut)}
                                </span>
                              )}
                            </button>
                          )
                        )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 新建连接快捷胶囊 - 现代 VS Code 风格微圆角 */}
          <div 
            className="wails-no-drag flex items-center bg-app-surface border border-app-border rounded-lg p-0.5 space-x-1 shadow-sm ml-1"
            style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => {
                resetSessionFormData();
                setModalMode('create');
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1 bg-app-accent hover:bg-app-accent-hover text-white text-[12.5px] font-medium rounded-md transition-colors h-7"
              title={isMac ? (t('toolbar.newSessionShortcutMac') || "新建会话 (⌘N)") : (t('toolbar.newSessionShortcutWin') || "新建会话 (Ctrl+N)")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('toolbar.new') || '新建'}</span>
            </button>
            <button
              onClick={handleLocalShell}
              className="p-1 hover:bg-app-hover text-app-text-muted hover:text-app-text transition-colors rounded-md h-7 w-7 flex items-center justify-center"
              title={t('toolbar.newLocalShell') || "新建本地终端"}
            >
              <TerminalSquare className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 中间：居中 Command Center (VS Code 顶栏搜索栏风格) */}
        <div className="flex-1 max-w-lg mx-3 flex items-center justify-center shrink h-full">
          <form
            onSubmit={handleQuickConnect}
            className="wails-no-drag relative flex items-center w-full bg-app-input hover:bg-app-hover/50 focus-within:bg-app-input border border-app-border hover:border-app-border-subtle focus-within:border-app-accent focus-within:ring-1 focus-within:ring-app-accent rounded-lg px-3 py-1 h-[30px] transition-all shadow-inner"
            style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div className="text-app-accent flex items-center mr-2">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              list="quickConnectHistoryList"
              placeholder={t('toolbar.quickConnectPlaceholder') || "快速直连：ssh://user@host:port (Enter)"}
              value={quickConnectInput}
              onChange={(e) => setQuickConnectInput(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent text-[12.5px] text-app-text placeholder:text-app-text-muted focus:outline-none font-mono"
            />
            {quickConnectInput ? (
              <button
                type="button"
                onClick={() => setQuickConnectInput('')}
                className="p-0.5 text-app-text-muted hover:text-rose-500 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-app-text-muted bg-app-surface border border-app-border rounded">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
            )}
          </form>
        </div>

        {/* 右侧：系统控制中枢 (VS Code 规整化微圆角按钮群组) */}
        <div 
          className="wails-no-drag flex items-center space-x-1.5 shrink-0"
          style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* 串口状态标识 (如果有) */}
          {isSerial && (
            <div className="flex items-center space-x-1 px-2 py-0.5 mr-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px]">
              <span className="text-yellow-400 font-mono font-bold">
                🔌 {activeTab?.serialConfig?.port || activeTab?.host} ({activeTab?.serialConfig?.baudRate || 115200})
              </span>
              <button
                onClick={toggleDTR}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                  dtrState ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'text-app-text-muted'
                }`}
                title={t('toolbar.toggleDTR') || "切换 DTR"}
              >
                DTR
              </button>
              <button
                onClick={toggleRTS}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                  rtsState ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'text-app-text-muted'
                }`}
                title={t('toolbar.toggleRTS') || "切换 RTS"}
              >
                RTS
              </button>
              <button
                onClick={triggerBreak}
                className="px-1.5 py-0.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded text-[9px]"
                title={t('toolbar.sendBreak') || "发送 Break 脉冲"}
              >
                ⚡Break
              </button>
            </div>
          )}

          {/* 分屏快捷切换 */}
          <div className="flex items-center bg-app-surface border border-app-border rounded-md p-0.5 space-x-0.5 shadow-sm">
            <button
              onClick={() => {
                if (splitMode === 'vertical') {
                  setSplitMode('none');
                } else {
                  if (tabs.length < 2 && handleCloneTab && activeTab) {
                    handleCloneTab(activeTab);
                  }
                  setSplitMode('vertical');
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                splitMode === 'vertical' ? 'bg-app-accent text-white shadow-sm' : 'text-app-text-muted hover:text-app-text hover:bg-app-hover'
              }`}
              title={t('toolbar.splitVertical') || "垂直左右分屏"}
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setSplitMode(splitMode === 'grid2x2' ? 'none' : ('grid2x2' as any))}
              className={`p-1.5 rounded transition-colors ${
                splitMode === 'grid2x2' ? 'bg-app-accent text-white shadow-sm' : 'text-app-text-muted hover:text-app-text hover:bg-app-hover'
              }`}
              title={t('toolbar.splitGrid') || "四分屏 (2x2 田字格)"}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* OmniAI 智能运维 Copilot (幻彩极客渐变胶囊) */}
          <button
            onClick={() => {
              if (setIsAIChatDrawerOpen) {
                setIsAIChatDrawerOpen((prev: boolean) => !prev);
              } else {
                setIsAICopilotOpen?.(true);
              }
            }}
            className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 text-xs font-semibold text-white transition-all duration-200 active:scale-95 cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 border-purple-400/50 hover:border-purple-300 shadow-[0_0_14px_rgba(147,51,234,0.45)] hover:shadow-[0_0_20px_rgba(147,51,234,0.65)] ${
              isAIChatDrawerOpen ? 'ring-2 ring-purple-300 shadow-[0_0_22px_rgba(168,85,247,0.8)] scale-[1.02]' : ''
            }`}
            title={t('toolbar.aiCopilot') || "唤起 OmniAI 智能运维对话侧边栏 (Cmd+L / Ctrl+L)"}
          >
            <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
            <span className="tracking-wide">OmniAI</span>
          </button>

          {/* 核心控制池 (工具箱、主题、锁屏、设置) */}
          <div className="flex items-center bg-app-surface border border-app-border rounded-md p-0.5 space-x-0.5 shadow-sm">
            <div className="relative">
            <button
              onClick={() => setPopover(popover === 'toolbox' ? null : 'toolbox')}
              className={`p-1.5 rounded-md transition-colors flex items-center space-x-1 ${
                popover === 'toolbox' ? 'bg-app-accent text-white shadow-sm' : 'text-app-text-muted hover:text-app-text hover:bg-app-hover'
              }`}
              title={t('toolbar.toolbox') || "实用工具箱 (运维、监控、宏录制与视图)"}
            >
              <Wrench className="h-3.5 w-3.5" />
              <ChevronDown className="h-2 w-2 opacity-60" />
            </button>

            {popover === 'toolbox' && (
              <div
                ref={popoverRef}
                className="absolute top-full right-0 mt-2 bg-app-surface/95 border border-app-border/80 shadow-2xl rounded-2xl p-2.5 z-50 w-72 backdrop-blur-xl ring-1 ring-white/[0.08] animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[10px] font-semibold text-app-text-muted px-2 py-1 uppercase tracking-wider">
                  {t('toolbar.toolboxMonitorOps') || '监控与运维'}
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <button
                    onClick={() => {
                      setIsGlobalSearchOpen(true);
                      setPopover(null);
                    }}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 text-blue-400" />
                    <span>{t('toolbar.toolboxGlobalSearch')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsHostMonitorOpen?.(!isHostMonitorOpen);
                      setPopover(null);
                    }}
                    disabled={!activeTabId}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-40"
                  >
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{t('toolbar.toolboxPerformance')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsRemoteOpsOpen?.(true);
                      setPopover(null);
                    }}
                    disabled={!activeTabId}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-40"
                  >
                    <Server className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{t('toolbar.toolboxOps')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsTopologyOpen?.(true);
                      setPopover(null);
                    }}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5 text-purple-400" />
                    <span>{t('toolbar.toolboxTopology')}</span>
                  </button>
                </div>

                <div className="h-px bg-app-border my-1" />
                <div className="text-[10px] font-semibold text-app-text-muted px-2 py-1 uppercase tracking-wider">
                  {t('toolbar.toolboxBatchSecurity') || '批量与安全工具'}
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <button
                    onClick={() => {
                      setIsMultiExecDiffOpen?.(true);
                      setPopover(null);
                    }}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Columns className="h-3.5 w-3.5 text-amber-400" />
                    <span>{t('toolbar.toolboxDiff')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsTotpManagerOpen?.(true);
                      setPopover(null);
                    }}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-yellow-400" />
                    <span>{t('toolbar.toolboxTotp')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsInspectionModalOpen?.(true);
                      setPopover(null);
                    }}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                    <span>{t('toolbar.toolboxInspection')}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (activeTabId) {
                        const termEl = document.querySelector(`[data-tab-id="${activeTabId}"] canvas`) as HTMLCanvasElement;
                        if (termEl) {
                          const link = document.createElement('a');
                          link.download = `terminal_${Date.now()}.png`;
                          link.href = termEl.toDataURL('image/png');
                          link.click();
                        }
                      }
                      setPopover(null);
                    }}
                    disabled={!activeTabId}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] text-app-text hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-40"
                  >
                    <Camera className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{t('toolbar.toolboxSnapshot')}</span>
                  </button>
                </div>

                <div className="h-px bg-app-border my-1" />
                <div className="flex items-center justify-between px-2 py-1">
                  <button
                    onClick={() => {
                      if (isRecordingMacro) stopRecordingMacro?.();
                      else startRecordingMacro?.();
                      setPopover(null);
                    }}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] transition-colors ${
                      isRecordingMacro ? 'text-red-400 bg-red-500/20' : 'text-app-text hover:bg-app-hover'
                    }`}
                  >
                    {isRecordingMacro ? <Square className="h-3 w-3" /> : <Circle className="h-3 w-3 text-red-500" />}
                    <span>{isRecordingMacro ? t('toolbar.toolboxStopMacro') : t('toolbar.toolboxRecordMacro')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPopover('opacity');
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] text-app-text hover:bg-app-hover transition-colors"
                  >
                    <SlidersHorizontal className="h-3 w-3 text-blue-400" />
                    <span>{t('toolbar.toolboxOpacity')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPopover('lang');
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] text-app-text hover:bg-app-hover transition-colors"
                  >
                    <Languages className="h-3 w-3 text-cyan-400" />
                    <span>{t('toolbar.toolboxLanguage')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 外观主题模式切换 Popover */}
          <div className="relative">
            <button
              onClick={() => setPopover(popover === 'theme' ? null : 'theme')}
              className={`p-1.5 rounded-full transition-colors ${
                popover === 'theme' ? 'bg-app-accent/20 text-app-accent shadow-sm' : 'text-app-text-muted hover:text-app-text hover:bg-app-hover'
              }`}
              title={t('toolbar.themeToggleTooltip') || "切换界面外观主题 (Dark / Light / System)"}
            >
              {((settings as any).appThemeMode === 'light' || (!(settings as any).appThemeMode && settings.themeName?.includes('Light'))) ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (settings as any).appThemeMode === 'auto' ? (
                <Laptop className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
              )}
            </button>
            {popover === 'theme' && (
              <div
                ref={popoverRef}
                className="absolute top-full right-0 mt-2 bg-app-surface/95 border border-app-border/80 shadow-2xl rounded-2xl p-1.5 z-50 flex flex-col space-y-0.5 w-36 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/[0.08] animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => {
                    const newSettings = new models.models.AppSettings({
                      ...settings,
                      appThemeMode: 'dark',
                      themeName: (settings.themeName === 'GitHub Light' || settings.themeName === 'Classic Light' || settings.themeName === 'Solarized Light') ? 'Classic Dark' : settings.themeName
                    } as any);
                    setSettings(newSettings);
                    SaveSettings(newSettings).catch(() => {});
                    setPopover(null);
                  }}
                  className={`text-left px-2.5 py-1.5 text-[11px] rounded-xl flex items-center space-x-2 transition-colors ${
                    ((settings as any).appThemeMode === 'dark' || !(settings as any).appThemeMode) ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-app-text hover:bg-app-hover'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{t('toolbar.themeDark')}</span>
                </button>
                <button
                  onClick={() => {
                    const newSettings = new models.models.AppSettings({
                      ...settings,
                      appThemeMode: 'light',
                      themeName: (!settings.themeName || settings.themeName === 'Classic Dark' || settings.themeName === 'Tokyo Night') ? 'GitHub Light' : settings.themeName
                    } as any);
                    setSettings(newSettings);
                    SaveSettings(newSettings).catch(() => {});
                    setPopover(null);
                  }}
                  className={`text-left px-2.5 py-1.5 text-[11px] rounded-xl flex items-center space-x-2 transition-colors ${
                    (settings as any).appThemeMode === 'light' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-app-text hover:bg-app-hover'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>{t('toolbar.themeLight')}</span>
                </button>
                <button
                  onClick={() => {
                    const newSettings = new models.models.AppSettings({
                      ...settings,
                      appThemeMode: 'auto',
                    } as any);
                    setSettings(newSettings);
                    SaveSettings(newSettings).catch(() => {});
                    setPopover(null);
                  }}
                  className={`text-left px-2.5 py-1.5 text-[11px] rounded-xl flex items-center space-x-2 transition-colors ${
                    (settings as any).appThemeMode === 'auto' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-app-text hover:bg-app-hover'
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5 text-blue-400" />
                  <span>{t('toolbar.themeAuto')}</span>
                </button>
              </div>
            )}
          </div>

          {/* 立即锁定工作区 */}
          <button
            onClick={() => onLockWorkspace?.()}
            className="p-1.5 text-app-text-muted hover:text-amber-500 hover:bg-app-hover rounded-full transition-colors"
            title={t('toolbar.lockWorkspace') || "立即锁定工作区 (Lock)"}
          >
            <Lock className="h-3.5 w-3.5" />
          </button>

          {/* 偏好设置 */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-hover rounded-full transition-colors"
            title={isMac ? ((t('toolbar.preferences') || "偏好设置") + " (⌘,)") : ((t('toolbar.preferences') || "偏好设置") + " (Alt+O / Ctrl+,)")}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 语言切换浮层 (由工具箱激活) */}
        {popover === 'lang' && (
          <div
            ref={popoverRef}
            className="absolute top-full right-16 mt-2 bg-app-surface/95 border border-app-border/80 shadow-2xl rounded-2xl p-1.5 z-50 flex flex-col space-y-0.5 w-32 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/[0.08] animate-in fade-in zoom-in-95 duration-100"
          >
            {[
              { code: 'zh-CN', label: '简体中文' },
              { code: 'en-US', label: 'English' },
              { code: 'ja-JP', label: '日本語' },
              { code: 'ko-KR', label: '한국어' }
            ].map(item => (
              <button
                key={item.code}
                onClick={() => {
                  setLang(item.code);
                  setPopover(null);
                  const updated = new models.models.AppSettings({
                    ...settings,
                    language: item.code
                  } as any);
                  setSettings(updated);
                  SaveSettings(updated).catch(() => {});
                }}
                className={`text-left px-2.5 py-1.5 text-[11px] rounded-xl transition-colors ${
                  lang === item.code ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-app-text hover:bg-app-hover'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* 终端与窗口透明度浮层 (由工具箱激活) */}
        {popover === 'opacity' && (
          <div
            ref={popoverRef}
            className="absolute top-full right-16 mt-2 bg-app-surface/95 border border-app-border/80 shadow-2xl rounded-2xl p-3.5 z-50 flex flex-col space-y-3 w-60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/[0.08] animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <span className="text-[11px] font-semibold text-app-text flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                {t('toolbar.transparencyAndRender') || '透明度与渲染'}
              </span>
            </div>

            {/* 终端背景不透明度 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-app-text-muted">{t('toolbar.termBgOpacity')}</span>
                <span className="text-blue-400 font-semibold">{Math.round((settings.terminalOpacity ?? 1.0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.terminalOpacity ?? 1.0}
                onChange={(e) => {
                  const newSettings = new models.models.AppSettings({
                    ...settings,
                    terminalOpacity: Number(e.target.value)
                  } as any);
                  setSettings(newSettings);
                  SaveSettings(newSettings).catch(() => {});
                }}
                className="w-full h-1 bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* 窗口全局不透明度 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-app-text-muted">{t('toolbar.windowOpacity')}</span>
                <span className="text-blue-400 font-semibold">{Math.round((settings.windowOpacity ?? 1.0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.windowOpacity ?? 1.0}
                onChange={(e) => {
                  const newSettings = new models.models.AppSettings({
                    ...settings,
                    windowOpacity: Number(e.target.value)
                  } as any);
                  setSettings(newSettings);
                  SaveSettings(newSettings).catch(() => {});
                }}
                className="w-full h-1 bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* 毛玻璃磨砂效果 */}
            <label className="flex items-center space-x-2 pt-2 border-t border-white/[0.08] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.enableBlur || false}
                onChange={(e) => {
                  const newSettings = new models.models.AppSettings({
                    ...settings,
                    enableBlur: e.target.checked
                  } as any);
                  setSettings(newSettings);
                  SaveSettings(newSettings).catch(() => {});
                }}
                className="rounded-md border-white/20 bg-app-input text-blue-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-[11px] text-app-text">{t('toolbar.acrylicBlur')}</span>
            </label>
          </div>
        )}
      </div>
    </div>

      {popover && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPopover(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setPopover(null);
          }}
        />
      )}

      <MacroManagerModal
        isOpen={isMacroModalOpen}
        onClose={() => setIsMacroModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        isChecking={isCheckingUpdate}
        updateResult={updateResult}
        currentVersion={appVersion}
      />

      <PrintTerminalModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        activeTab={activeTab || null}
        getLines={() => (activeTabId && terminalBuffers[activeTabId] ? terminalBuffers[activeTabId]() : [])}
        terminal={activeTabId ? activeTerminals[activeTabId] : null}
      />
    </header>
  );
}

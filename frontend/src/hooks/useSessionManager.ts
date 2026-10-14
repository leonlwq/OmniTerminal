import { useState, useCallback } from 'react';
import { app, models } from '../../wailsjs/go/models';
import { GetSessions, SaveSession, DeleteSession } from '../../wailsjs/go/app/App';
import { useI18n } from '../i18n/I18nContext';

// 级联继承解析函数：当会话未显式指定属性时，递归向上查找父级目录的默认继承配置
export function resolveEffectiveSessionConfig(session: app.SessionConfig, allSessions: app.SessionConfig[]): app.SessionConfig {
  if (!session) return session;
  if (!session.parentId) return new app.SessionConfig(session);

  // 递归收集从直接父目录到根目录的祖先链路
  const ancestors: app.SessionConfig[] = [];
  let currentParentId = session.parentId;
  let depth = 0;
  while (currentParentId && depth < 20) {
    depth++;
    const parent = allSessions.find((s: any) => s.id === currentParentId);
    if (!parent) break;
    ancestors.push(parent);
    currentParentId = parent.parentId;
  }

  if (ancestors.length === 0) return new app.SessionConfig(session);

  const resolved = { ...session };

  // 逐级继承祖先目录配置（祖先越近优先级越高）
  for (const ancestor of ancestors) {
    if (!resolved.user && ancestor.user) resolved.user = ancestor.user;
    if ((!resolved.port || resolved.port === 22) && ancestor.port && ancestor.port !== 22) resolved.port = ancestor.port;
    if (!resolved.authProfileId && ancestor.authProfileId) resolved.authProfileId = ancestor.authProfileId;
    if (!resolved.identityKeyId && ancestor.identityKeyId) resolved.identityKeyId = ancestor.identityKeyId;
    if (!resolved.password && ancestor.password) resolved.password = ancestor.password;
    if (!resolved.privateKey && ancestor.privateKey) resolved.privateKey = ancestor.privateKey;
    if (!resolved.jumpHostSessionId && ancestor.jumpHostSessionId) resolved.jumpHostSessionId = ancestor.jumpHostSessionId;
    if ((!resolved.encoding || resolved.encoding === 'utf-8') && ancestor.encoding && ancestor.encoding !== 'utf-8') resolved.encoding = ancestor.encoding;
    if (!resolved.overrideTheme && ancestor.overrideTheme) resolved.overrideTheme = ancestor.overrideTheme;
    if ((!resolved.overrideFontSize || resolved.overrideFontSize === 0) && ancestor.overrideFontSize) resolved.overrideFontSize = ancestor.overrideFontSize;
    if ((!resolved.overrideLineHeight || resolved.overrideLineHeight === 0) && ancestor.overrideLineHeight) resolved.overrideLineHeight = ancestor.overrideLineHeight;
    if ((!resolved.overrideTerminalPadding || resolved.overrideTerminalPadding === 0) && ancestor.overrideTerminalPadding) resolved.overrideTerminalPadding = ancestor.overrideTerminalPadding;
    if ((!resolved.overrideEnableLigatures || resolved.overrideEnableLigatures === 0) && ancestor.overrideEnableLigatures) resolved.overrideEnableLigatures = ancestor.overrideEnableLigatures;
    if ((!(resolved as any).overrideCharSendDelayMs || (resolved as any).overrideCharSendDelayMs === 0) && (ancestor as any).overrideCharSendDelayMs) (resolved as any).overrideCharSendDelayMs = (ancestor as any).overrideCharSendDelayMs;
    if ((!(resolved as any).overrideLineSendDelayMs || (resolved as any).overrideLineSendDelayMs === 0) && (ancestor as any).overrideLineSendDelayMs) (resolved as any).overrideLineSendDelayMs = (ancestor as any).overrideLineSendDelayMs;
    if (!resolved.termType && ancestor.termType) resolved.termType = ancestor.termType;
    if (!resolved.backgroundImage && ancestor.backgroundImage) {
      resolved.backgroundImage = ancestor.backgroundImage;
      resolved.backgroundOpacity = ancestor.backgroundOpacity;
      resolved.backgroundBlur = ancestor.backgroundBlur;
      resolved.backgroundFit = ancestor.backgroundFit;
    }
  }

  return new app.SessionConfig(resolved);
}

export function useSessionManager(onLoadSessions?: (res: app.SessionConfig[]) => void) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<app.SessionConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [sessionModalTab, setSessionModalTab] = useState<'connection' | 'auth' | 'terminal' | 'appearance' | 'tunnel' | 'audit'>('connection');
  const [formData, setFormData] = useState<Partial<app.SessionConfig>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sessionContextMenu, setSessionContextMenu] = useState<{ x: number; y: number; session: app.SessionConfig } | null>(null);
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(() => {
    GetSessions()
      .then((res) => {
        if (res) {
          setSessions(res);
          if (onLoadSessions) onLoadSessions(res);
        }
      })
      .catch((err) => {
        console.error("加载会话列表失败:", err);
      });
  }, [onLoadSessions]);

  const handleCloneSessionConfig = useCallback((session: app.SessionConfig) => {
    if (session.isFolder) return;
    const newId = 'sess_' + Date.now();
    const cloned = new app.SessionConfig({
      ...session,
      id: newId,
      name: `${session.name} - ${t('session.cloneSuffix') || '副本'}`
    });

    SaveSession(cloned)
      .then(() => loadSessions())
      .catch((err) => alert(t('session.cloneFailed') + (err.message || err)));
  }, [loadSessions, t]);

  const handleSessionDrop = useCallback((targetId: string) => {
    if (!draggedSessionId || draggedSessionId === targetId) return;

    const draggedConfig = sessions.find((s: any) => s.id === draggedSessionId);
    const targetConfig = sessions.find((s: any) => s.id === targetId);
    if (!draggedConfig || !targetConfig) return;

    if (draggedConfig.isFolder) {
      let tempParentId = targetConfig.parentId;
      while (tempParentId) {
        if (tempParentId === draggedConfig.id) {
          alert(t('session.cannotDropParentToChild'));
          return;
        }
        const parent = sessions.find((s: any) => s.id === tempParentId);
        tempParentId = parent ? parent.parentId : '';
      }
    }

    let newParentId = '';
    if (targetConfig.isFolder) {
      newParentId = targetConfig.id;
    } else {
      newParentId = targetConfig.parentId || '';
    }

    const updated = new app.SessionConfig({
      ...draggedConfig,
      parentId: newParentId
    });

    SaveSession(updated)
      .then(() => loadSessions())
      .catch((err) => alert(t('session.moveFailed') + (err.message || err)));

    setDraggedSessionId(null);
  }, [draggedSessionId, sessions, loadSessions, t]);

  const resetSessionFormData = useCallback((parentId = '') => {
    setFormData({
      id: '',
      name: '',
      isFolder: false,
      parentId: parentId,
      host: '',
      port: 22,
      user: '',
      password: '',
      privateKey: '',
      loginScripts: [],
      triggers: [],
      overrideTheme: '',
      overrideFontSize: 0,
      logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
      tunnels: [],
      overrideScrollback: 0,
      overrideCursorStyle: '',
      overrideCursorBlink: 0,
      overrideEnableBell: 0,
      overrideCopyOnSelect: 0,
      encoding: 'utf-8',
      jumpHostSessionId: '',
      overrideTerminalOpacity: 0,
      colorLabel: '',
      tags: []
    } as any);
    setSessionModalTab('connection');
  }, [onLoadSessions]);

  const resetFolderFormData = useCallback((parentId = '') => {
    setFormData({
      id: '',
      name: '',
      isFolder: true,
      parentId: parentId,
      loginScripts: [],
      tags: []
    } as any);
  }, [onLoadSessions]);

  const handleSaveSession = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert(t('session.pleaseInputName'));
      return;
    }
    const isSerial = formData.protocol === 'serial';
    const isLocal = formData.protocol === 'local' || formData.isLocal;
    const isRawTcp = formData.protocol === 'raw_tcp';

    if (!formData.isFolder && !isSerial && !isLocal && !isRawTcp && (!formData.host || !formData.user)) {
      alert(t('session.pleaseInputHostUser'));
      return;
    }

    const sessionToSave = new app.SessionConfig({
      id: formData.id || 'sess_' + Date.now(),
      name: formData.name,
      isFolder: !!formData.isFolder,
      parentId: formData.parentId || '',
      host: formData.isFolder ? '' : (formData.host || ''),
      port: formData.isFolder ? 0 : (Number(formData.port) || 22),
      user: formData.isFolder ? '' : (formData.user || ''),
      password: formData.password || '',
      privateKey: formData.privateKey || '',
      loginScripts: formData.loginScripts || [],
      triggers: formData.triggers || [],
      overrideTheme: formData.overrideTheme || '',
      overrideFontSize: Number(formData.overrideFontSize) || 0,
      logConfig: formData.logConfig || { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
      tunnels: formData.tunnels || [],
      overrideScrollback: Number(formData.overrideScrollback) || 0,
      overrideCursorStyle: formData.overrideCursorStyle || '',
      overrideCursorBlink: Number(formData.overrideCursorBlink) || 0,
      overrideEnableBell: Number(formData.overrideEnableBell) || 0,
      overrideCopyOnSelect: Number(formData.overrideCopyOnSelect) || 0,
      encoding: formData.encoding || 'utf-8',
      jumpHostSessionId: formData.jumpHostSessionId || '',
      overrideTerminalOpacity: Number(formData.overrideTerminalOpacity) || 0,
      colorLabel: formData.colorLabel || '',
      identityKeyId: formData.identityKeyId || '',
      authProfileId: formData.authProfileId || '',
      tags: (formData as any).tags || [],
      protocol: formData.protocol || 'ssh',
      serialConfig: formData.serialConfig,
      moshServerPath: (formData as any).moshServerPath || 'mosh-server',
      moshPortRange: (formData as any).moshPortRange || '60000:61000',
      moshPredictMode: (formData as any).moshPredictMode || 'adaptive',
      webUrl: (formData as any).webUrl || '',
    } as any);

    SaveSession(sessionToSave)
      .then(() => {
        loadSessions();
        setIsModalOpen(false);
      })
      .catch(err => alert(t('session.saveFailed') + err));
  }, [formData, loadSessions, t]);

  const handleEditSession = useCallback((session: app.SessionConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormData({
      ...session,
      loginScripts: session.loginScripts || [],
      triggers: session.triggers || [],
      overrideTheme: session.overrideTheme || '',
      overrideFontSize: session.overrideFontSize || 0,
      logConfig: session.logConfig || { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
      tunnels: session.tunnels || [],
      overrideScrollback: session.overrideScrollback || 0,
      overrideCursorStyle: session.overrideCursorStyle || '',
      overrideCursorBlink: session.overrideCursorBlink || 0,
      overrideEnableBell: session.overrideEnableBell || 0,
      overrideCopyOnSelect: session.overrideCopyOnSelect || 0,
      encoding: session.encoding || 'utf-8',
      jumpHostSessionId: session.jumpHostSessionId || '',
      overrideTerminalOpacity: session.overrideTerminalOpacity || 0,
      colorLabel: session.colorLabel || '',
      identityKeyId: session.identityKeyId || '',
      authProfileId: session.authProfileId || '',
      tags: (session as any).tags || [],
    } as any);
    setSessionModalTab('connection');
    setModalMode('edit');
    setIsModalOpen(true);
  }, [onLoadSessions]);

  const handleDeleteSession = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const hasChildren = sessions.some((s: any) => s.parentId === id);
    if (hasChildren) {
      alert(t('session.folderHasChildren'));
      return;
    }
    setDeleteConfirmId(id);
  }, [sessions, t]);

  const confirmDeleteSession = useCallback(() => {
    if (!deleteConfirmId) return;
    DeleteSession(deleteConfirmId)
      .then(() => {
        loadSessions();
        setDeleteConfirmId(null);
      })
      .catch(err => {
        alert(t('session.deleteFailed') + err);
        setDeleteConfirmId(null);
      });
  }, [deleteConfirmId, loadSessions, t]);

  return {
    sessions,
    setSessions,
    searchQuery,
    setSearchQuery,
    expandedFolders,
    setExpandedFolders,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    setModalMode,
    sessionModalTab,
    setSessionModalTab,
    formData,
    setFormData,
    deleteConfirmId,
    setDeleteConfirmId,
    sessionContextMenu,
    setSessionContextMenu,
    draggedSessionId,
    setDraggedSessionId,
    loadSessions,
    handleCloneSessionConfig,
    handleSessionDrop,
    resetSessionFormData,
    resetFolderFormData,
    handleSaveSession,
    handleEditSession,
    handleDeleteSession,
    confirmDeleteSession
  };
}

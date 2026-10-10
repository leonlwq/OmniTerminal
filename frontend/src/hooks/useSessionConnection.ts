import { useState, useCallback } from 'react';
import { WriteSSH } from '../../wailsjs/go/app/App';
import { app } from '../../wailsjs/go/models';
import { resolveEffectiveSessionConfig } from './useSessionManager';

interface UseSessionConnectionOptions {
  sessions: app.SessionConfig[];
  authProfiles: any[];
  openTabs: app.SessionConfig[];
  setOpenTabs: React.Dispatch<React.SetStateAction<app.SessionConfig[]>>;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  linkedTabIds: string[];
  isBroadcast: boolean;
  setQuickCmd: React.Dispatch<React.SetStateAction<string>>;
}

export function useSessionConnection({
  sessions,
  authProfiles,
  openTabs,
  setOpenTabs,
  activeTabId,
  setActiveTabId,
  linkedTabIds,
  isBroadcast,
  setQuickCmd,
}: UseSessionConnectionOptions) {
  // 文件夹批量连接确认弹窗
  const [folderToConnect, setFolderToConnect] = useState<app.SessionConfig[] | null>(null);

  // 参数化模板弹窗
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [paramTemplateCmd, setParamTemplateCmd] = useState('');

  // 建立会话连接 (应用级联继承与凭证档案)
  const handleConnect = useCallback((session: app.SessionConfig) => {
    const inheritedSession = resolveEffectiveSessionConfig(session, sessions);
    let finalSession = new app.SessionConfig(inheritedSession);

    if (finalSession.authProfileId) {
      const profile = authProfiles.find((p: any) => p.id === finalSession.authProfileId);
      if (profile) {
        finalSession.user = profile.user || finalSession.user;
        finalSession.password = profile.password || finalSession.password;
        finalSession.privateKey = profile.privateKey || finalSession.privateKey;
      }
    }

    const tabExists = openTabs.some((t: any) => t.id === finalSession.id);
    if (tabExists) {
      const newTabId = `${finalSession.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      finalSession.id = newTabId;
    }

    setOpenTabs(prev => [...prev, finalSession]);
    setActiveTabId(finalSession.id);
  }, [sessions, authProfiles, openTabs, setOpenTabs, setActiveTabId]);

  // 文件夹右键“分组连接”
  const handleConnectFolder = useCallback((folderId: string) => {
    const collectSessions = (fid: string): app.SessionConfig[] => {
      let results: app.SessionConfig[] = [];
      const children = sessions.filter((s: any) => s.parentId === fid);
      children.forEach((c: any) => {
        if (c.isFolder) {
          results = [...results, ...collectSessions(c.id)];
        } else {
          results.push(c);
        }
      });
      return results;
    };

    const targetSessions = collectSessions(folderId);
    if (targetSessions.length === 0) {
      alert("该目录下没有任何可连接的 SSH 会话");
      return;
    }

    setFolderToConnect(targetSessions);
  }, [sessions]);

  const confirmConnectFolder = useCallback(() => {
    if (!folderToConnect) return;
    const targetSessions = folderToConnect;
    setFolderToConnect(null);
    const newOpenTabs = [...openTabs];
    targetSessions.forEach((s: any) => {
      const exists = newOpenTabs.some((t: any) => t.id === s.id);
      if (!exists) {
        newOpenTabs.push(s);
      }
    });
    setOpenTabs(newOpenTabs);
    setActiveTabId(targetSessions[targetSessions.length - 1].id);
  }, [folderToConnect, openTabs, setOpenTabs, setActiveTabId]);

  // 容器连接
  const handleConnectContainer = useCallback((target: {
    type: 'docker' | 'k8s';
    name: string;
    containerId?: string;
    podName?: string;
    namespace?: string;
    hostSessionId?: string;
    shell?: string;
  }) => {
    const tempId = `container_${Date.now()}`;
    const shellCmd = target.shell || '/bin/sh';
    let displayName = '';
    if (target.type === 'docker') {
      displayName = `🐳 ${target.name || target.containerId?.substring(0, 12) || 'Container'}`;
    } else {
      displayName = `☸️ ${target.podName || target.name || 'Pod'}`;
    }
    const containerSession = new app.SessionConfig({
      id: tempId,
      name: displayName,
      isFolder: false,
      parentId: '',
      host: target.type === 'docker' ? 'docker' : 'k8s',
      port: 0,
      user: '',
      password: '',
      privateKey: '',
      protocol: target.type,
      containerType: target.type,
      dockerHostSessionId: target.hostSessionId || '',
      dockerContainerId: target.containerId || '',
      dockerShell: shellCmd,
      k8sNamespace: target.namespace || 'default',
      k8sPod: target.podName || '',
      k8sContainer: target.name || '',
      k8sKubeconfig: '',
      isLocal: !target.hostSessionId,
      loginScripts: [],
      triggers: [],
      overrideTheme: '',
      overrideFontSize: 0,
      logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
      tunnels: []
    });
    setOpenTabs(prev => [...prev, containerSession]);
    setActiveTabId(tempId);
  }, [setOpenTabs, setActiveTabId]);

  // 跨 Tab 输入联动
  const handleLinkedInput = useCallback((base64Str: string, sourceTabId: string) => {
    if (!linkedTabIds.includes(sourceTabId)) return;
    linkedTabIds.forEach(id => {
      if (id !== sourceTabId) {
        WriteSSH(id, base64Str).catch(() => {});
      }
    });
  }, [linkedTabIds]);

  // 指令投递 (单端或广播)
  const sendCmdDirect = useCallback((cmdText: string) => {
    if (!cmdText.trim()) return;

    const encoder = new TextEncoder();
    const bytes = encoder.encode(cmdText + "\n");
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Str = window.btoa(binary);

    if (isBroadcast) {
      if (openTabs.length === 0) return;
      const promises = openTabs.map(tab => WriteSSH(tab.id, base64Str));
      Promise.all(promises)
        .then(() => setQuickCmd(''))
        .catch(err => console.error("广播发送部分失败:", err));
    } else {
      if (!activeTabId) return;
      WriteSSH(activeTabId, base64Str)
        .then(() => setQuickCmd(''))
        .catch(err => console.error("发送指令失败:", err));
    }
  }, [isBroadcast, openTabs, activeTabId, setQuickCmd]);

  const handleSendQuickCmd = useCallback((cmdText: string) => {
    if (!cmdText.trim()) return;

    const templateRegex = /\{\{([a-zA-Z0-9_-]+)(?::([^}]*))?\}\}/;
    if (templateRegex.test(cmdText)) {
      setParamTemplateCmd(cmdText);
      setIsParamModalOpen(true);
      return;
    }

    sendCmdDirect(cmdText);
  }, [sendCmdDirect]);

  return {
    folderToConnect,
    setFolderToConnect,
    isParamModalOpen,
    setIsParamModalOpen,
    paramTemplateCmd,
    setParamTemplateCmd,
    handleConnect,
    handleConnectFolder,
    confirmConnectFolder,
    handleConnectContainer,
    handleLinkedInput,
    sendCmdDirect,
    handleSendQuickCmd,
  };
}

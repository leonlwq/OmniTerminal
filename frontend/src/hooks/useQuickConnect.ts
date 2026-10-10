import { useState, useEffect, useCallback } from 'react';
import { app } from '../../wailsjs/go/models';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';

export const parseQuickConnect = (input: string) => {
  let raw = input.trim();
  if (raw.startsWith('ssh://')) {
    raw = raw.substring(6);
  }

  let user = 'root';
  let password = '';
  let host = '';
  let port = 22;

  if (raw.includes('@')) {
    const parts = raw.split('@');
    const auth = parts[0];
    const rest = parts.slice(1).join('@');

    if (auth.includes(':')) {
      const authParts = auth.split(':');
      user = authParts[0];
      password = authParts.slice(1).join(':');
    } else {
      user = auth;
    }
    raw = rest;
  }

  if (raw.includes(':')) {
    const hostParts = raw.split(':');
    host = hostParts[0];
    port = Number(hostParts[1]) || 22;
  } else {
    host = raw;
  }

  return { user, password, host, port };
};

interface UseQuickConnectOptions {
  setOpenTabs: React.Dispatch<React.SetStateAction<app.SessionConfig[]>>;
  setActiveTabId: (id: string | null) => void;
}

export function useQuickConnect({ setOpenTabs, setActiveTabId }: UseQuickConnectOptions) {
  const [quickConnectInput, setQuickConnectInput] = useState('');
  const [quickConnectHistory, setQuickConnectHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('quickConnectHistory') || '[]');
      if (Array.isArray(history)) setQuickConnectHistory(history);
    } catch (e) {}
  }, []);

  const handleLocalShell = useCallback(() => {
    const tempId = 'local_' + Date.now();
    const tempSession = new app.SessionConfig({
      id: tempId,
      name: `💻 本地 Shell`,
      isFolder: false,
      parentId: '',
      host: 'Local',
      port: 0,
      user: '',
      password: '',
      privateKey: '',
      isLocal: true,
      protocol: 'local',
      loginScripts: [],
      triggers: [],
      overrideTheme: '',
      overrideFontSize: 0,
      logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
      tunnels: []
    });

    setOpenTabs(prev => [...prev, tempSession]);
    setActiveTabId(tempId);
  }, [setOpenTabs, setActiveTabId]);

  const handleQuickConnect = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!quickConnectInput.trim()) return;

    const trimmed = quickConnectInput.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      BrowserOpenURL(trimmed);
      setQuickConnectInput('');
      return;
    }

    const { user, password, host, port } = parseQuickConnect(quickConnectInput);
    if (!host) {
      alert("无法解析的主机地址，请检查输入格式");
      return;
    }

    const tempId = 'temp_' + Date.now();
    const tempSession = new app.SessionConfig({
      id: tempId,
      name: `⚡ ${user}@${host}`,
      isFolder: false,
      parentId: '',
      host: host,
      port: port,
      user: user,
      password: password,
      privateKey: '',
      loginScripts: [],
      triggers: [],
      overrideTheme: '',
      overrideFontSize: 0,
      logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
      tunnels: []
    });

    setOpenTabs(prev => [...prev, tempSession]);
    setActiveTabId(tempId);

    // 保存到历史记录
    setQuickConnectHistory(prev => {
      const newHist = [quickConnectInput, ...prev.filter(x => x !== quickConnectInput)].slice(0, 15);
      localStorage.setItem('quickConnectHistory', JSON.stringify(newHist));
      return newHist;
    });
    setQuickConnectInput('');
  }, [quickConnectInput, setOpenTabs, setActiveTabId]);

  return {
    quickConnectInput,
    setQuickConnectInput,
    quickConnectHistory,
    setQuickConnectHistory,
    handleQuickConnect,
    handleLocalShell,
  };
}

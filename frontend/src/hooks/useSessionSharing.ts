import { useState, useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { app } from '../../wailsjs/go/models';

interface UseSessionSharingOptions {
  openTabs: app.SessionConfig[];
}

export function useSessionSharing({ openTabs }: UseSessionSharingOptions) {
  const [shareSessionModalData, setShareSessionModalData] = useState<{
    isOpen: boolean;
    sessionId: string;
    sessionName: string;
  }>({ isOpen: false, sessionId: '', sessionName: '' });

  const [sharedTerminalViewerUrl, setSharedTerminalViewerUrl] = useState<string | null>(null);
  const [sharedSessionStates, setSharedSessionStates] = useState<{
    [id: string]: { isSharing: boolean; viewerCount: number };
  }>({});

  // 基于 Tab ID 列表指纹生成稳定依赖，避免 Tab 内部配置变化（字号、编码、标题）时触发无效的 IPC 重新订阅
  const tabIdsFingerprint = openTabs.map(t => t.id).join(',');

  // 监听与同步各 Tab 的实时协同共享状态
  useEffect(() => {
    let isCancelled = false;
    const unsubs: Array<() => void> = [];
    const currentIdSet = new Set<string>();

    openTabs.forEach(t => {
      const sid = t.id;
      if (!sid) return;
      currentIdSet.add(sid);

      // 1. 订阅实时状态与协同观看者变更事件
      const u1 = EventsOn(`share-status-changed:${sid}`, (st: any) => {
        setSharedSessionStates(prev => ({
          ...prev,
          [sid]: { isSharing: Boolean(st?.isSharing), viewerCount: st?.viewerCount || 0 }
        }));
      });
      const u2 = EventsOn(`share-viewers-changed:${sid}`, (data: any) => {
        setSharedSessionStates(prev => ({
          ...prev,
          [sid]: { isSharing: true, viewerCount: data?.viewerCount || 0 }
        }));
      });
      if (typeof u1 === 'function') unsubs.push(u1);
      if (typeof u2 === 'function') unsubs.push(u2);

      // 2. 初始化拉取当前会话共享状态
      if (typeof window !== 'undefined' && (window as any).go?.app?.App?.GetShareSessionStatus) {
        (window as any).go.app.App.GetShareSessionStatus(sid).then((st: any) => {
          if (!isCancelled && st) {
            setSharedSessionStates(prev => ({
              ...prev,
              [sid]: { isSharing: Boolean(st.isSharing), viewerCount: st.viewerCount || 0 }
            }));
          }
        }).catch(() => {});
      }
    });

    // 3. 淘汰已关闭 tab 的 sharedSessionStates，防止长时间运行字典膨胀
    setSharedSessionStates(prev => {
      let changed = false;
      const next: Record<string, { isSharing: boolean; viewerCount: number }> = {};
      for (const id in prev) {
        if (currentIdSet.has(id)) {
          next[id] = prev[id];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    return () => {
      isCancelled = true;
      unsubs.forEach(u => {
        try {
          u();
        } catch {
          // 安全捕获
        }
      });
    };
  }, [tabIdsFingerprint]);

  return {
    shareSessionModalData,
    setShareSessionModalData,
    sharedTerminalViewerUrl,
    setSharedTerminalViewerUrl,
    sharedSessionStates,
    setSharedSessionStates,
  };
}

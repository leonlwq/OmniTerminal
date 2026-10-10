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

  // 监听与同步各 Tab 的实时协同共享状态
  useEffect(() => {
    openTabs.forEach(t => {
      if (typeof window !== 'undefined' && (window as any).go?.app?.App?.GetShareSessionStatus) {
        (window as any).go.app.App.GetShareSessionStatus(t.id).then((st: any) => {
          if (st) {
            setSharedSessionStates(prev => ({
              ...prev,
              [t.id]: { isSharing: st.isSharing, viewerCount: st.viewerCount || 0 }
            }));
          }
        }).catch(() => {});
      }
    });
  }, [openTabs]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    openTabs.forEach(t => {
      const u1 = EventsOn(`share-status-changed:${t.id}`, (st: any) => {
        setSharedSessionStates(prev => ({
          ...prev,
          [t.id]: { isSharing: st.isSharing, viewerCount: st.viewerCount || 0 }
        }));
      });
      const u2 = EventsOn(`share-viewers-changed:${t.id}`, (data: any) => {
        setSharedSessionStates(prev => ({
          ...prev,
          [t.id]: { isSharing: true, viewerCount: data.viewerCount || 0 }
        }));
      });
      if (typeof u1 === 'function') unsubs.push(u1);
      if (typeof u2 === 'function') unsubs.push(u2);
    });
    return () => {
      unsubs.forEach(u => u());
    };
  }, [openTabs]);

  return {
    shareSessionModalData,
    setShareSessionModalData,
    sharedTerminalViewerUrl,
    setSharedTerminalViewerUrl,
    sharedSessionStates,
    setSharedSessionStates,
  };
}

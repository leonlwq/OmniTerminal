import { useState, useEffect, useCallback, useRef } from 'react';
import { app } from '../../wailsjs/go/models';
import { HostStatusResult } from '../types';

interface UseHostReachabilityOptions {
  sessions: app.SessionConfig[];
  isLocked: boolean;
}

export function useHostReachability({ sessions, isLocked }: UseHostReachabilityOptions) {
  const [hostReachabilityMap, setHostReachabilityMap] = useState<Record<string, HostStatusResult>>({});
  const [isProbingReachability, setIsProbingReachability] = useState(false);
  const probingRef = useRef(false);

  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const triggerBatchProbeReachability = useCallback((targetIds?: string[]) => {
    if (probingRef.current) return;

    const currentSessions = sessionsRef.current;
    const checkIds = targetIds || currentSessions
      .filter((s: any) => !s.isFolder && !s.isLocal && s.host)
      .map((s: any) => s.id);

    if (checkIds.length === 0) {
      return;
    }

    probingRef.current = true;
    setIsProbingReachability(true);

    const wailsApp = (window as any).go?.app?.App;
    const probePromise = wailsApp?.BatchCheckHostReachability
      ? wailsApp.BatchCheckHostReachability(checkIds)
      : Promise.resolve({});

    probePromise
      .then((res: Record<string, HostStatusResult>) => {
        if (res) {
          setHostReachabilityMap(prev => ({ ...prev, ...res }));
        }
      })
      .catch((err: any) => {
        console.warn("探测主机连通性错误:", err);
      })
      .finally(() => {
        probingRef.current = false;
        setIsProbingReachability(false);
      });
  }, []); // 引用持久稳定，彻底阻断死循环

  // 定时自动批量探测连通性 (启动与每 30 秒)
  useEffect(() => {
    if (isLocked) return;

    // 初始进入或解锁时触发单次探测
    triggerBatchProbeReachability();

    const timer = setInterval(() => {
      if (!isLockedRef.current) {
        triggerBatchProbeReachability();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [isLocked, triggerBatchProbeReachability]);

  return {
    hostReachabilityMap,
    isProbingReachability,
    triggerBatchProbeReachability,
  };
}

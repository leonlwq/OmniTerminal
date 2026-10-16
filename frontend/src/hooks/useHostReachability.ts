import { useState, useEffect, useCallback, useRef } from 'react';
import { app } from '../../wailsjs/go/models';
import { BatchCheckHostReachability } from '../../wailsjs/go/app/App';
import { HostStatusResult, ProbeFeedback } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface UseHostReachabilityOptions {
  sessions: app.SessionConfig[];
  isLocked: boolean;
}

export function useHostReachability({ sessions, isLocked }: UseHostReachabilityOptions) {
  const { t } = useI18n();
  const [hostReachabilityMap, setHostReachabilityMap] = useState<Record<string, HostStatusResult>>({});
  const [isProbingReachability, setIsProbingReachability] = useState(false);
  const [probeFeedback, setProbeFeedback] = useState<ProbeFeedback | null>(null);
  const probingRef = useRef(false);
  const feedbackTimerRef = useRef<any>(null);
  const activeProbePromiseRef = useRef<Promise<any> | null>(null);

  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const clearProbeFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setProbeFeedback(null);
  }, []);

  const triggerBatchProbeReachability = useCallback(async (targetIds?: string[], isManual = false) => {
    if (probingRef.current) {
      if (isManual) {
        clearProbeFeedback();
        setProbeFeedback({
          type: 'info',
          message: t('sidebar.probing', '探测中...')
        });
        if (activeProbePromiseRef.current) {
          try {
            await activeProbePromiseRef.current;
          } catch (_) {}
        }
      }
      return;
    }

    const currentSessions = sessionsRef.current;
    const checkIds = targetIds || currentSessions
      .filter((s: any) => !s.isFolder && !s.isLocal && s.host)
      .map((s: any) => s.id);

    if (checkIds.length === 0) {
      if (isManual) {
        clearProbeFeedback();
        setProbeFeedback({
          type: 'info',
          message: t('sidebar.probeNoHosts', '未发现可探测的远程主机')
        });
        feedbackTimerRef.current = setTimeout(() => {
          setProbeFeedback(null);
        }, 4000);
      }
      return;
    }

    probingRef.current = true;
    setIsProbingReachability(true);
    if (isManual) {
      clearProbeFeedback();
    }

    const startTime = Date.now();

    const executeProbe = async () => {
      const probePromise = (typeof BatchCheckHostReachability === 'function')
        ? BatchCheckHostReachability(checkIds)
        : ((window as any).go?.app?.App?.BatchCheckHostReachability
            ? (window as any).go.app.App.BatchCheckHostReachability(checkIds)
            : Promise.resolve({} as Record<string, HostStatusResult>));

      const res = await probePromise;

      // 若用户手动点击，确保至少展示 500ms 探测动画，避免过快返回让用户产生无响应错觉
      if (isManual) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
          await new Promise(r => setTimeout(r, 500 - elapsed));
        }
      }

      if (res && typeof res === 'object') {
        setHostReachabilityMap(prev => ({ ...prev, ...res }));

        if (isManual) {
          let onlineCount = 0;
          let offlineCount = 0;
          let totalLatency = 0;
          const total = Object.keys(res).length;

          for (const key of Object.keys(res)) {
            const item = res[key];
            if (item.online) {
              onlineCount++;
              totalLatency += item.latencyMs;
            } else {
              offlineCount++;
            }
          }

          const avg = onlineCount > 0 ? Math.round(totalLatency / onlineCount) : 0;
          let message = '';
          let type: 'success' | 'warning' | 'error' = 'success';

          if (offlineCount === 0) {
            message = (t('sidebar.probeSuccessAll', '探测完成：全部 {online} 台主机在线 (平均 {avg}ms)'))
              .replace('{online}', String(onlineCount))
              .replace('{avg}', String(avg));
            type = 'success';
          } else if (onlineCount > 0) {
            message = (t('sidebar.probeSuccessPartial', '探测完成：{online}/{total} 在线，{offline} 离线'))
              .replace('{online}', String(onlineCount))
              .replace('{total}', String(total))
              .replace('{offline}', String(offlineCount));
            type = 'warning';
          } else {
            message = (t('sidebar.probeSuccessNone', '探测完成：全部离线 (0/{total})'))
              .replace('{total}', String(total));
            type = 'error';
          }

          setProbeFeedback({ type, message });
          feedbackTimerRef.current = setTimeout(() => {
            setProbeFeedback(null);
          }, 4500);
        }
      }
    };

    const task = executeProbe();
    activeProbePromiseRef.current = task;

    try {
      await task;
    } catch (err: any) {
      console.warn("探测主机连通性错误:", err);
      if (isManual) {
        const errStr = err?.message || String(err);
        setProbeFeedback({
          type: 'error',
          message: (t('sidebar.probeFailed', '探测失败: {err}')).replace('{err}', errStr)
        });
        feedbackTimerRef.current = setTimeout(() => {
          setProbeFeedback(null);
        }, 4500);
      }
    } finally {
      activeProbePromiseRef.current = null;
      probingRef.current = false;
      setIsProbingReachability(false);
    }
  }, [t, clearProbeFeedback]);

  // 当会话列表首次加载成功或解锁时，自动触发一次批量探测
  const hasAutoProbedOnLoad = useRef(false);
  useEffect(() => {
    if (isLocked) return;

    if (!hasAutoProbedOnLoad.current && sessions.length > 0) {
      hasAutoProbedOnLoad.current = true;
      triggerBatchProbeReachability();
    }

    const timer = setInterval(() => {
      if (!isLockedRef.current) {
        triggerBatchProbeReachability();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [isLocked, sessions.length, triggerBatchProbeReachability]);

  return {
    hostReachabilityMap,
    isProbingReachability,
    triggerBatchProbeReachability,
    probeFeedback,
    clearProbeFeedback,
  };
}

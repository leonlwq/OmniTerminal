import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHostReachability } from './useHostReachability';
import { app } from '../../wailsjs/go/models';

vi.mock('../../wailsjs/go/app/App', () => ({
  BatchCheckHostReachability: vi.fn(),
}));

import { BatchCheckHostReachability } from '../../wailsjs/go/app/App';

describe('useHostReachability', () => {
  const mockSessions: app.SessionConfig[] = [
    new app.SessionConfig({
      id: 'folder_1',
      name: 'Test Folder',
      isFolder: true,
      host: '',
    }),
    new app.SessionConfig({
      id: 'sess_1',
      name: 'Host 1',
      isFolder: false,
      host: '1.2.3.4',
      port: 22,
      parentId: 'folder_1',
    }),
    new app.SessionConfig({
      id: 'sess_2',
      name: 'Host 2',
      isFolder: false,
      host: '5.6.7.8',
      port: 22,
      parentId: 'folder_1',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers manual probe and sets feedback with minimum animation feedback', async () => {
    vi.mocked(BatchCheckHostReachability).mockResolvedValue({
      sess_1: {
        sessionId: 'sess_1',
        online: true,
        latencyMs: 15,
        checkedAt: '12:00:00',
        error: '',
      },
      sess_2: {
        sessionId: 'sess_2',
        online: true,
        latencyMs: 25,
        checkedAt: '12:00:00',
        error: '',
      },
    });

    const { result } = renderHook(() =>
      useHostReachability({
        sessions: mockSessions,
        isLocked: false,
      })
    );

    // 等待初始自动探测完成
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.isProbingReachability).toBe(false);

    // Trigger manual probe
    let probePromise: Promise<void>;
    act(() => {
      probePromise = result.current.triggerBatchProbeReachability(undefined, true);
    });

    expect(result.current.isProbingReachability).toBe(true);

    await act(async () => {
      await probePromise!;
    });

    expect(result.current.isProbingReachability).toBe(false);
    expect(result.current.hostReachabilityMap['sess_1']?.online).toBe(true);
    expect(result.current.hostReachabilityMap['sess_2']?.online).toBe(true);

    // Verify feedback is present
    expect(result.current.probeFeedback).not.toBeNull();
    expect(result.current.probeFeedback?.type).toBe('success');
    expect(result.current.probeFeedback?.message).toContain('全部 2 台主机在线');

    // Test clearProbeFeedback
    act(() => {
      result.current.clearProbeFeedback();
    });
    expect(result.current.probeFeedback).toBeNull();
  });

  it('reports partial offline feedback accurately when some hosts fail', async () => {
    vi.mocked(BatchCheckHostReachability).mockResolvedValue({
      sess_1: {
        sessionId: 'sess_1',
        online: true,
        latencyMs: 20,
        checkedAt: '12:00:00',
        error: '',
      },
      sess_2: {
        sessionId: 'sess_2',
        online: false,
        latencyMs: 0,
        checkedAt: '12:00:00',
        error: 'Connection timed out',
      },
    });

    const { result } = renderHook(() =>
      useHostReachability({
        sessions: mockSessions,
        isLocked: false,
      })
    );

    // 等待初始自动探测完成
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    await act(async () => {
      await result.current.triggerBatchProbeReachability(undefined, true);
    });

    expect(result.current.probeFeedback?.type).toBe('warning');
    expect(result.current.probeFeedback?.message).toContain('1/2 在线');
    expect(result.current.probeFeedback?.message).toContain('1 离线');
  });

  it('handles empty host sessions gracefully with info feedback', async () => {
    const { result } = renderHook(() =>
      useHostReachability({
        sessions: [new app.SessionConfig({ id: 'folder_only', isFolder: true })],
        isLocked: false,
      })
    );

    await act(async () => {
      await result.current.triggerBatchProbeReachability(undefined, true);
    });

    expect(result.current.probeFeedback?.type).toBe('info');
    expect(result.current.probeFeedback?.message).toContain('未发现可探测的远程主机');
  });
});

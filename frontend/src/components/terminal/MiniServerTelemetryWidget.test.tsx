import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MiniServerTelemetryWidget } from './MiniServerTelemetryWidget';

describe('MiniServerTelemetryWidget', () => {
  const mockGetHostMetrics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).go = {
      app: {
        App: {
          GetHostMetrics: mockGetHostMetrics,
        },
      },
    };
  });

  it('does not render when isLocal is true', () => {
    const { container } = render(
      <MiniServerTelemetryWidget
        sessionId="local-1"
        sessionName="Local Terminal"
        isLocal={true}
        enableMiniTelemetry={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when enableMiniTelemetry is false', () => {
    const { container } = render(
      <MiniServerTelemetryWidget
        sessionId="remote-1"
        sessionName="Production Server"
        isLocal={false}
        enableMiniTelemetry={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders capsule and toggles popover card on click', async () => {
    mockGetHostMetrics.mockResolvedValue({
      sessionId: 'remote-1',
      cpuUsage: 25.5,
      memUsage: 60.2,
      memTotalMB: 8192,
      memUsedMB: 4931,
      diskUsage: 45.0,
      diskTotalGB: 100.0,
      diskUsedGB: 45.0,
      netRxRateKBps: 120.5,
      netTxRateKBps: 34.2,
      uptimeStr: '12 days',
      sampledAt: '12:00:00',
    });

    const onOpenFullMonitor = vi.fn();

    let res: any;
    await act(async () => {
      res = render(
        <MiniServerTelemetryWidget
          sessionId="remote-1"
          sessionName="Production Server"
          isLocal={false}
          enableMiniTelemetry={true}
          intervalSec={3}
          onOpenFullMonitor={onOpenFullMonitor}
        />
      );
    });

    const { getByTitle, getByText } = res;

    // Capsule button exists
    const capsuleBtn = getByTitle(/服务器实时硬件遥测/);
    expect(capsuleBtn).toBeInTheDocument();
    expect(getByText(/26%/)).toBeInTheDocument(); // 25.5 rounded to 26%
    expect(getByText(/60%/)).toBeInTheDocument(); // 60.2 rounded to 60%

    // Click capsule to expand popover
    await act(async () => {
      fireEvent.click(capsuleBtn);
    });

    expect(getByText('Production Server')).toBeInTheDocument();
    expect(getByText('打开完整监控中心')).toBeInTheDocument();

    // Click full monitor button
    const fullMonitorBtn = getByText('打开完整监控中心');
    fireEvent.click(fullMonitorBtn);
    expect(onOpenFullMonitor).toHaveBeenCalledTimes(1);
  });
});

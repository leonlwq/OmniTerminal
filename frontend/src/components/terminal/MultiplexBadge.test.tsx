import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nProvider } from '../../i18n/I18nContext';
import { MultiplexBadge } from './MultiplexBadge';

describe('MultiplexBadge', () => {
  const mockGetSessionMultiplexInfo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).go = {
      app: {
        App: {
          GetSessionMultiplexInfo: mockGetSessionMultiplexInfo,
        },
      },
    };
  });

  it('does not render for local session', () => {
    const { container } = render(
      <I18nProvider>
        <MultiplexBadge
          sessionId="local-1"
          sessionName="Local Shell"
          isLocal={true}
        />
      </I18nProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders multiplex badge and displays channel details upon click', async () => {
    mockGetSessionMultiplexInfo.mockResolvedValue({
      sessionId: 'sess-123',
      poolKey: 'root@10.0.0.1:22',
      isPooled: true,
      host: '10.0.0.1',
      port: 22,
      user: 'root',
      physicalConnections: 1,
      activeChannelsCount: 3,
      channelsBreakdown: { pty: 1, sftp: 1, telemetry: 1 },
      channelDetails: [
        { type: 'pty', name: 'Web Server', sessionId: 'sess-123', active: true, description: 'PTY Shell' },
        { type: 'sftp', name: 'Web Server (SFTP)', sessionId: 'sess-123', active: true, description: 'SFTP Subsystem' },
        { type: 'telemetry', name: 'Stealth Host Telemetry', sessionId: 'sess-123', active: true, description: 'Stealth Metrics' },
      ],
      stealthAuditNote: '零感知安全审计保证',
      estimatedRttSavedMs: 240,
      createdAt: '2026-10-14 16:00:00',
    });

    let component: any;
    await act(async () => {
      component = render(
        <I18nProvider>
          <MultiplexBadge
            sessionId="sess-123"
            sessionName="Web Server"
            isActive={true}
            isLocal={false}
          />
        </I18nProvider>
      );
    });

    const button = component.getByRole('button');
    expect(button).toBeDefined();

    // Click to open popover
    await act(async () => {
      fireEvent.click(button);
    });

    expect(component.getByText('root@10.0.0.1:22')).toBeDefined();
    expect(component.getByText('1 TCP Socket')).toBeDefined();
  });
});

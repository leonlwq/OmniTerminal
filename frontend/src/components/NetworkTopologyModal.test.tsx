import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nProvider } from '../i18n/I18nContext';
import { NetworkTopologyModal } from './NetworkTopologyModal';

describe('NetworkTopologyModal', () => {
  const mockGetNetworkTopology = vi.fn();
  const mockDiagnoseTopologyHop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('app_lang', 'zh-CN');
    (window as any).go = {
      app: {
        App: {
          GetNetworkTopology: mockGetNetworkTopology,
          DiagnoseTopologyHop: mockDiagnoseTopologyHop,
        },
      },
    };
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <I18nProvider>
        <NetworkTopologyModal isOpen={false} onClose={() => {}} />
      </I18nProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal, loads nodes and runs diagnosis', async () => {
    mockGetNetworkTopology.mockResolvedValue({
      nodes: [
        { id: 'local_root', label: 'Local Root', host: '127.0.0.1', port: 0, user: 'local', type: 'local', status: 'connected', uptime: '1h', activeTunnelsCount: 0, rttMs: 0 },
        { id: 'sess-1', label: 'Bastion Gate', host: '1.2.3.4', port: 22, user: 'root', type: 'jumphost', status: 'connected', uptime: '2h', activeTunnelsCount: 1, rttMs: 15 },
        { id: 'svc-mysql', label: 'MySQL Database', host: '10.0.0.5', port: 3306, user: 'service', type: 'service', status: 'connected', uptime: 'Active', activeTunnelsCount: 0, rttMs: 5 },
      ],
      edges: [
        { id: 'e1', source: 'local_root', target: 'sess-1', type: 'direct', label: 'SSH', status: 'healthy', rttMs: 15 },
        { id: 'e2', source: 'sess-1', target: 'svc-mysql', type: 'tunnel', label: 'LOCAL 3306', status: 'healthy', rttMs: 5 },
      ],
      tunnels: [
        { sessionId: 'sess-1', type: 'LOCAL', localAddr: '127.0.0.1:3306', remoteAddr: '10.0.0.5:3306', status: 'active' },
      ],
    });

    mockDiagnoseTopologyHop.mockResolvedValue({
      target: '10.0.0.5:3306',
      healthy: true,
      totalRttMs: 20,
      hops: [
        { hopIndex: 1, name: 'Local -> Bastion', fromAddr: 'localhost', toAddr: '1.2.3.4:22', rttMs: 15, status: 'healthy' },
        { hopIndex: 2, name: 'Bastion -> MySQL', fromAddr: '1.2.3.4', toAddr: '10.0.0.5:3306', rttMs: 5, status: 'healthy' },
      ],
      conclusion: '端到端链路完全通畅',
      suggestion: '网络链路正常',
      diagnosedAt: '2026-10-14 16:30:00',
    });

    let component: any;
    await act(async () => {
      component = render(
        <I18nProvider>
          <NetworkTopologyModal isOpen={true} onClose={() => {}} />
        </I18nProvider>
      );
    });

    // Check nodes rendered
    expect(component.getByText('Local Root')).toBeDefined();
    expect(component.getByText('Bastion Gate')).toBeDefined();
    expect(component.getByText('MySQL Database')).toBeDefined();

    // Select the service node
    const serviceNode = component.getByText('MySQL Database');
    await act(async () => {
      fireEvent.mouseDown(serviceNode);
    });

    // Check sidebar shows the node
    expect(component.getAllByText('service').length).toBeGreaterThan(0);

    // Trigger diagnosis
    const diagBtn = component.getByText('深度诊断探测');
    expect(diagBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(diagBtn);
    });

    // Expect diagnosis results to be displayed
    expect(component.getByText('端到端链路完全通畅')).toBeDefined();
    expect(component.getByText('Local -> Bastion')).toBeDefined();
  });
});

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintTerminalModal } from './PrintTerminalModal';
import { I18nProvider } from '../i18n/I18nContext';

describe('PrintTerminalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('app_lang', 'zh-CN');
    (window as any).go = {
      app: {
        App: {
          PrintTerminalDocument: vi.fn().mockResolvedValue(true),
          SaveTerminalLog: vi.fn().mockResolvedValue(true),
        },
      },
    };
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  const mockActiveTab = {
    id: 'tab_test_1',
    name: 'hybrid-cicd',
    host: '57.180.171.232',
    user: 'opc',
  };

  const mockGetLines = () => [
    'Last login: Thu Oct 16 10:00:00 2026 from 10.0.0.1',
    '[opc@hybrid-cicd ~]$ docker ps',
    'CONTAINER ID   IMAGE     COMMAND   STATUS    PORTS     NAMES',
    'c1a2b3c4d5e6   redis     "..."     Up 2 mos  6379/tcp  redis',
  ];

  it('renders modal with active session title and lines', async () => {
    let result: any;
    await React.act(async () => {
      result = render(
        <I18nProvider>
          <PrintTerminalModal
            isOpen={true}
            onClose={vi.fn()}
            activeTab={mockActiveTab}
            getLines={mockGetLines}
          />
        </I18nProvider>
      );
    });

    expect(screen.getByText(/终端打印与导出预览/)).not.toBeNull();
    expect(screen.getAllByText(/hybrid-cicd/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/57.180.171.232/).length).toBeGreaterThan(0);
    expect(screen.getByText(/docker ps/)).not.toBeNull();
  });

  it('switches paper theme and toggles line numbers', async () => {
    let result: any;
    await React.act(async () => {
      result = render(
        <I18nProvider>
          <PrintTerminalModal
            isOpen={true}
            onClose={vi.fn()}
            activeTab={mockActiveTab}
            getLines={mockGetLines}
          />
        </I18nProvider>
      );
    });

    const darkBtn = screen.getByText(/暗黑/);
    fireEvent.click(darkBtn);

    const lineNumCheckbox = screen.getByRole('checkbox', { name: /显示行号/ });
    fireEvent.click(lineNumCheckbox); // unchecked
  });

  it('triggers print and calls backend PrintTerminalDocument and clipboard copy', async () => {
    let result: any;
    await React.act(async () => {
      result = render(
        <I18nProvider>
          <PrintTerminalModal
            isOpen={true}
            onClose={vi.fn()}
            activeTab={mockActiveTab}
            getLines={mockGetLines}
          />
        </I18nProvider>
      );
    });

    // Test copy text
    const copyBtn = screen.getByText('复制文本');
    await React.act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Test print button
    const printBtn = screen.getByText('发送至打印机');
    await React.act(async () => {
      fireEvent.click(printBtn);
    });

    expect((window as any).go.app.App.PrintTerminalDocument).toHaveBeenCalled();
  });
});

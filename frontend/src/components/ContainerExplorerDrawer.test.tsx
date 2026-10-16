import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContainerExplorerDrawer } from './ContainerExplorerDrawer';
import { I18nProvider } from '../i18n/I18nContext';

describe('ContainerExplorerDrawer Resizable Width and Docking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (window as any).go = {
      app: {
        App: {
          ListDockerContainers: vi.fn().mockResolvedValue([
            {
              id: 'c1',
              names: 'alert-gateway',
              image: 'ops/alert-gateway:1.0.1',
              status: 'Up 8 weeks',
              state: 'running',
              ports: '0.0.0.0:9193->9193/tcp',
            },
            {
              id: 'c2',
              names: 'redis',
              image: 'redis:alpine',
              status: 'Up 2 months',
              state: 'running',
              ports: '0.0.0.0:6379->6379/tcp',
            },
          ]),
          ListK8sPods: vi.fn().mockResolvedValue([]),
        },
      },
    };
  });

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    sessions: [],
    activeSessions: [{ id: 'sess_hybrid', name: 'hybrid-cicd', host: '57.180.171.232' }],
    activeTabId: 'sess_hybrid',
    dockSide: 'left' as const,
  };

  it('renders with default width of 340px', async () => {
    let renderResult: any;
    await React.act(async () => {
      renderResult = render(
        <I18nProvider>
          <ContainerExplorerDrawer {...mockProps} />
        </I18nProvider>
      );
    });

    const drawer = renderResult.container.firstElementChild as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.style.width).toBe('340px');
  });

  it('restores persisted width from localStorage', async () => {
    localStorage.setItem('omniterminal_container_drawer_width', '450');

    let renderResult: any;
    await React.act(async () => {
      renderResult = render(
        <I18nProvider>
          <ContainerExplorerDrawer {...mockProps} />
        </I18nProvider>
      );
    });

    const drawer = renderResult.container.firstElementChild as HTMLElement;
    expect(drawer.style.width).toBe('450px');
  });

  it('allows dragging handle to dynamically resize width', async () => {
    let renderResult: any;
    await React.act(async () => {
      renderResult = render(
        <I18nProvider>
          <ContainerExplorerDrawer {...mockProps} />
        </I18nProvider>
      );
    });

    const drawer = renderResult.container.firstElementChild as HTMLElement;
    const handle = renderResult.container.querySelector('.cursor-col-resize') as HTMLElement;
    expect(handle).not.toBeNull();

    // Mouse down at x = 340
    fireEvent.mouseDown(handle, { clientX: 340 });

    // Drag to x = 460 (+120px)
    fireEvent.mouseMove(window, { clientX: 460 });
    expect(drawer.style.width).toBe('460px');

    // Mouse up
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('omniterminal_container_drawer_width')).toBe('460');
  });

  it('supports double-click on handle to reset to default 340px', async () => {
    localStorage.setItem('omniterminal_container_drawer_width', '500');

    let renderResult: any;
    await React.act(async () => {
      renderResult = render(
        <I18nProvider>
          <ContainerExplorerDrawer {...mockProps} />
        </I18nProvider>
      );
    });

    const drawer = renderResult.container.firstElementChild as HTMLElement;
    expect(drawer.style.width).toBe('500px');

    const handle = renderResult.container.querySelector('.cursor-col-resize') as HTMLElement;
    fireEvent.doubleClick(handle);

    expect(drawer.style.width).toBe('340px');
    expect(localStorage.getItem('omniterminal_container_drawer_width')).toBe('340');
  });

  it('handles right dock positioning properly', async () => {
    let renderResult: any;
    await React.act(async () => {
      renderResult = render(
        <I18nProvider>
          <ContainerExplorerDrawer {...mockProps} dockSide="right" />
        </I18nProvider>
      );
    });

    const drawer = renderResult.container.firstElementChild as HTMLElement;
    expect(drawer.className).toContain('border-l');
    expect(drawer.className).toContain('relative');
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionSidebar } from './SessionSidebar';
import { I18nProvider } from '../i18n/I18nContext';
import { app } from '../../wailsjs/go/models';

describe('SessionSidebar Resizable Width', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockProps = {
    searchQuery: '',
    setSearchQuery: vi.fn(),
    draggedSessionId: null,
    setDraggedSessionId: vi.fn(),
    sessions: [new app.SessionConfig({ id: 'sess_1', name: 'Server 1', isFolder: false })],
    SaveSession: vi.fn().mockResolvedValue(true),
    loadSessions: vi.fn(),
    openTabs: [],
    setOpenTabs: vi.fn(),
    lockedTabs: [],
    activeTabId: null,
    setActiveTabId: vi.fn(),
    secondaryTabId: null,
    setSecondaryTabId: vi.fn(),
    splitMode: 'none' as const,
    openSftpTabs: [],
    setOpenSftpTabs: vi.fn(),
    tabStatus: {},
    handleCloseTab: vi.fn(),
  };

  it('renders with default width of 272px', () => {
    const { container } = render(
      <I18nProvider>
        <SessionSidebar {...mockProps} />
      </I18nProvider>
    );

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.style.width).toBe('272px');
  });

  it('allows dragging handle to dynamically resize width', () => {
    const onWidthChange = vi.fn();
    const { container } = render(
      <I18nProvider>
        <SessionSidebar {...mockProps} onSidebarWidthChange={onWidthChange} />
      </I18nProvider>
    );

    const aside = container.querySelector('aside');
    const handle = container.querySelector('.cursor-col-resize') as HTMLElement;
    expect(handle).not.toBeNull();

    // Mouse down on handle at x = 272
    fireEvent.mouseDown(handle, { clientX: 272 });

    // Move mouse to x = 350 (+78px)
    fireEvent.mouseMove(window, { clientX: 350 });

    // Aside should now be 272 + 78 = 350px
    expect(aside?.style.width).toBe('350px');
    expect(onWidthChange).toHaveBeenCalledWith(350);

    // Mouse up
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('omniterminal_sidebar_width')).toBe('350');
  });

  it('resets to 272px upon double clicking the handle', () => {
    localStorage.setItem('omniterminal_sidebar_width', '400');
    const { container } = render(
      <I18nProvider>
        <SessionSidebar {...mockProps} />
      </I18nProvider>
    );

    const aside = container.querySelector('aside');
    expect(aside?.style.width).toBe('400px');

    const handle = container.querySelector('.cursor-col-resize') as HTMLElement;
    fireEvent.doubleClick(handle);

    expect(aside?.style.width).toBe('272px');
    expect(localStorage.getItem('omniterminal_sidebar_width')).toBe('272');
  });
});

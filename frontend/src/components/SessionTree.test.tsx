import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionTree } from './SessionTree';
import { I18nProvider } from '../i18n/I18nContext';
import { app } from '../../wailsjs/go/models';

describe('SessionTree Folder Reachability', () => {
  const mockSessions: app.SessionConfig[] = [
    new app.SessionConfig({
      id: 'folder_hc',
      name: 'hc',
      isFolder: true,
      parentId: '',
      host: '',
    }),
    new app.SessionConfig({
      id: 'sess_hybrid',
      name: 'hybrid-cicd',
      isFolder: false,
      parentId: 'folder_hc',
      host: '57.180.171.232',
      port: 57716,
    }),
    new app.SessionConfig({
      id: 'folder_aibpo',
      name: 'aibpo',
      isFolder: true,
      parentId: '',
      host: '',
    }),
    new app.SessionConfig({
      id: 'sess_aibpo_com',
      name: 'aibpo-com',
      isFolder: false,
      parentId: 'folder_aibpo',
      host: '47.111.96.9',
      port: 57716,
    }),
  ];

  it('renders aggregated reachability dot and count on collapsed folders', () => {
    const mockReachability = {
      sess_hybrid: {
        sessionId: 'sess_hybrid',
        online: true,
        latencyMs: 12,
        checkedAt: '10:00:00',
      },
      sess_aibpo_com: {
        sessionId: 'sess_aibpo_com',
        online: true,
        latencyMs: 18,
        checkedAt: '10:00:00',
      },
    };

    render(
      <I18nProvider>
        <SessionTree
          searchQuery=""
          sessions={mockSessions}
          expandedFolders={[]} // Collapsed folders
          toggleFolder={vi.fn()}
          selectedSessionIds={[]}
          setSelectedSessionIds={vi.fn()}
          handleSessionNodeClick={vi.fn()}
          handleConnect={vi.fn()}
          handleSessionContextMenu={vi.fn()}
          setDraggedSessionId={vi.fn()}
          handleSessionDrop={vi.fn()}
          resetSessionFormData={vi.fn()}
          resetFolderFormData={vi.fn()}
          setModalMode={vi.fn()}
          setIsModalOpen={vi.fn()}
          handleEditSession={vi.fn()}
          handleDeleteSession={vi.fn()}
          openTabs={[]}
          activeTabId={null}
          hostReachabilityMap={mockReachability}
          getColorLabelClass={() => ''}
        />
      </I18nProvider>
    );

    // Folders hc and aibpo should be visible
    expect(screen.getByText('hc')).toBeInTheDocument();
    expect(screen.getByText('aibpo')).toBeInTheDocument();

    // Both folders should display the aggregated "1/1" online badge
    const badges = screen.getAllByText('1/1');
    expect(badges.length).toBe(2);

    // Child hosts should be hidden because folders are collapsed
    expect(screen.queryByText('hybrid-cicd')).not.toBeInTheDocument();
    expect(screen.queryByText('aibpo-com')).not.toBeInTheDocument();
  });
});

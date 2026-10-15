import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SftpPanel } from './SftpPanel';

// Mock dependencies
vi.mock('../../wailsjs/go/app/App', () => ({
  SftpListDir: vi.fn().mockResolvedValue([]),
  LocalListDir: vi.fn().mockResolvedValue([]),
  SftpDelete: vi.fn().mockResolvedValue(true),
  SftpMkdir: vi.fn().mockResolvedValue(true),
  SftpRename: vi.fn().mockResolvedValue(true),
  SftpChmod: vi.fn().mockResolvedValue(true),
  LocalDelete: vi.fn().mockResolvedValue(true),
  LocalMkdir: vi.fn().mockResolvedValue(true),
  LocalRename: vi.fn().mockResolvedValue(true),
  GetLocalHomeDir: vi.fn().mockResolvedValue('/home/user'),
  LocalReadFile: vi.fn().mockResolvedValue(''),
  LocalWriteFile: vi.fn().mockResolvedValue(true),
  SftpUploadPaths: vi.fn().mockResolvedValue(true),
  SftpDownloadPaths: vi.fn().mockResolvedValue(true),
  OpenRemoteFileWithEditor: vi.fn().mockResolvedValue(true)
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: any) => ({
    getTotalSize: () => count * 32,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
      index,
      start: index * 32,
      size: 32,
    })),
  }),
}));

vi.mock('../../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(() => vi.fn()),
  EventsOff: vi.fn(),
}));

// Mock i18n
vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        'sftp.localPanel': '本地 (Local)',
        'sftp.remotePanel': '远程 (Remote)',
      };
      return dict[key] || key;
    }
  })
}));

describe('SftpPanel', () => {
  it('renders sftp panel successfully', async () => {
    let getByTextFn: any = null;
    await act(async () => {
      const res = render(
        <SftpPanel
          sessionId="test-session"
          onClose={vi.fn()}
        />
      );
      getByTextFn = res.getByText;
    });
    expect(getByTextFn(/本地 \(Local\)/)).toBeInTheDocument();
  });
});

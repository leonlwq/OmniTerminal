import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TerminalInstance } from './TerminalInstance';

// Mock xterm
vi.mock('@xterm/xterm', () => {
  return {
    Terminal: class {
      loadAddon() {}
      open() {}
      write() {}
      onData() {}
      onTitleChange() {}
      onSelectionChange() {}
      onBell() {}
      onResize() {}
      onScroll() { return { dispose: () => {} }; }
      attachCustomKeyEventHandler() {}
      getSelection() { return ''; }
      hasSelection() { return false; }
      clearSelection() {}
      dispose() {}
      focus() {}
      refresh() {}
      clearTextureAtlas() {}
      cols = 80
      rows = 24
      options = {}
      buffer = { active: { length: 0 } }
    }
  };
});

// Mock dependencies
vi.mock('../../wailsjs/go/app/App', () => ({
  ConnectSSH: vi.fn().mockResolvedValue(true),
  WriteSSH: vi.fn().mockResolvedValue(true),
  ResizeSSH: vi.fn().mockResolvedValue(true),
  DisconnectSSH: vi.fn().mockResolvedValue(true),
  UpdateTerminalInfo: vi.fn().mockResolvedValue(true),
  UpdateTrafficLimit: vi.fn().mockResolvedValue(true),
  AIGenerateCommand: vi.fn().mockResolvedValue({ command: 'ls -la', explanation: 'List files', riskLevel: 'safe' }),
  AIDiagnoseError: vi.fn().mockResolvedValue({ command: 'sudo kill -9 3000', explanation: 'Kill port', riskLevel: 'caution' }),
  AITestConnection: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(() => vi.fn()),
  EventsOff: vi.fn(),
  ClipboardSetText: vi.fn(),
  ClipboardGetText: vi.fn().mockResolvedValue(''),
}));

// Mock i18n
vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

// Mock @xterm/addon-image
vi.mock('@xterm/addon-image', () => {
  return {
    ImageAddon: class {
      options: any;
      storageLimit = 128;
      constructor(opts: any) {
        this.options = opts;
      }
      activate() {}
      dispose() {}
      reset() {}
    }
  };
});

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TerminalInstance', () => {
  it('renders terminal container without crashing', async () => {
    let container: HTMLElement | null = null;
    await act(async () => {
      const res = render(
        <TerminalInstance
          sessionId="test-session"
          name="Test SSH"
          host="127.0.0.1"
          port={22}
          user="root"
          isActive={true}
          themeName="Classic Dark"
          fontFamily="Consolas"
          fontSize={14}
          scrollbackLines={1000}
          terminalOpacity={1.0}
          onStatusChange={vi.fn()}
          onClosed={vi.fn()}
          encoding="UTF-8"
          termType="xterm-256color"
          isLocal={false}
          copyOnSelect={true}
          cursorStyle="block"
          cursorBlink={true}
          enableBell={true}
        />
      );
      container = res.container;
    });
    expect(container).toBeInTheDocument();
  });

  it('renders terminal with Sixel/iTerm2 image support enabled', async () => {
    let container: HTMLElement | null = null;
    await act(async () => {
      const res = render(
        <TerminalInstance
          sessionId="test-session-image"
          name="Test Sixel SSH"
          host="127.0.0.1"
          port={22}
          user="root"
          isActive={true}
          themeName="VS Code Dark Modern"
          fontFamily="Consolas"
          fontSize={13}
          enableTerminalImages={true}
          imageStorageLimitMB={256}
          onStatusChange={vi.fn()}
          onClosed={vi.fn()}
        />
      );
      container = res.container;
    });
    expect(container).toBeInTheDocument();
  });

  it('renders terminal with aiConfig and inline AI copilot support', async () => {
    let container: HTMLElement | null = null;
    await act(async () => {
      const res = render(
        <TerminalInstance
          sessionId="test-session-ai"
          name="Test AI SSH"
          host="127.0.0.1"
          port={22}
          user="root"
          isActive={true}
          themeName="VS Code Dark Modern"
          fontFamily="Consolas"
          fontSize={13}
          aiConfig={{
            provider: 'deepseek',
            apiKey: 'sk-test',
            baseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat',
            temperature: 0.2,
            maxTokens: 2048,
          } as any}
          onStatusChange={vi.fn()}
          onClosed={vi.fn()}
        />
      );
      container = res.container;
    });
    expect(container).toBeInTheDocument();
  });
});

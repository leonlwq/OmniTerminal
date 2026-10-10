import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  normalizeKeyEvent,
  formatKeyDisplay,
  DEFAULT_KEYBINDINGS,
  useKeybindingManager,
} from './useKeybindingManager';

describe('useKeybindingManager', () => {
  it('normalizes keyboard events accurately', () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const event1 = {
      key: 'n',
      ctrlKey: !isMac,
      metaKey: isMac,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent;
    expect(normalizeKeyEvent(event1)).toBe(isMac ? 'Cmd+N' : 'Ctrl+N');

    const event2 = {
      key: 'F11',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent;
    expect(normalizeKeyEvent(event2)).toBe('F11');
  });

  it('detects no conflicts by default and detects conflict when two actions share the same key', () => {
    const { result: defaultResult } = renderHook(() => useKeybindingManager({}));
    expect(defaultResult.current.conflicts.length).toBe(0);

    const { result: conflictResult } = renderHook(() =>
      useKeybindingManager({
        close_tab: 'CmdOrCtrl+N', // conflicts with new_session
      })
    );
    expect(conflictResult.current.conflicts.length).toBeGreaterThan(0);
    const hasConflict = conflictResult.current.conflicts.some(c =>
      c.actions.some(a => a.id === 'new_session') && c.actions.some(a => a.id === 'close_tab')
    );
    expect(hasConflict).toBe(true);
  });

  it('correctly matches action with matchesAction', () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const { result } = renderHook(() => useKeybindingManager({}));

    const event = {
      key: 'n',
      ctrlKey: !isMac,
      metaKey: isMac,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    expect(result.current.matchesAction(event, 'new_session')).toBe(true);
    expect(result.current.matchesAction(event, 'close_tab')).toBe(false);
  });

  it('formats display symbols nicely', () => {
    const formatted = formatKeyDisplay('CmdOrCtrl+Shift+P');
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
  });
});

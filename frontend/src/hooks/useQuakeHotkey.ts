import { useState, useEffect } from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { models } from '../../wailsjs/go/models';

interface UseQuakeHotkeyOptions {
  settings: models.AppSettings;
}

export function useQuakeHotkey({ settings }: UseQuakeHotkeyOptions) {
  const [isQuakeDropdownOpen, setIsQuakeDropdownOpen] = useState(false);
  const [hasOpenedQuake, setHasOpenedQuake] = useState(false);

  useEffect(() => {
    const handleQuakeKeyDown = (e: KeyboardEvent) => {
      const isQuakeEnabled = (settings as any).enableQuakeMode;
      const hotkey = (settings as any).quakeHotkey || 'Ctrl+`';

      let match = false;
      if (hotkey === 'Ctrl+`' && (e.ctrlKey || e.metaKey) && e.key === '`') {
        match = true;
      } else if (hotkey === 'F12' && e.key === 'F12') {
        match = true;
      } else if (hotkey === 'Alt+`' && e.altKey && e.key === '`') {
        match = true;
      } else if (hotkey === 'F10' && e.key === 'F10') {
        match = true;
      }

      if (match) {
        e.preventDefault();
        setHasOpenedQuake(true);
        setIsQuakeDropdownOpen(prev => !prev);
        const appRpc = (window as any).go?.app?.App;
        if (appRpc?.ToggleQuakeWindow) {
          appRpc.ToggleQuakeWindow((settings as any).quakeHeightPercent || 50);
        }
      }
    };

    const unlistenQuake = EventsOn('quake-toggle', () => {
      setHasOpenedQuake(true);
      setIsQuakeDropdownOpen(prev => !prev);
    });

    window.addEventListener('keydown', handleQuakeKeyDown);
    return () => {
      unlistenQuake();
      window.removeEventListener('keydown', handleQuakeKeyDown);
    };
  }, [settings]);

  return {
    isQuakeDropdownOpen,
    setIsQuakeDropdownOpen,
    hasOpenedQuake,
    setHasOpenedQuake,
  };
}

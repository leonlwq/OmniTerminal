import { useEffect } from 'react';
import { models, app } from '../../wailsjs/go/models';

interface UseAppThemeEffectOptions {
  settings: models.AppSettings;
  openTabs: app.SessionConfig[];
}

export function useAppThemeEffect({ settings, openTabs }: UseAppThemeEffectOptions) {
  const hasWindowOpacity = typeof settings.windowOpacity === 'number' && settings.windowOpacity < 1.0;
  const hasTerminalOpacity = typeof settings.terminalOpacity === 'number' && settings.terminalOpacity < 1.0;
  const hasTabOpacity = openTabs.some(t => ((t.overrideTerminalOpacity && t.overrideTerminalOpacity > 0 && t.overrideTerminalOpacity < 1.0) || Boolean(t.backgroundImage)));
  const isTranslucentMode = hasWindowOpacity || hasTerminalOpacity || hasTabOpacity;

  useEffect(() => {
    const isLightMode = (settings as any).appThemeMode === 'light' ||
      ((settings as any).appThemeMode === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches) ||
      (!(settings as any).appThemeMode && (settings.themeName === 'Classic Light' || settings.themeName === 'Light' || settings.themeName === 'GitHub Light' || settings.themeName === 'Solarized Light'));

    if (isLightMode) {
      document.documentElement.className = 'theme-light';
      document.body.className = 'theme-light';
    } else {
      document.documentElement.className = 'theme-dark';
      document.body.className = 'theme-dark';
    }

    const appEl = document.getElementById('root');

    if (isTranslucentMode) {
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      if (appEl) {
        if (hasWindowOpacity) {
          appEl.style.backgroundColor = `rgba(${isLightMode ? '248, 250, 252' : '15, 17, 21'}, ${settings.windowOpacity})`;
          if (settings.enableBlur) {
            appEl.style.backdropFilter = 'blur(16px)';
            (appEl.style as any).webkitBackdropFilter = 'blur(16px)';
          } else {
            appEl.style.backdropFilter = 'none';
            (appEl.style as any).webkitBackdropFilter = 'none';
          }
        } else {
          appEl.style.backgroundColor = 'transparent';
          appEl.style.backdropFilter = 'none';
          (appEl.style as any).webkitBackdropFilter = 'none';
        }
      }
    } else {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      if (appEl) {
        appEl.style.backgroundColor = '';
        appEl.style.backdropFilter = 'none';
        (appEl.style as any).webkitBackdropFilter = 'none';
      }
    }
  }, [
    (settings as any).appThemeMode,
    settings.themeName,
    settings.windowOpacity,
    settings.terminalOpacity,
    settings.enableBlur,
    openTabs,
    isTranslucentMode,
    hasWindowOpacity
  ]);

  return { isTranslucentMode };
}

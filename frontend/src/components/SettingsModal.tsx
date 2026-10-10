import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Palette, Shield, Layers, Sliders, Terminal, Command, Monitor, Info, Sparkles
} from 'lucide-react';
import { models } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';
import { SettingsAppearanceTab } from './settings_modal/SettingsAppearanceTab';
import { SettingsSecurityTab } from './settings_modal/SettingsSecurityTab';
import { SettingsQuickCmdsTab } from './settings_modal/SettingsQuickCmdsTab';
import { SettingsInteractionTab } from './settings_modal/SettingsInteractionTab';
import { SettingsTemplateTab } from './settings_modal/SettingsTemplateTab';
import { SettingsStatusBarTab } from './settings_modal/SettingsStatusBarTab';
import { SettingsOSTab } from './settings_modal/SettingsOSTab';
import { SettingsAICopilotTab } from './settings_modal/SettingsAICopilotTab';
import { SettingsAboutTab } from './settings_modal/SettingsAboutTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
  onSaveSettings: (e: React.FormEvent) => void;
  onEnableMasterPassword: (pwd: string) => Promise<void>;
  onDisableMasterPassword: (pwd: string) => Promise<void>;
  initialTab?: 'appearance' | 'security' | 'quickCmds' | 'interaction' | 'statusBar' | 'template' | 'os' | 'ai' | 'about';
  onOpenKeybindingManager?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onSaveSettings,
  onEnableMasterPassword,
  onDisableMasterPassword,
  initialTab = 'appearance',
  onOpenKeybindingManager,
}) => {
  if (!isOpen) return null;

  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'appearance' | 'security' | 'quickCmds' | 'interaction' | 'statusBar' | 'template' | 'os' | 'ai' | 'about'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] max-w-[860px] w-full flex flex-col h-[620px] overflow-hidden rounded-lg text-[#cccccc]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#e0e0e0] leading-tight">
                {t('settings.title') || '全局偏好设置'}
              </h2>
              <span className="text-[11px] text-[#858585] font-normal">OmniTerminal Global Preferences</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-white rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Double Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Side Tabs */}
          <div className="w-52 bg-[#181818] border-r border-[#2b2b2b] p-2 space-y-0.5 shrink-0 overflow-y-auto">
            <button 
              onClick={() => setActiveTab('appearance')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'appearance' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>{t('settings.tab.appearance')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'security' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>{t('settings.tab.security')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('quickCmds')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'quickCmds' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>{t('settings.tab.quickCmds')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('interaction')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'interaction' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>{t('settings.tab.interaction')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('statusBar')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'statusBar' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 shrink-0" />
              <span>{t('settings.tab.statusBar')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('template')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'template' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Command className="w-3.5 h-3.5 shrink-0" />
              <span>默认会话模板</span>
            </button>
            <button 
              onClick={() => setActiveTab('os')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'os' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" />
              <span>原生桌面 / 系统集成</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                activeTab === 'ai' 
                  ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                  : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span>AI Copilot</span>
            </button>
            <div className="pt-1.5 border-t border-[#2b2b2b]">
              <button 
                onClick={() => setActiveTab('about')}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r font-medium transition-colors flex items-center space-x-2 border-l-2 ${
                  activeTab === 'about' 
                    ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                    : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] border-l-transparent'
                }`}
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{t('settings.tab.about')}</span>
              </button>
            </div>
          </div>

          {/* View Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e] space-y-4 text-xs text-[#cccccc]">
            {activeTab === 'appearance' && (
              <SettingsAppearanceTab 
                settings={settings} 
                setSettings={setSettings} 
                onSaveSettings={onSaveSettings} 
              />
            )}

            {activeTab === 'security' && (
              <SettingsSecurityTab 
                settings={settings} 
                setSettings={setSettings} 
                onEnableMasterPassword={onEnableMasterPassword} 
                onDisableMasterPassword={onDisableMasterPassword} 
              />
            )}

            {activeTab === 'quickCmds' && (
              <SettingsQuickCmdsTab 
                settings={settings} 
                setSettings={setSettings} 
              />
            )}

            {activeTab === 'interaction' && (
              <SettingsInteractionTab 
                settings={settings} 
                setSettings={setSettings} 
                onOpenKeybindingManager={onOpenKeybindingManager} 
                onClose={onClose}
              />
            )}

            {activeTab === 'template' && (
              <SettingsTemplateTab 
                settings={settings} 
                setSettings={setSettings} 
              />
            )}

            {activeTab === 'statusBar' && (
              <SettingsStatusBarTab 
                settings={settings} 
                setSettings={setSettings} 
              />
            )}

            {activeTab === 'os' && (
              <SettingsOSTab 
                settings={settings} 
                setSettings={setSettings} 
              />
            )}

            {activeTab === 'ai' && (
              <SettingsAICopilotTab 
                settings={settings} 
                setSettings={setSettings} 
                onSaveSettings={onSaveSettings}
              />
            )}

            {activeTab === 'about' && (
              <SettingsAboutTab />
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

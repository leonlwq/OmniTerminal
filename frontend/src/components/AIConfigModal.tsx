import { useI18n } from '../i18n/I18nContext';
import React, { useState, useEffect } from 'react';
import {
  Sparkles, Settings, X, Check, AlertCircle, RefreshCw,
  Eye, EyeOff, Sliders, Server, Cpu, Key, Globe, ShieldCheck
} from 'lucide-react';
import { models } from '../../wailsjs/go/models';
import { AITestConnection } from '../../wailsjs/go/app/App';

export interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiConfig: models.AIConfig | {
    provider: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  onSaveAIConfig: (config: models.AIConfig) => void;
}

interface ProviderPreset {
  id: string;
  name: string;
  badge: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models: string[];
  keyHint?: string;
}

const getProviderPresets = (t: (key: string) => string): ProviderPreset[] => [
  {
    id: 'deepseek',
    name: t('aiConfig.deepseekName'),
    badge: t('aiConfig.badgeOfficial'),
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyHint: t('aiConfig.deepseekHint'),
  },
  {
    id: 'ollama',
    name: t('aiConfig.ollamaName'),
    badge: t('aiConfig.badgeLocal'),
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    models: ['llama3', 'deepseek-r1:8b', 'qwen2.5:7b', 'mistral', 'codellama'],
    keyHint: t('aiConfig.ollamaHint'),
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o / GPT-4o-mini)',
    badge: t('aiConfig.badgeOfficialEndpoint'),
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
    keyHint: t('aiConfig.openaiHint'),
  },
  {
    id: 'gemini',
    name: t('aiConfig.geminiName'),
    badge: 'Google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    keyHint: t('aiConfig.geminiHint'),
  },
  {
    id: 'claude',
    name: t('aiConfig.claudeName'),
    badge: 'Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    keyHint: t('aiConfig.claudeHint'),
  },
  {
    id: 'custom',
    name: t('aiConfig.customName'),
    badge: t('aiConfig.badgeCustom'),
    defaultBaseUrl: '',
    defaultModel: '',
    models: [],
    keyHint: t('aiConfig.customHint'),
  },
];

export function AIConfigModal({
  isOpen,
  onClose,
  aiConfig,
  onSaveAIConfig,
}: AIConfigModalProps) {
  const { t } = useI18n();
  const PROVIDER_PRESETS = getProviderPresets(t);
  const [formData, setFormData] = useState<models.AIConfig>(() => {
    return new models.AIConfig({
      provider: aiConfig?.provider || 'deepseek',
      apiKey: aiConfig?.apiKey || '',
      baseUrl: aiConfig?.baseUrl || 'https://api.deepseek.com/v1',
      model: aiConfig?.model || 'deepseek-chat',
      temperature: aiConfig?.temperature !== undefined ? aiConfig.temperature : 0.2,
      maxTokens: aiConfig?.maxTokens || 2048,
      systemPrompt: aiConfig?.systemPrompt || '',
    });
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // 打开弹窗时，用外部最新配置重置表单
  useEffect(() => {
    if (isOpen) {
      const p = aiConfig?.provider || 'deepseek';
      const preset = PROVIDER_PRESETS.find(pr => pr.id === p);
      setFormData(new models.AIConfig({
        provider: p,
        apiKey: aiConfig?.apiKey || '',
        baseUrl: aiConfig?.baseUrl || preset?.defaultBaseUrl || 'https://api.deepseek.com/v1',
        model: aiConfig?.model || preset?.defaultModel || 'deepseek-chat',
        temperature: aiConfig?.temperature !== undefined ? aiConfig.temperature : 0.2,
        maxTokens: aiConfig?.maxTokens || 2048,
        systemPrompt: aiConfig?.systemPrompt || '',
      }));
      setTestStatus('idle');
      setTestResultMsg(null);
      setIsSavedRecently(false);
    }
  }, [isOpen, aiConfig]);

  if (!isOpen) return null;

  const currentPreset = PROVIDER_PRESETS.find(p => p.id === formData.provider) || PROVIDER_PRESETS[PROVIDER_PRESETS.length - 1];

  // 切换服务商时智能切换默认参数
  const handleProviderChange = (newProvider: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === newProvider);
    setFormData(prev => new models.AIConfig({
      ...prev,
      provider: newProvider,
      baseUrl: preset?.defaultBaseUrl || prev.baseUrl,
      model: preset?.defaultModel || prev.model,
    }));
    setTestStatus('idle');
    setTestResultMsg(null);
  };

  // 测试连通性
  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestResultMsg(null);

    try {
      const testConfig = new models.AIConfig({
        ...formData,
        baseUrl: formData.baseUrl.trim(),
        model: formData.model.trim(),
        apiKey: formData.apiKey.trim(),
      });

      const ok = await AITestConnection(testConfig);
      if (ok) {
        setTestStatus('success');
        setTestResultMsg(t('aiConfig.testSuccess'));
      } else {
        setTestStatus('error');
        setTestResultMsg(t('aiConfig.testEmpty'));
      }
    } catch (err: any) {
      setTestStatus('error');
      const errStr = err?.message || String(err);
      if (formData.provider === 'ollama' && (errStr.includes('404') || errStr.includes('not found'))) {
        setTestResultMsg(t('aiConfig.ollama404').replace('{model}', formData.model));
      } else if (formData.provider === 'ollama' && (errStr.includes('connection refused') || errStr.includes('dial tcp'))) {
        setTestResultMsg(t('aiConfig.ollamaConnErr').replace('{url}', formData.baseUrl));
      } else if (errStr.includes('401') || errStr.includes('Unauthorized')) {
        setTestResultMsg(t('aiConfig.auth401'));
      } else {
        setTestResultMsg(t('aiConfig.testFailed').replace('{err}', errStr));
      }
    }
  };

  // 保存设置
  const handleSave = () => {
    let finalBaseUrl = formData.baseUrl.trim();
    let finalModel = formData.model.trim();

    // 空值兜底
    if (!finalBaseUrl && currentPreset.defaultBaseUrl) {
      finalBaseUrl = currentPreset.defaultBaseUrl;
    }
    if (!finalModel && currentPreset.defaultModel) {
      finalModel = currentPreset.defaultModel;
    }

    const payload = new models.AIConfig({
      ...formData,
      baseUrl: finalBaseUrl,
      model: finalModel,
      apiKey: formData.apiKey.trim(),
    });

    onSaveAIConfig(payload);
    setIsSavedRecently(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[#e0e0e0]">{t('aiConfig.title')}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#2d2d2d] border border-[#3c3c3c] text-[#0078d4] font-mono">
                  {formData.provider}
                </span>
              </div>
              <p className="text-[11px] text-[#858585] mt-0.5">
                {t('aiConfig.desc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#333333] transition-colors"
            title={t('aiConfig.closeEsc')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-[#1e1e1e]">
          {/* Provider Selection */}
          <div>
            <label className="text-xs font-semibold text-[#cccccc] flex items-center gap-1.5 mb-1.5">
              <Server className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>{t('aiConfig.provider')}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDER_PRESETS.map(preset => {
                const isSelected = formData.provider === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleProviderChange(preset.id)}
                    className={`px-3 py-2 rounded border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-[#04395e] border-[#0078d4] text-[#ffffff] shadow-sm'
                        : 'bg-[#252526] border-[#2b2b2b] text-[#cccccc] hover:bg-[#2a2d2e] hover:border-[#3c3c3c]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold">{preset.id.toUpperCase()}</span>
                      <span className={`text-[9px] px-1 rounded font-normal ${
                        isSelected ? 'bg-[#0078d4]/40 text-white' : 'bg-[#1e1e1e] text-[#858585]'
                      }`}>
                        {preset.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#858585] mt-1 truncate">
                      {preset.id === 'ollama' ? '本地免密私有' : preset.id === 'deepseek' ? '超高性价比' : preset.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#cccccc] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>{t('aiConfig.modelName')}</span>
              </label>
              <span className="text-[10px] text-[#858585]">{t('aiConfig.modelHint')}</span>
            </div>
            <input
              type="text"
              value={formData.model}
              onChange={e => {
                setFormData(prev => new models.AIConfig({ ...prev, model: e.target.value }));
                setTestStatus('idle');
              }}
              placeholder={currentPreset.defaultModel || 'deepseek-chat'}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] placeholder-[#858585] font-mono outline-none transition-all"
            />
            {/* Quick Model Tags */}
            {currentPreset.models.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-[#858585] mr-0.5">{t('aiConfig.commonModels')}</span>
                {currentPreset.models.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setFormData(prev => new models.AIConfig({ ...prev, model: m }));
                      setTestStatus('idle');
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                      formData.model === m
                        ? 'bg-[#0078d4] text-white font-semibold shadow-sm'
                        : 'bg-[#252526] border border-[#3c3c3c] text-[#cccccc] hover:bg-[#2a2d2e]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Base URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#cccccc] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>{t('aiConfig.baseUrl')}</span>
              </label>
              {currentPreset.defaultBaseUrl && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => new models.AIConfig({ ...prev, baseUrl: currentPreset.defaultBaseUrl }))}
                  className="text-[10px] text-[#0078d4] hover:underline"
                >
                  {t('aiConfig.resetDefault')}
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={e => {
                setFormData(prev => new models.AIConfig({ ...prev, baseUrl: e.target.value }));
                setTestStatus('idle');
              }}
              placeholder={currentPreset.defaultBaseUrl || 'https://api.openai.com/v1'}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] placeholder-[#858585] font-mono outline-none transition-all"
            />
            {formData.provider === 'ollama' && (
              <p className="text-[10px] text-[#cca700] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{t('aiConfig.ollamaHint')}</span>
              </p>
            )}
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#cccccc] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#cca700]" />
                <span>{t('aiConfig.apiKey')}</span>
              </label>
              <span className="text-[10px] text-[#858585]">
                {currentPreset.keyHint || t('aiConfig.encryptedHint')}
              </span>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={e => {
                  setFormData(prev => new models.AIConfig({ ...prev, apiKey: e.target.value }));
                  setTestStatus('idle');
                }}
                placeholder={formData.provider === 'ollama' ? t('aiConfig.ollamaKeyPlaceholder') : 'sk-...'}
                className="w-full pl-3 pr-9 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] placeholder-[#858585] font-mono outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#cccccc] transition-colors"
                title={showApiKey ? t('aiConfig.hideKey') : t('aiConfig.showKey')}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Advanced Collapsible */}
          <div className="border-t border-[#2b2b2b] pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs text-[#858585] hover:text-[#cccccc] transition-colors py-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>{t('aiConfig.advancedParams')}</span>
              </span>
              <span className="text-[10px] text-[#0078d4]">{showAdvanced ? '收起 ▲' : '展开 ▼'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-[#252526] border border-[#2b2b2b] rounded space-y-3 animate-in slide-in-from-top-1 duration-150 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#858585] text-[11px]">{t('aiConfig.tempLabel')} <span className="text-[#e0e0e0] font-mono">{formData.temperature}</span></label>
                    <span className="text-[10px] text-[#858585]">{t('aiConfig.tempHint')}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.temperature}
                    onChange={e => setFormData(prev => new models.AIConfig({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-[#0078d4] h-1.5 bg-[#1e1e1e] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[#858585] text-[11px] block mb-1">{t('aiConfig.maxTokens')}</label>
                  <input
                    type="number"
                    value={formData.maxTokens || 2048}
                    onChange={e => setFormData(prev => new models.AIConfig({ ...prev, maxTokens: parseInt(e.target.value, 10) || 2048 }))}
                    className="w-full px-2.5 py-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#858585] text-[11px] block mb-1">{t('aiConfig.sysPrompt')}</label>
                  <textarea
                    rows={2}
                    value={formData.systemPrompt}
                    onChange={e => setFormData(prev => new models.AIConfig({ ...prev, systemPrompt: e.target.value }))}
                    placeholder={t("aiConfig.sysPromptPlaceholder")}
                    className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] placeholder-[#858585] outline-none resize-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Status Banner */}
          {testStatus === 'testing' && (
            <div className="p-3 rounded bg-[#0078d4]/15 border border-[#0078d4]/40 text-[#75beff] text-xs flex items-center gap-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0078d4] shrink-0" />
              <span>{t('aiConfig.testingConn').replace('{provider}', formData.provider).replace('{model}', formData.model)}</span>
            </div>
          )}
          {testStatus === 'success' && (
            <div className="p-3 rounded bg-[#388a34]/15 border border-[#388a34]/40 text-[#89d185] text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#89d185] shrink-0" />
              <span>{testResultMsg}</span>
            </div>
          )}
          {testStatus === 'error' && (
            <div className="p-3 rounded bg-[#a1260d]/15 border border-[#a1260d]/40 text-[#f48771] text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-[#f48771] shrink-0 mt-0.5" />
              <div className="flex-1">{testResultMsg}</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={testStatus === 'testing'}
            onClick={handleTestConnection}
            className="px-3 py-1 rounded border border-[#3c3c3c] bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin text-[#0078d4]' : 'text-[#858585]'}`} />
            <span>{t('aiConfig.testBtn')}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 rounded text-xs text-[#cccccc] hover:text-white hover:bg-[#333333] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-4 py-1 rounded text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 ${
                isSavedRecently
                  ? 'bg-[#388a34]'
                  : 'bg-[#0078d4] hover:bg-[#006cbe]'
              }`}
            >
              {isSavedRecently ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>{t('common.saved')}</span>
                </>
              ) : (
                <span>{t('common.save')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

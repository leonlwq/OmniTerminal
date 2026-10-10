import React, { useState } from 'react';
import {
  Sparkles, Key, Globe, Cpu, Check, AlertTriangle,
  RefreshCw, Eye, EyeOff, Terminal, Sliders, ShieldCheck, Zap
} from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { AITestConnection } from '../../../wailsjs/go/app/App';

interface SettingsAICopilotTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
  onSaveSettings: (e: React.FormEvent) => void;
}

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek (深度求索)', defaultUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', desc: '国内极速访问，高智商代码与运维理解，资费极低，强烈推荐' },
  { id: 'ollama', name: 'Ollama (本地私有离线)', defaultUrl: 'http://localhost:11434/v1', defaultModel: 'llama3', desc: '完全本地离线运行，数据绝不出局域网，免 API Key' },
  { id: 'openai', name: 'OpenAI (GPT-4o)', defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', desc: '国际标准模型，支持 gpt-4o 与 gpt-4o-mini' },
  { id: 'claude', name: 'Claude (Anthropic)', defaultUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet-20241022', desc: '极高代码精准度，支持通过兼容中转代理接入' },
  { id: 'gemini', name: 'Google Gemini', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-1.5-flash', desc: 'Google 官方模型 API' },
  { id: 'custom', name: 'Custom (自定义 OpenAI 协议)', defaultUrl: '', defaultModel: '', desc: '兼容任意 OpenAI 标准 /v1/chat/completions 网关或 OneAPI' },
];

export const SettingsAICopilotTab: React.FC<SettingsAICopilotTabProps> = ({
  settings,
  setSettings,
  onSaveSettings,
}) => {
  const aiCfg = settings.aiConfig || new models.AIConfig({
    provider: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 0.2,
    maxTokens: 2048,
    systemPrompt: '',
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  const updateAIConfig = (partial: Partial<models.AIConfig>) => {
    const updated = new models.AIConfig({
      ...aiCfg,
      ...partial,
    });
    setSettings(new models.AppSettings({
      ...settings,
      aiConfig: updated,
    }));
  };

  const handleProviderSelect = (providerId: string) => {
    const p = PROVIDERS.find(x => x.id === providerId);
    if (p) {
      updateAIConfig({
        provider: providerId,
        baseUrl: p.defaultUrl,
        model: p.defaultModel,
      });
    } else {
      updateAIConfig({ provider: providerId });
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const ok = await AITestConnection(aiCfg);
      const elapsed = Math.round(performance.now() - start);
      if (ok) {
        setTestResult({
          success: true,
          message: `连接成功！模型端点响应正常`,
          latency: elapsed,
        });
      } else {
        setTestResult({
          success: false,
          message: `连接失败：服务端未返回有效数据`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || String(err) || '网络超时或凭据无效',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={onSaveSettings} className="space-y-5 text-xs text-[#cccccc]">
      {/* 标题说明 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-[#0078d4] to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">AI Copilot 大模型引擎配置</h3>
              <p className="text-[11px] text-[#858585]">
                驱动终端 ⌘K / Ctrl+K 行内命令生成、报错一键修复与运维脚本工坊
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-700/50 font-mono">
            Phase 8.2 内置
          </span>
        </div>
      </div>

      {/* 模型供应商选择 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#0078d4]" />
          选择 AI 供应商 (Provider)
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          {PROVIDERS.map((p) => {
            const isSelected = (aiCfg.provider || 'deepseek').toLowerCase() === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleProviderSelect(p.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#04395e]/40 border-[#0078d4] text-white shadow-sm'
                    : 'bg-[#1e1e1e] border-[#333333] hover:border-[#505050] text-[#9d9d9d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-[#cccccc]'}`}>
                    {p.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#3794ff]" />}
                </div>
                <div className="text-[10px] text-[#858585] mt-1 line-clamp-2 leading-relaxed">
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API 参数配置 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-[#0078d4]" />
          服务地址与认证凭据
        </h4>

        <div className="space-y-3">
          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-[#858585]">
                API Key (密钥凭据)
              </label>
              {aiCfg.provider === 'ollama' && (
                <span className="text-[10px] text-emerald-400">本地 Ollama 服务无需填写 API Key</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={aiCfg.apiKey || ''}
                onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                placeholder={aiCfg.provider === 'ollama' ? '本地运行无需 API Key' : 'sk-...'}
                disabled={aiCfg.provider === 'ollama'}
                className="w-full px-3 py-1.5 pr-10 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none transition-all"
              />
              {aiCfg.provider !== 'ollama' && (
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#cccccc] p-1 rounded"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Base URL & Model ID */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585] flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#858585]" />
                API Base URL (端点服务地址)
              </label>
              <input
                type="text"
                value={aiCfg.baseUrl || ''}
                onChange={(e) => updateAIConfig({ baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
                className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585] flex items-center gap-1">
                <Terminal className="w-3 h-3 text-[#858585]" />
                Model ID (模型名称)
              </label>
              <input
                type="text"
                value={aiCfg.model || ''}
                onChange={(e) => updateAIConfig({ model: e.target.value })}
                placeholder="deepseek-chat"
                className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none transition-all"
              />
            </div>
          </div>

          {/* Temperature & Max Tokens */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#858585]">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#858585]" />
                  Temperature (发散度):
                </span>
                <span className="font-mono text-white font-medium">{aiCfg.temperature ?? 0.2}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={aiCfg.temperature ?? 0.2}
                onChange={(e) => updateAIConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-[#0078d4] cursor-pointer"
              />
              <div className="text-[9px] text-[#858585]">推荐 0.2 以保证生成的命令严谨准确，避免指令幻觉</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">Max Tokens (单次上限)</label>
              <input
                type="number"
                min={256}
                max={8192}
                value={aiCfg.maxTokens || 2048}
                onChange={(e) => updateAIConfig({ maxTokens: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none transition-all"
              />
            </div>
          </div>

          {/* Custom System Prompt */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-[#858585]">
              自定义 System Prompt (系统提示词，留空使用官方预置优化版)
            </label>
            <textarea
              rows={2}
              value={aiCfg.systemPrompt || ''}
              onChange={(e) => updateAIConfig({ systemPrompt: e.target.value })}
              placeholder="留空则自动注入专家级运维命令转换与排障系统指令..."
              className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* 测试连通性按钮与反馈 */}
        <div className="pt-2 border-t border-[#2b2b2b] flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || (aiCfg.provider !== 'ollama' && !aiCfg.apiKey?.trim())}
            className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] disabled:bg-[#252526] disabled:text-[#555555] border border-[#3c3c3c] rounded text-xs text-[#cccccc] hover:text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {testing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0078d4]" />
                <span>正在测试 API 连通性...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>测试 API 连接 (Test Connection)</span>
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300'
                  : 'bg-red-950/70 border border-red-700/60 text-red-300'
              }`}
            >
              {testResult.success ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{testResult.message} ({testResult.latency}ms)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="truncate max-w-[280px]">{testResult.message}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-5 py-2 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] text-white rounded font-medium text-xs tracking-wide transition-all shadow-sm flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>保存 AI 配置 (Save Preferences)</span>
        </button>
      </div>
    </form>
  );
};

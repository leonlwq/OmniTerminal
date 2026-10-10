import React, { useState } from 'react';
import {
  Cloud, CloudUpload, CloudDownload, Shield, Lock, CheckCircle2,
  AlertTriangle, RefreshCw, X, Users, Copy, Download, KeyRound, Server
} from 'lucide-react';
import { CloudSyncConfig } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: CloudSyncConfig;
  onSaveSyncConfig: (cfg: CloudSyncConfig) => void;
  onRefreshData?: () => void;
}

export function CloudSyncModal({
  isOpen,
  onClose,
  syncConfig,
  onSaveSyncConfig,
  onRefreshData,
}: CloudSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'sync' | 'team'>('sync');
  const [config, setConfig] = useState<CloudSyncConfig>(syncConfig || {
    provider: 'webdav',
    serverUrl: '',
    username: '',
    password: '',
    remotePath: '/OmniTerminal/backup.omnisync',
    gistToken: '',
    gistId: '',
    autoSyncOnStartup: false,
    autoSyncIntervalMinutes: 0,
    lastSyncTime: '',
  });

  const [masterPassword, setMasterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [sanitizedJson, setSanitizedJson] = useState<string | null>(null);
  const [copiedTeam, setCopiedTeam] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setLoading(true);
    setActionStatus(null);
    try {
      const appRpc = (window as any).go?.app?.App;
      if (!appRpc?.CloudSyncTest) throw new Error("CloudSyncTest RPC not available");
      const ok = await appRpc.CloudSyncTest(config);
      if (ok) {
        setActionStatus({ type: 'success', message: '✓ 云端点认证与连通性测试成功！' });
        onSaveSyncConfig(config);
      } else {
        setActionStatus({ type: 'error', message: '连通性测试未通过，请检查 URL 与认证凭据或 Token 权限' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: '测试连接失败: ' + (err?.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!masterPassword) {
      setActionStatus({ type: 'error', message: '必须输入主密码以对同步数据进行 AES-256-GCM 高强度加密' });
      return;
    }
    setLoading(true);
    setActionStatus(null);
    try {
      const appRpc = (window as any).go?.app?.App;
      if (!appRpc?.CloudSyncPush) throw new Error("CloudSyncPush RPC not available");
      await appRpc.CloudSyncPush(config, masterPassword);
      setActionStatus({ type: 'success', message: '✓ 已成功加密全量会话配置并推送到云端！' });
      onSaveSyncConfig(config);
    } catch (err: any) {
      setActionStatus({ type: 'error', message: '云端推送失败: ' + (err?.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!masterPassword) {
      setActionStatus({ type: 'error', message: '必须输入主密码以解密云端同步数据' });
      return;
    }
    if (!confirm("从云端拉取将增量合并到本地会话列表与配置，是否继续？")) return;

    setLoading(true);
    setActionStatus(null);
    try {
      const appRpc = (window as any).go?.app?.App;
      if (!appRpc?.CloudSyncPull) throw new Error("CloudSyncPull RPC not available");
      const summary = await appRpc.CloudSyncPull(config, masterPassword);
      
      const newCfg = { ...config, lastSyncTime: summary.syncedAt };
      if (summary.gistId && !newCfg.gistId) {
        newCfg.gistId = summary.gistId;
      }
      setConfig(newCfg);
      onSaveSyncConfig(newCfg);

      const added = summary.sessionsAdded ?? 0;
      const updated = summary.sessionsUpdated ?? summary.sessionsCount;
      const preserved = summary.sessionsPreserved ?? 0;

      setActionStatus({
        type: 'success',
        message: `✓ 成功从云端增量恢复: 会话(${summary.sessionsCount} 个: 新增 ${added}, 更新 ${updated}, 保留本地 ${preserved}), 认证档案 ${summary.authProfilesCount} 个, 快捷命令集 ${summary.quickCmdSetsCount} 个`,
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: '云端拉取恢复失败: ' + (err?.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTeamPackage = async () => {
    setLoading(true);
    try {
      const appRpc = (window as any).go?.app?.App;
      if (!appRpc?.ExportSanitizedTeamPackage) throw new Error("ExportSanitizedTeamPackage RPC not available");
      const res = await appRpc.ExportSanitizedTeamPackage('');
      setSanitizedJson(res);
    } catch (err: any) {
      alert("生成脱敏团队资产包失败: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTeamJson = () => {
    if (sanitizedJson) {
      navigator.clipboard.writeText(sanitizedJson);
      setCopiedTeam(true);
      setTimeout(() => setCopiedTeam(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg w-full max-w-2xl shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden text-[#cccccc] max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#e0e0e0] flex items-center gap-2">
                端到端加密云同步与团队资产协作 (E2EE Cloud Sync)
              </h3>
              <p className="text-[11px] text-[#858585]">基于 AES-256-GCM 保护的会话多端漫游与脱敏共享</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-[#e0e0e0] p-1.5 rounded hover:bg-[#333333] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#2b2b2b] bg-[#181818] px-4 pt-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t flex items-center gap-1.5 transition-all ${
              activeTab === 'sync'
                ? 'bg-[#252526] text-[#0078d4] border-t-2 border-t-[#0078d4] border-x border-[#2b2b2b]'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>WebDAV / 云存储同步</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t flex items-center gap-1.5 transition-all ${
              activeTab === 'team'
                ? 'bg-[#252526] text-[#0078d4] border-t-2 border-t-[#0078d4] border-x border-[#2b2b2b]'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>团队资产脱敏导出</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs bg-[#1e1e1e]">
          
          {activeTab === 'sync' && (
            <div className="space-y-4">
              
              {/* Security Banner */}
              <div className="p-3 bg-[#0078d4]/10 border border-[#0078d4]/30 rounded flex items-start gap-2.5 text-[#cccccc]">
                <Shield className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <span className="font-bold text-[#e0e0e0]">端到端加密安全保证 (Zero-Knowledge):</span> 所有会话、密码与私钥在离开本机前均由您指定的主密码派生密钥进行 AES-256-GCM 强加密。云存储服务商仅能保存密文，无法窥探任何明文资产。
                </div>
              </div>

              {/* Form Grid */}
              <div className="space-y-3 bg-[#252526] p-3.5 rounded border border-[#2b2b2b]">
                <div>
                  <label className="text-[#858585] block mb-1">同步服务提供商 (Provider):</label>
                  <select
                    value={config.provider || 'webdav'}
                    onChange={e => {
                      const p = e.target.value;
                      setConfig({
                        ...config,
                        provider: p,
                        serverUrl: p === 'webdav' && !config.serverUrl ? 'https://dav.jianguoyun.com/dav/' : config.serverUrl,
                      });
                    }}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] text-xs outline-none"
                  >
                    <option value="webdav">📁 WebDAV 网盘 (坚果云 / Nextcloud / 群晖 NAS / 自建)</option>
                    <option value="github_gist">🐙 GitHub Private Gist (无需搭建服务器，全球同步)</option>
                    <option value="gitee_gist">🚩 Gitee 码云代码片段 (国内极速直连)</option>
                    <option value="s3">🪣 S3 兼容对象存储 (AWS / MinIO / 阿里云 OSS)</option>
                  </select>
                </div>

                {/* WebDAV 预设与字段 */}
                {(config.provider === 'webdav' || !config.provider) && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-[#858585]">快捷预设:</span>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, serverUrl: 'https://dav.jianguoyun.com/dav/', remotePath: '/OmniTerminal/backup.omnisync' })}
                        className="px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#333333] border border-[#3c3c3c] text-[#cccccc] transition-colors"
                      >
                        坚果云 (Nutstore)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, serverUrl: 'https://cloud.example.com/remote.php/dav/files/USER/', remotePath: 'OmniTerminal/backup.omnisync' })}
                        className="px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#333333] border border-[#3c3c3c] text-[#cccccc] transition-colors"
                      >
                        Nextcloud
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, serverUrl: 'https://nas.local:5006/home/', remotePath: 'OmniTerminal/backup.omnisync' })}
                        className="px-2 py-0.5 rounded bg-[#1e1e1e] hover:bg-[#333333] border border-[#3c3c3c] text-[#cccccc] transition-colors"
                      >
                        群晖 Synology
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[#858585] block mb-1">WebDAV 服务器 URL:</label>
                        <input
                          type="text"
                          value={config.serverUrl || ''}
                          onChange={e => setConfig({ ...config, serverUrl: e.target.value })}
                          placeholder="https://dav.jianguoyun.com/dav/"
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[#858585] block mb-1">WebDAV 账号 / 邮箱:</label>
                        <input
                          type="text"
                          value={config.username || ''}
                          onChange={e => setConfig({ ...config, username: e.target.value })}
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[#858585] block mb-1">WebDAV 密码 / 应用专用授权码:</label>
                        <input
                          type="password"
                          value={config.password || ''}
                          onChange={e => setConfig({ ...config, password: e.target.value })}
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[#858585] block mb-1">远端存储文件路径 (Remote Path):</label>
                        <input
                          type="text"
                          value={config.remotePath || ''}
                          onChange={e => setConfig({ ...config, remotePath: e.target.value })}
                          placeholder="/OmniTerminal/backup.omnisync"
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Gist (GitHub / Gitee) 字段 */}
                {(config.provider === 'github_gist' || config.provider === 'gitee_gist') && (
                  <div className="space-y-3 pt-1">
                    <div className="p-2.5 bg-[#181818] border border-[#333333] rounded text-[11px] text-[#858585] leading-relaxed">
                      💡 {config.provider === 'github_gist' ? 'GitHub' : 'Gitee'} Gist 同步说明：数据在本地通过 AES-256-GCM 强加密后再存入私有代码片段，Token 需具备{' '}
                      <span className="text-[#0078d4] font-semibold">{config.provider === 'github_gist' ? 'gist' : 'gists'}</span> 读写权限。
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[#858585] block mb-1">
                          Personal Access Token ({config.provider === 'github_gist' ? 'ghp_...' : '访问令牌'}):
                        </label>
                        <input
                          type="password"
                          value={config.gistToken || ''}
                          onChange={e => setConfig({ ...config, gistToken: e.target.value })}
                          placeholder={config.provider === 'github_gist' ? 'ghp_xxxxxxxxxxxxxxxxxxxx' : 'gitee personal access token'}
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[#858585] block mb-1 flex items-center justify-between">
                          <span>Gist ID (留空将在首次推送时自动新建 Private Gist):</span>
                          {config.gistId && (
                            <span className="text-[#89d185] font-mono text-[10px]">已绑定: {config.gistId.slice(0, 10)}...</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={config.gistId || ''}
                          onChange={e => setConfig({ ...config, gistId: e.target.value })}
                          placeholder="留空自动创建，或填入其他设备已生成的 Gist ID"
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* S3 字段 */}
                {config.provider === 's3' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="col-span-2">
                      <label className="text-[#858585] block mb-1">S3 Endpoint URL:</label>
                      <input
                        type="text"
                        value={config.serverUrl || ''}
                        onChange={e => setConfig({ ...config, serverUrl: e.target.value })}
                        placeholder="https://s3.amazonaws.com"
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[#858585] block mb-1">Access Key ID:</label>
                      <input
                        type="text"
                        value={config.s3AccessKey || ''}
                        onChange={e => setConfig({ ...config, s3AccessKey: e.target.value })}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[#858585] block mb-1">Secret Access Key:</label>
                      <input
                        type="password"
                        value={config.s3SecretKey || ''}
                        onChange={e => setConfig({ ...config, s3SecretKey: e.target.value })}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 自动化同步设置 */}
                <div className="pt-2 border-t border-[#333333] grid grid-cols-2 gap-3 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-[#cccccc] select-none">
                    <input
                      type="checkbox"
                      checked={!!config.autoSyncOnStartup}
                      onChange={e => setConfig({ ...config, autoSyncOnStartup: e.target.checked })}
                      className="rounded bg-[#1e1e1e] border-[#3c3c3c] text-[#0078d4] focus:ring-0 focus:ring-offset-0"
                    />
                    <span>🚀 启动时自动从云端拉取同步</span>
                  </label>

                  <div className="flex items-center justify-end gap-2 text-[11px]">
                    <span className="text-[#858585]">定时增量同步:</span>
                    <select
                      value={config.autoSyncIntervalMinutes || 0}
                      onChange={e => setConfig({ ...config, autoSyncIntervalMinutes: Number(e.target.value) })}
                      className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-[#cccccc] text-xs outline-none"
                    >
                      <option value={0}>禁用定时同步</option>
                      <option value={15}>每 15 分钟</option>
                      <option value={30}>每 30 分钟</option>
                      <option value={60}>每 1 小时</option>
                      <option value={120}>每 2 小时</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Master Password Input */}
              <div className="bg-[#252526] p-3.5 rounded border border-[#2b2b2b] space-y-2">
                <label className="text-[#cccccc] font-semibold block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#cca700]" />
                  <span>加密主密码 (Master Password):</span>
                </label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  placeholder="请输入您的主密码以加解密云同步包"
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono text-xs outline-none"
                />
                <p className="text-[11px] text-[#858585]">
                  ⚠️ 无论推送到云端还是拉取恢复，都必须输入一致的主密码。
                </p>
              </div>

              {/* Status Notice */}
              {actionStatus && (
                <div className={`p-3 rounded border flex items-start gap-2 animate-in fade-in ${
                  actionStatus.type === 'success'
                    ? 'bg-[#388a34]/15 border-[#388a34]/40 text-[#89d185]'
                    : 'bg-[#a1260d]/15 border-[#a1260d]/40 text-[#f48771]'
                }`}>
                  {actionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{actionStatus.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#2b2b2b]">
                <button
                  onClick={handleTestConnection}
                  disabled={loading || !config.serverUrl}
                  className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] text-[#cccccc] rounded flex items-center gap-1.5 font-medium disabled:opacity-50 text-xs transition-colors"
                >
                  <Server className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>测试连通性</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePull}
                    disabled={loading || !masterPassword}
                    className="px-3.5 py-1 bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] text-[#cccccc] hover:text-white rounded flex items-center gap-1.5 font-medium disabled:opacity-50 text-xs transition-colors"
                    title="从云端下载并解密覆盖/合并"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>从云端拉取恢复</span>
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={loading || !masterPassword}
                    className="px-3.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded flex items-center gap-1.5 font-medium disabled:opacity-50 text-xs transition-colors"
                    title="使用主密码加密并上传到云端"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>加密推送到云端</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0078d4]/10 border border-[#0078d4]/30 rounded flex items-start gap-2.5 text-[#cccccc]">
                <Users className="w-4 h-4 text-[#0078d4] shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <span className="font-bold text-[#e0e0e0]">团队配置脱敏共享:</span> 导出包含完整会话树分组、服务器主机名、端口、标签、公共快捷命令与运维宏，但<strong className="text-white">严格清除所有密码、私钥与身份 Token</strong>，方便团队协作与新成员环境搭建。
                </div>
              </div>

              {!sanitizedJson ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3 bg-[#252526] rounded border border-[#2b2b2b]">
                  <Users className="w-8 h-8 text-[#858585]" />
                  <p className="text-[#858585]">点击下方按钮生成脱敏后的团队资产共享数据</p>
                  <button
                    onClick={handleGenerateTeamPackage}
                    disabled={loading}
                    className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded flex items-center gap-2 text-xs transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>生成脱敏团队资产包</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#cccccc]">脱敏团队数据预览:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyTeamJson}
                        className="px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded flex items-center gap-1 text-xs transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#89d185]" />
                        <span>{copiedTeam ? '已复制' : '复制 JSON'}</span>
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([sanitizedJson], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `omniterminal_team_package_${Date.now()}.json`;
                          a.click();
                        }}
                        className="px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded flex items-center gap-1 text-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>下载 .json 文件</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-[#181818] border border-[#2b2b2b] rounded font-mono text-xs text-[#89d185] overflow-x-auto max-h-72 leading-relaxed select-all">
                    {sanitizedJson}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585] shrink-0">
          <div>OmniTerminal 安全加密漫游体系</div>
          <button onClick={onClose} className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors">
            关闭
          </button>
        </div>

      </div>
    </div>
  );
}

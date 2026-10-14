import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { 
  Server, Cpu, RefreshCw, Network, Terminal, Zap, Box, Layers, Radio, Tag 
} from 'lucide-react';
import { app, models } from '../../../wailsjs/go/models';
import { ListSerialPorts, ListAvailableShells, ListWSLDistros } from '../../../wailsjs/go/app/App';

interface SessionConnectionTabProps {
  formData: any;
  setFormData: (data: any) => void;
  foldersOnly: app.SessionConfig[];
  sessions: app.SessionConfig[];
  getColorLabelClass?: (colorStr: string | undefined, isConnected: boolean) => string;
}

export function SessionConnectionTab({
  formData,
  setFormData,
  foldersOnly,
  sessions,
}: SessionConnectionTabProps) {
  const { t } = useI18n();
  const [tagInput, setTagInput] = useState('');
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [availableShells, setAvailableShells] = useState<models.SystemShellInfo[]>([]);
  const [wslDistros, setWslDistros] = useState<models.WSLDistroInfo[]>([]);
  const [isScanningPorts, setIsScanningPorts] = useState(false);

  const refreshSerialPorts = () => {
    setIsScanningPorts(true);
    ListSerialPorts()
      .then(ports => setAvailablePorts(ports || []))
      .catch(() => setAvailablePorts([]))
      .finally(() => setIsScanningPorts(false));
  };

  useEffect(() => {
    refreshSerialPorts();
    ListAvailableShells().then(shells => setAvailableShells(shells || [])).catch(() => {});
    ListWSLDistros().then(distros => setWslDistros(distros || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* 会话基本属性 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
          <Server className="w-3.5 h-3.5 text-[#0078d4]" />
          {t('sessionModal.conn.basicTitle')}
        </h4>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.sessionName')}</label>
          <input
            type="text"
            placeholder={t('sessionModal.sessionNamePlaceholder')}
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.protocol')}</label>
            <select
              value={formData.protocol || 'ssh'}
              onChange={(e) => {
                const proto = e.target.value;
                const portMap: Record<string, number> = {
                  ssh: 22,
                  mosh: 22,
                  telnet: 23,
                  rlogin: 513,
                  raw_tcp: 8080,
                  rdp: 3389,
                  vnc: 5900
                };
                setFormData({
                  ...formData,
                  protocol: proto,
                  port: portMap[proto] || formData.port,
                  serialConfig: proto === 'serial' ? (formData.serialConfig || {
                    port: availablePorts[0] || '',
                    baudRate: 115200,
                    dataBits: 8,
                    stopBits: '1',
                    parity: 'none',
                    flowControl: 'none',
                    dtr: true,
                    rts: true
                  }) : formData.serialConfig
                });
              }}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
            >
              <option value="ssh">{t("sessionModal.conn.protoSSH")}</option>
              <option value="docker">{t("sessionModal.conn.protoDocker")}</option>
              <option value="k8s">{t("sessionModal.conn.protoK8s")}</option>
              <option value="mosh">{t("sessionModal.conn.protoMosh")}</option>
              <option value="telnet">🌐 Telnet (RFC 854)</option>
              <option value="rlogin">{t("sessionModal.conn.protoRlogin")}</option>
              <option value="rdp">{t("sessionModal.conn.protoRdp")}</option>
              <option value="vnc">{t("sessionModal.conn.protoVnc")}</option>
              <option value="serial">{t("sessionModal.conn.protoSerial")}</option>
              <option value="raw_tcp">⚡ Raw TCP</option>
              <option value="local">{t("sessionModal.conn.protoLocal")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.parentFolder')}</label>
            <select
              value={formData.parentId || ''}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
            >
              <option value="">{t('sessionModal.rootFolder')}</option>
              {foldersOnly.map(f => (
                f.id !== formData.id && (
                  <option key={f.id} value={f.id}>{f.name}</option>
                )
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.colorLabel')}</label>
            <select
              value={formData.colorLabel || ''}
              onChange={(e) => setFormData({ ...formData, colorLabel: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
            >
              <option value="">{t('sessionModal.defaultColor')}</option>
              <option value="red">{t("sessionModal.conn.colorRed")}</option>
              <option value="orange">{t("sessionModal.conn.colorOrange")}</option>
              <option value="yellow">{t("sessionModal.conn.colorYellow")}</option>
              <option value="green">{t("sessionModal.conn.colorGreen")}</option>
              <option value="blue">{t("sessionModal.conn.colorBlue")}</option>
              <option value="purple">{t("sessionModal.conn.colorPurple")}</option>
              <option value="cyan">{t("sessionModal.conn.colorCyan")}</option>
            </select>
          </div>
        </div>

        {/* 会话标签 Tags */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-medium text-[#858585] flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionModal.conn.tagsLabel')}
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded min-h-[36px] items-center">
            {(formData.tags || []).map((tag: string, idx: number) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0078d4]/15 text-[#3794ff] border border-[#0078d4]/30 rounded text-[11px]"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => {
                    const updated = (formData.tags || []).filter((_: any, i: number) => i !== idx);
                    setFormData({ ...formData, tags: updated });
                  }}
                  className="hover:text-red-400 font-bold ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={t('sessionModal.addTagPlaceholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = tagInput.trim();
                  if (val && !(formData.tags || []).includes(val)) {
                    setFormData({
                      ...formData,
                      tags: [...(formData.tags || []), val]
                    });
                  }
                  setTagInput('');
                }
              }}
              className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-xs text-[#cccccc] placeholder-[#6e7681]"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#858585] pt-1">
            <span>{t('sessionModal.commonTags')}</span>
            {[t('sessionModal.conn.tagProd'), t('sessionModal.conn.tagTest'), t('sessionModal.conn.tagK8s'), t('sessionModal.conn.tagBastion'), t('sessionModal.conn.tagDB'), t('sessionModal.conn.tagRedis'), t('sessionModal.conn.tagWeb')].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (!(formData.tags || []).includes(preset)) {
                    setFormData({
                      ...formData,
                      tags: [...(formData.tags || []), preset]
                    });
                  }
                }}
                className="px-2 py-0.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded transition-colors"
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 串口模式配置 Card */}
      {formData.protocol === 'serial' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
            <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#0078d4]" />
              {t('sessionModal.conn.serialTitle')}
            </h4>
            <button
              type="button"
              onClick={refreshSerialPorts}
              disabled={isScanningPorts}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] rounded text-[#cccccc] text-xs transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isScanningPorts ? 'animate-spin' : ''}`} />
              {t('sessionModal.conn.refreshPorts')}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.serialPort')}</label>
            <div className="flex gap-2">
              <select
                value={formData.serialConfig?.port || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), port: e.target.value }
                })}
                className="w-2/3 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="">{t('sessionModal.selectPort')}</option>
                {availablePorts.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t("sessionModal.conn.serialManualPath")}
                value={formData.serialConfig?.port || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), port: e.target.value }
                })}
                className="w-1/3 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.baudRate')}</label>
              <select
                value={formData.serialConfig?.baudRate || 115200}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), baudRate: Number(e.target.value) }
                })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
                <option value={57600}>57600</option>
                <option value={115200}>{t("sessionModal.conn.baudRecommended")}</option>
                <option value={230400}>230400</option>
                <option value={460800}>460800</option>
                <option value={921600}>921600</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.dataBits')}</label>
              <select
                value={formData.serialConfig?.dataBits || 8}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), dataBits: Number(e.target.value) }
                })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value={8}>{t("sessionModal.conn.dataBitsDefault")}</option>
                <option value={7}>7</option>
                <option value={6}>6</option>
                <option value={5}>5</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.stopBits')}</label>
              <select
                value={formData.serialConfig?.stopBits || '1'}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), stopBits: e.target.value }
                })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="1">1</option>
                <option value="1.5">1.5</option>
                <option value="2">2</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.parity')}</label>
              <select
                value={formData.serialConfig?.parity || 'none'}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), parity: e.target.value }
                })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="none">{t("sessionModal.conn.parityNone")}</option>
                <option value="odd">{t("sessionModal.conn.parityOdd")}</option>
                <option value="even">{t("sessionModal.conn.parityEven")}</option>
                <option value="mark">Mark</option>
                <option value="space">Space</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.flowControl')}</label>
              <select
                value={formData.serialConfig?.flowControl || 'none'}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), flowControl: e.target.value }
                })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="none">{t("sessionModal.conn.flowNone")}</option>
                <option value="rts/cts">{t("sessionModal.conn.flowRts")}</option>
                <option value="xon/xoff">{t("sessionModal.conn.flowXon")}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer text-[#cccccc]">
              <input
                type="checkbox"
                checked={formData.serialConfig?.dtr ?? true}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), dtr: e.target.checked }
                })}
                className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
              />
              <span className="text-xs">{t('sessionModal.enableDTR')}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-[#cccccc]">
              <input
                type="checkbox"
                checked={formData.serialConfig?.rts ?? true}
                onChange={(e) => setFormData({
                  ...formData,
                  serialConfig: { ...(formData.serialConfig || {}), rts: e.target.checked }
                })}
                className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
              />
              <span className="text-xs">{t('sessionModal.enableRTS')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Telnet 模式配置 Card */}
      {formData.protocol === 'telnet' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
            <Network className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionModal.conn.telnetTitle')}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.hostIp')}</label>
              <input
                type="text"
                placeholder="192.168.1.1"
                value={formData.host || ''}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.port')}</label>
              <input
                type="number"
                value={formData.port || 23}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Rlogin 模式配置 Card */}
      {formData.protocol === 'rlogin' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
            <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionModal.conn.rloginTitle')}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.hostIp')}</label>
              <input
                type="text"
                placeholder="192.168.1.10"
                value={formData.host || ''}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.port')}</label>
              <input
                type="number"
                value={formData.port || 513}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.rloginUser')}</label>
              <input
                type="text"
                placeholder="root"
                value={formData.user || ''}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.termEmulation')}</label>
              <input
                type="text"
                placeholder="xterm-256color"
                value={formData.termType || 'xterm-256color'}
                onChange={(e) => setFormData({ ...formData, termType: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mosh 模式配置 Card */}
      {formData.protocol === 'mosh' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
            <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#0078d4]" />
              {t('sessionModal.conn.moshTitle')}
            </h4>
            <span className="text-[10px] text-[#0078d4] font-mono bg-[#0078d4]/10 px-2 py-0.5 rounded border border-[#0078d4]/30">
              UDP 60000-61000
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.hostIp')}</label>
              <input
                type="text"
                placeholder="192.168.1.100"
                value={formData.host || ''}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.moshSshPort')}</label>
              <input
                type="number"
                value={formData.port || 22}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.moshServerPath')}</label>
              <input
                type="text"
                placeholder="mosh-server"
                value={formData.moshServerPath || 'mosh-server'}
                onChange={(e) => setFormData({ ...formData, moshServerPath: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.moshUdpRange')}</label>
              <input
                type="text"
                placeholder="60000:61000"
                value={formData.moshPortRange || '60000:61000'}
                onChange={(e) => setFormData({ ...formData, moshPortRange: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-[#858585] leading-relaxed bg-[#1e1e1e] p-2.5 rounded border border-[#3c3c3c]">
            {t('sessionModal.moshNotice')}
          </p>
        </div>
      )}



      {/* {t('sessionModal.conn.dockerTitle')} Card */}
      {formData.protocol === 'docker' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
            <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2">
              <Box className="w-3.5 h-3.5 text-[#0078d4]" />
              {t('sessionModal.conn.dockerTitle')}
            </h4>
            <span className="text-[10px] text-[#0078d4] font-mono bg-[#0078d4]/10 px-2 py-0.5 rounded border border-[#0078d4]/30">
              docker exec -it
            </span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.dockerHost')}</label>
            <select
              value={formData.dockerHostSessionId || ''}
              onChange={(e) => setFormData({ ...formData, dockerHostSessionId: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="">{t('sessionModal.localDocker')}</option>
              {sessions
                .filter((s: any) => !s.isFolder && (s.protocol === 'ssh' || !s.protocol))
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    🌐 {s.name} ({s.host})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.containerId')}</label>
              <input
                type="text"
                placeholder={t("sessionModal.conn.dockerPlaceholder")}
                value={formData.dockerContainerId || ''}
                onChange={(e) => setFormData({ ...formData, dockerContainerId: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
                required
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.interactiveShell')}</label>
              <select
                value={formData.dockerShell || '/bin/bash'}
                onChange={(e) => setFormData({ ...formData, dockerShell: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="/bin/bash">{t("sessionModal.conn.bashWithFallback")}</option>
                <option value="/bin/sh">/bin/sh</option>
                <option value="/bin/ash">/bin/ash (Alpine)</option>
                <option value="/bin/zsh">/bin/zsh</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* {t('sessionModal.conn.k8sTitle')} Card */}
      {formData.protocol === 'k8s' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
            <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#0078d4]" />
              {t('sessionModal.conn.k8sTitle')}
            </h4>
            <span className="text-[10px] text-[#0078d4] font-mono bg-[#0078d4]/10 px-2 py-0.5 rounded border border-[#0078d4]/30">
              kubectl exec -it
            </span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.k8sJump')}</label>
            <select
              value={formData.dockerHostSessionId || ''}
              onChange={(e) => setFormData({ ...formData, dockerHostSessionId: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="">{t('sessionModal.localKube')}</option>
              {sessions
                .filter((s: any) => !s.isFolder && (s.protocol === 'ssh' || !s.protocol))
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    🌐 {s.name} ({s.host})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.namespace')}</label>
              <input
                type="text"
                placeholder="default"
                value={formData.k8sNamespace || 'default'}
                onChange={(e) => setFormData({ ...formData, k8sNamespace: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.podName')}</label>
              <input
                type="text"
                placeholder="nginx-deployment-75675f5897-4z5jx"
                value={formData.k8sPod || ''}
                onChange={(e) => setFormData({ ...formData, k8sPod: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.containerOptional')}</label>
              <input
                type="text"
                placeholder={t("sessionModal.conn.k8sFirstContainer")}
                value={formData.k8sContainer || ''}
                onChange={(e) => setFormData({ ...formData, k8sContainer: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.kubeconfigOptional')}</label>
              <input
                type="text"
                placeholder={t("sessionModal.conn.k8sConfigDefault")}
                value={formData.k8sKubeconfig || ''}
                onChange={(e) => setFormData({ ...formData, k8sKubeconfig: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Raw TCP 模式配置 Card */}
      {formData.protocol === 'raw_tcp' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
            <Radio className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionModal.conn.rawTcpTitle')}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.conn.targetHost')}</label>
              <input
                type="text"
                placeholder="127.0.0.1"
                value={formData.host || ''}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.port')}</label>
              <input
                type="number"
                value={formData.port || 8080}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.lineEnding')}</label>
            <select
              value={formData.lineEnding || 'CRLF'}
              onChange={(e) => setFormData({ ...formData, lineEnding: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="CRLF">{t("sessionModal.conn.eolCrlf")}</option>
              <option value="LF">LF (\n) - Unix / Linux</option>
              <option value="CR">CR (\r) - Mac OS 9</option>
              <option value="NONE">{t("sessionModal.conn.eolNone")}</option>
            </select>
          </div>
        </div>
      )}

      {/* Local Shell / WSL 模式配置 Card */}
      {formData.protocol === 'local' && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
            <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionModal.conn.localTitle')}
          </h4>
          
          {wslDistros.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.wslDistro')}</label>
              <select
                value={formData.wslDistro || ''}
                onChange={(e) => setFormData({ ...formData, wslDistro: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="">{t('sessionModal.noWsl')}</option>
                {wslDistros.map(d => (
                  <option key={d.name} value={d.name}>
                    🐧 {d.name} {d.isDefault ? t('sessionModal.conn.defaultDistro') : ''} [WSL v{d.version}]
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.shellPath')}</label>
            <div className="flex gap-2">
              <select
                value={formData.shellPath || ''}
                onChange={(e) => setFormData({ ...formData, shellPath: e.target.value })}
                className="w-2/3 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="">{t('sessionModal.defaultShell')}</option>
                {availableShells.map(s => (
                  <option key={s.path} value={s.path}>{s.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t("sessionModal.conn.manualShellPath")}
                value={formData.shellPath || ''}
                onChange={(e) => setFormData({ ...formData, shellPath: e.target.value })}
                className="w-1/3 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 常规 SSH 模式表单 Card */}
      {(!formData.protocol || formData.protocol === 'ssh') && (
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-2 border-b border-[#2b2b2b] pb-2.5">
            <Server className="w-3.5 h-3.5 text-[#0078d4]" />
            {t('sessionModal.conn.targetServerTitle')}
          </h4>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.hostIp')}</label>
              <input
                type="text"
                placeholder="192.168.1.100"
                value={formData.host || ''}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono"
                required={!formData.isFolder}
              />
            </div>
            <div className="col-span-1 space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.port')}</label>
              <input
                type="number"
                value={formData.port || 22}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required={!formData.isFolder}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.username')}</label>
              <input
                type="text"
                placeholder="root / ubuntu"
                value={formData.user || ''}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                required={!formData.isFolder}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.workMode')}</label>
              <select
                value={formData.sessionMode || 'ssh'}
                onChange={(e) => setFormData({ ...formData, sessionMode: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="ssh">{t('sessionModal.workModeNormal')}</option>
                <option value="sftp-only">{t('sessionModal.workModeSftp')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.jumpHost')}</label>
            <select
              value={formData.jumpHostSessionId || ''}
              onChange={(e) => setFormData({ ...formData, jumpHostSessionId: e.target.value })}
              className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
            >
              <option value="">{t('sessionModal.noJump')}</option>
              {sessions.filter(s => !s.isFolder && s.id !== formData.id).map(s => (
                <option key={s.id} value={s.id}>
                  🔀 {s.name} ({s.user}@{s.host}:{s.port})
                </option>
              ))}
            </select>
          </div>

          {/* 网络代理 */}
          <div className="space-y-2 pt-2 border-t border-[#2b2b2b]">
            <label className="text-[11px] font-medium text-[#858585]">{t('sessionModal.proxy')}</label>
            <div className="flex gap-2">
              <select
                value={formData.proxyType || 'none'}
                onChange={(e) => setFormData({ ...formData, proxyType: e.target.value })}
                className="w-1/3 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="none">{t('sessionModal.noProxy')}</option>
                <option value="http">{t("sessionModal.conn.httpProxy")}</option>
                <option value="socks5">{t("sessionModal.conn.socks5Proxy")}</option>
              </select>
              {(formData.proxyType === 'http' || formData.proxyType === 'socks5') && (
                <>
                  <input
                    type="text"
                    placeholder={t("sessionModal.conn.proxyHost")}
                    value={formData.proxyHost || ''}
                    onChange={(e) => setFormData({ ...formData, proxyHost: e.target.value })}
                    className="w-1/2 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                  />
                  <input
                    type="number"
                    placeholder={t("sessionModal.conn.proxyPort")}
                    value={formData.proxyPort || ''}
                    onChange={(e) => setFormData({ ...formData, proxyPort: Number(e.target.value) })}
                    className="w-1/4 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

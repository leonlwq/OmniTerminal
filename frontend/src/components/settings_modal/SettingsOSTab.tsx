import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  AlertTriangle, 
  Maximize2, 
  Power, 
  Globe, 
  RefreshCw, 
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { SaveSettings, GetSystemProxyInfo } from '../../../wailsjs/go/app/App';

interface SettingsOSTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
}

export function SettingsOSTab({
  settings,
  setSettings,
}: SettingsOSTabProps) {
  const [proxyInfo, setProxyInfo] = useState<{
    enabled: boolean;
    proxyType: string;
    host: string;
    port: number;
    source: string;
    rawUrl: string;
  } | null>(null);
  const [isDetectingProxy, setIsDetectingProxy] = useState(false);

  const fetchProxyInfo = async () => {
    setIsDetectingProxy(true);
    try {
      const res = await GetSystemProxyInfo();
      setProxyInfo(res as any);
    } catch {
      setProxyInfo(null);
    } finally {
      setIsDetectingProxy(false);
    }
  };

  useEffect(() => {
    fetchProxyInfo();
  }, []);

  const updateSettings = (partial: any) => {
    const newS = new models.AppSettings({
      ...settings,
      ...partial,
    } as any);
    setSettings(newS);
    SaveSettings(newS).catch(() => {});
  };

  const isDisableTray = Boolean((settings as any).disableSystemTray);

  return (
    <div className="space-y-4">
      {/* 1. 系统自启与电源管理 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
          <Power className="w-3.5 h-3.5 text-[#0078d4]" />
          系统自启与电源管理 (Startup & Power)
        </h4>
        <p className="text-[11px] text-[#858585] leading-relaxed">
          定制开机自动启动策略与防止系统睡眠机制，保障大文件传输、隧道转发及远程任务不被系统休眠意外掐断。
        </p>

        <div className="space-y-2.5 pt-1">
          {/* 开机时自启动 */}
          <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
            <input 
              type="checkbox"
              checked={Boolean((settings as any).autoStartAtBoot)}
              onChange={(e) => updateSettings({ autoStartAtBoot: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div className="space-y-0.5">
              <span className="text-xs text-[#cccccc] font-medium">开机时自启动 (Auto-start at Boot)</span>
              <p className="text-[10px] text-[#858585]">系统开机登录时自动在后台启动 OmniTerminal 工作台</p>
            </div>
          </label>

          {/* 阻止系统休眠 */}
          <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
            <input 
              type="checkbox"
              checked={Boolean((settings as any).preventSleep)}
              onChange={(e) => updateSettings({ preventSleep: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div className="space-y-0.5">
              <span className="text-xs text-[#cccccc] font-medium">阻止系统休眠 (Prevent System Sleep)</span>
              <p className="text-[10px] text-[#858585]">开启后将阻止系统自动休眠；关闭则允许系统按操作系统电源设置休眠</p>
            </div>
          </label>
        </div>
      </div>

      {/* 2. 网络穿透与系统代理 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#0078d4]" />
            网络穿透与系统代理 (Network & System Proxy)
          </h4>
          <button
            onClick={fetchProxyInfo}
            disabled={isDetectingProxy}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#cccccc] hover:text-white bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isDetectingProxy ? 'animate-spin text-[#0078d4]' : ''}`} />
            重新探测
          </button>
        </div>
        <p className="text-[11px] text-[#858585] leading-relaxed">
          自动探测并继承操作系统全局配置的 HTTP / SOCKS 代理，用于 SSH/SFTP 会话穿透及外部网络通信。
        </p>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
            <input 
              type="checkbox"
              checked={Boolean((settings as any).useSystemProxy)}
              onChange={(e) => updateSettings({ useSystemProxy: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div className="space-y-0.5">
              <span className="text-xs text-[#cccccc] font-medium">使用系统代理 (Inherit System Proxy)</span>
              <p className="text-[10px] text-[#858585]">未设置独立代理的会话将自动穿透系统代理进行连接</p>
            </div>
          </label>

          {/* 代理检测状态微胶囊 */}
          <div className="p-3 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className={`w-2 h-2 rounded-full ${proxyInfo?.enabled ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-500'}`} />
              <div>
                <div className="text-[11px] font-medium text-[#cccccc]">
                  {proxyInfo?.enabled ? (
                    <span className="flex items-center gap-1.5 font-mono">
                      <span>{proxyInfo.proxyType.toUpperCase()}://{proxyInfo.host}:{proxyInfo.port}</span>
                      <span className="text-[10px] text-[#858585] font-sans">({proxyInfo.source})</span>
                    </span>
                  ) : (
                    <span>未检测到系统活跃代理 (当前为直连模式)</span>
                  )}
                </div>
                <p className="text-[10px] text-[#858585]">
                  {proxyInfo?.enabled ? '已准备就绪，开启上方开关后即时生效' : '系统未配置全局 HTTP/SOCKS 代理'}
                </p>
              </div>
            </div>
            {proxyInfo?.enabled && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                已就绪
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. 主窗口关闭行为与系统托盘 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0078d4]" />
          窗口关闭行为与系统托盘 (Window Close & Tray)
        </h4>
        <p className="text-[11px] text-[#858585] leading-relaxed">
          定制点击应用主窗口右上角关闭按钮 (×) 时的系统处理策略，避免误关闭导致正在执行的远程编译或数据传输意外中断。
        </p>

        <div className="space-y-3 pt-1">
          {/* 禁用系统托盘选项 */}
          <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
            <input 
              type="checkbox"
              checked={isDisableTray}
              onChange={(e) => {
                const disable = e.target.checked;
                updateSettings({ 
                  disableSystemTray: disable,
                  closeAction: disable ? 'quit' : ((settings as any).closeAction || 'tray'),
                });
              }}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div className="space-y-0.5">
              <span className="text-xs text-[#cccccc] font-medium">禁用系统托盘 (Disable System Tray)</span>
              <p className="text-[10px] text-[#858585]">禁用系统托盘，点击关闭按钮将会直接退出应用</p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">关闭按钮默认操作</label>
              <select
                disabled={isDisableTray}
                value={isDisableTray ? 'quit' : ((settings as any).closeAction || 'tray')}
                onChange={(e) => updateSettings({ closeAction: e.target.value })}
                className={`w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-[#cccccc] outline-none ${
                  isDisableTray ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#505050] focus:border-[#0078d4]'
                }`}
              >
                <option value="tray">最小化到后台 / 系统托盘 (保持长连接)</option>
                <option value="quit">直接退出程序 (终止全部连接)</option>
              </select>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                <input 
                  type="checkbox"
                  checked={Boolean((settings as any).closeDoNotAskAgain)}
                  onChange={(e) => updateSettings({ closeDoNotAskAgain: e.target.checked })}
                  className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs text-[#cccccc] font-medium">关闭时不再询问</span>
                  <p className="text-[10px] text-[#858585]">直接执行设定操作，关闭此项可恢复确认弹窗</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 标签页防误触安全确认 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          标签页防误触二次确认 (Tab Closing Protection)
        </h4>
        <p className="text-[11px] text-[#858585] leading-relaxed">
          针对活跃连接会话的防误触安全屏障，防止快捷键或鼠标误关正在运行前台进程的生产服务器。
        </p>

        <div className="space-y-2 pt-1">
          <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
            <input 
              type="checkbox"
              checked={(settings as any).confirmCloseConnectedTab !== false}
              onChange={(e) => updateSettings({ confirmCloseConnectedTab: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div className="space-y-0.5">
              <span className="text-xs text-[#cccccc] font-medium">关闭终端连接标签二次确认 (推荐开启)</span>
              <p className="text-[10px] text-[#858585]">当会话处于连接中时，关闭该标签页前弹出安全确认弹窗</p>
            </div>
          </label>

          <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
            <input 
              type="checkbox"
              checked={Boolean((settings as any).confirmCloseAnyTab)}
              onChange={(e) => updateSettings({ confirmCloseAnyTab: e.target.checked })}
              className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
            />
            <div className="space-y-0.5">
              <span className="text-xs text-[#cccccc] font-medium">关闭任何顶部 Tab 标签二次确认</span>
              <p className="text-[10px] text-[#858585]">无论会话是否连接，关闭任何标签页均触发二次确认</p>
            </div>
          </label>
        </div>
      </div>

      {/* 5. 窗口尺寸与屏幕位置记忆 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-[#0078d4]" />
          窗口状态与位置记忆 (Window Geometry & State)
        </h4>
        <p className="text-[11px] text-[#858585] leading-relaxed">
          自动保存主窗口退出时的屏幕坐标、分辨率尺寸及最大化状态，跨会话无缝还原您的专属桌面排布。
        </p>

        <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
          <input 
            type="checkbox"
            checked={(settings as any).rememberWindowPosition !== false}
            onChange={(e) => updateSettings({ rememberWindowPosition: e.target.checked })}
            className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
          />
          <div className="space-y-0.5">
            <span className="text-xs text-[#cccccc] font-medium">记录窗口打开位置与尺寸 (Remember Window Position)</span>
            <p className="text-[10px] text-[#858585]">再次打开软件时，启动位置为上一次退出时的大小与屏幕坐标</p>
          </div>
        </label>
      </div>

      {/* 6. 全局下拉终端 / Quake 模式 Card */}
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
        <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[#0078d4]" />
          全局下拉终端 / Quake 模式 (Quake Dropdown Terminal)
        </h4>
        <p className="text-[11px] text-[#858585] leading-relaxed">
          在任意系统应用中按下全局唤醒热键，OmniTerminal 将以 Quake 风格紧贴屏幕顶部滑出居中展示，再次按下或失焦时自动隐藏。
        </p>
        <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
          <input 
            type="checkbox"
            checked={!!(settings as any).enableQuakeMode}
            onChange={(e) => updateSettings({ enableQuakeMode: e.target.checked })}
            className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
          />
          <span className="text-xs text-[#cccccc] font-medium">启用全局下拉 Quake 模式</span>
        </label>

        {Boolean((settings as any).enableQuakeMode) && (
          <div className="space-y-3 pt-2 pl-3 border-l-2 border-[#0078d4]">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#858585]">唤醒快捷键 (Hotkey)</label>
              <select
                value={(settings as any).quakeHotkey || 'Ctrl+`'}
                onChange={(e) => updateSettings({ quakeHotkey: e.target.value })}
                className="w-48 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
              >
                <option value="Ctrl+`">Ctrl + ` (推荐)</option>
                <option value="F12">F12</option>
                <option value="Alt+`">Alt + `</option>
                <option value="F10">F10</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#858585]">
                <span>下拉窗口高度占比: {(settings as any).quakeHeightPercent || 50}%</span>
              </div>
              <input 
                type="range" 
                min={30}
                max={80}
                step={5}
                value={(settings as any).quakeHeightPercent || 50}
                onChange={(e) => updateSettings({ quakeHeightPercent: Number(e.target.value) })}
                className="w-full h-1.5 bg-[#181818] border border-[#3c3c3c] rounded cursor-pointer accent-[#0078d4]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

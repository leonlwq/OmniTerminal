import React, { useState } from 'react';
import { 
  Sliders, ShieldAlert, Plus, X, Trash2, Gauge, AlertTriangle, Keyboard,
  Command, Folder, Link, Table, Sparkles, Code 
} from 'lucide-react';
import { models } from '../../../wailsjs/go/models';

interface SettingsInteractionTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
  onOpenKeybindingManager?: () => void;
  onClose?: () => void;
}

export function SettingsInteractionTab({
  settings,
  setSettings,
  onOpenKeybindingManager,
  onClose,
}: SettingsInteractionTabProps) {
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  return (
              <div className="space-y-4">
                
                {/* 鼠标行为 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
                    鼠标行为定制 (Mouse Interaction)
                  </h4>
                  
                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={settings.copyOnSelect ?? false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, copyOnSelect: e.target.checked }))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <span className="text-xs text-[#cccccc]">鼠标选区即复制 (释放鼠标选区时自动复制至系统剪贴板)</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).showCommandDuration !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, showCommandDuration: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">显示命令执行耗时微标注 (Command Duration Annotation)</div>
                      <div className="text-[10px] text-[#858585]">在终端右下角自动标注上一条命令的执行耗时与完成时间戳（如 2.3s [14:20:15]）</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).highlightHyperlinks !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, highlightHyperlinks: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">自动识别并高亮终端超链接 (Hyperlink Detection)</div>
                      <div className="text-[10px] text-[#858585]">终端输出中的 URL 与 IP 地址鼠标悬停高亮，点击可在默认浏览器中直接打开</div>
                    </div>
                  </label>

                  {/* Phase 8 (25.4.3): 终端视口 Mini 服务器硬件遥测小部件 */}
                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).enableMiniTelemetry !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableMiniTelemetry: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">终端视口右上角 Mini 服务器硬件遥测胶囊 (Mini Telemetry Widget)</div>
                      <div className="text-[10px] text-[#858585]">实时显示远程服务器的 CPU%、内存占比、网络下行速率与健康呼吸灯，点击可展开微图表或直达监控大屏</div>
                    </div>
                  </label>

                  {(settings as any).enableMiniTelemetry !== false && (
                    <div className="flex items-center justify-between p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c]">
                      <div>
                        <div className="text-xs text-[#cccccc]">Mini 遥测采样周期</div>
                        <div className="text-[10px] text-[#858585]">配置后台轻量获取 CPU/内存/网络指标的时间间隔</div>
                      </div>
                      <select
                        value={(settings as any).miniTelemetryIntervalSec || 3}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, miniTelemetryIntervalSec: Number(e.target.value) } as any))}
                        className="px-2.5 py-1.5 bg-[#252526] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={2}>2 秒 (极速响应)</option>
                        <option value={3}>3 秒 (推荐平衡)</option>
                        <option value={5}>5 秒 (低负载)</option>
                        <option value={10}>10 秒 (省流节能)</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">鼠标右键行为</label>
                      <select 
                        value={settings.rightClickAction || 'contextMenu'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, rightClickAction: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="contextMenu">弹出右键菜单 (Context Menu)</option>
                        <option value="paste">直接粘贴剪切板 (Paste directly)</option>
                        <option value="none">无动作 (None)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">鼠标双击行为</label>
                      <select 
                        value={settings.doubleClickAction || 'selectWord'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, doubleClickAction: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="selectWord">智能选择当前单词/路径 (Select Word)</option>
                        <option value="copy">选择并直接复制 (Select & Copy)</option>
                        <option value="none">无动作 (None)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-[#858585]">双击选词分词边界符号 (Word Separators)</label>
                    <input 
                      type="text"
                      value={settings.wordSeparators ?? ` ~!@#$%^&*()=+[{]}\\|;:'",<>?`}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, wordSeparators: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded font-mono text-xs text-[#cccccc] outline-none"
                      placeholder={` ~!@#$%^&*()=+[{]}\\|;:'",<>?`}
                    />
                    <p className="text-[10px] text-[#858585] leading-relaxed">
                      包含在此字符串中的字符将在双击选词时作为分隔符截断（例如包含点号则双击只选 IP 的一段，不包含则选取整段 IP）。
                    </p>
                  </div>
                </div>

                {/* 键盘与快捷交互 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Command className="w-3.5 h-3.5 text-[#0078d4]" />
                    键盘与快捷键兼容性 (Keyboard & Shortcuts)
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.useAltAsMeta ?? true}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, useAltAsMeta: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">将 Alt / Option 作为 Meta 键发送 ESC 前缀 (支持 Vim / Emacs / Readline 快捷键，如 Alt+B/F)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.openLinksOnClick ?? false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, openLinksOnClick: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">终端超链接单击直接打开 (关闭时需按住 Cmd / Ctrl + 单击打开)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={settings.enableBell ?? false}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableBell: e.target.checked }))}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs text-[#cccccc]">启用终端声音提醒 (Bell Sound)</span>
                    </label>
                  </div>
                </div>

                {/* 外部编辑器集成 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-[#0078d4]" />
                    外部编辑器与工作区恢复
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">外部编辑器选择 (双击远程文件时调用)</label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={['', 'code', 'cursor', 'subl'].includes(settings.externalEditorPath || '') ? (settings.externalEditorPath || '') : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') {
                            setSettings(new models.AppSettings({ ...settings, externalEditorPath: e.target.value }));
                          }
                        }}
                        className="w-48 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="">系统默认程序 (System Default)</option>
                        <option value="code">Visual Studio Code (code)</option>
                        <option value="cursor">Cursor (cursor)</option>
                        <option value="subl">Sublime Text (subl)</option>
                        <option value="custom">自定义程序路径 (Custom Path)</option>
                      </select>
                      <input 
                        type="text"
                        value={settings.externalEditorPath ?? ''}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, externalEditorPath: e.target.value }))}
                        className="flex-1 px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded font-mono text-xs text-[#cccccc] outline-none"
                        placeholder="例如: code, cursor, subl, /usr/local/bin/code"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">同名文件传输冲突策略</label>
                      <select 
                        value={settings.fileConflictStrategy || 'ask'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, fileConflictStrategy: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="ask">每次询问 (Ask every time)</option>
                        <option value="overwrite">直接覆盖 (Overwrite)</option>
                        <option value="skip">跳过已存在 (Skip)</option>
                        <option value="resume">断点续传/追加 (Resume)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={settings.autoRestoreWorkspace ?? true}
                          onChange={(e) => setSettings(new models.AppSettings({ ...settings, autoRestoreWorkspace: e.target.checked }))}
                          className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                        />
                        <span className="text-xs text-[#cccccc]">启动时自动恢复上次会话与工作区</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 24.1.1 & 24.1.5: OSC 52 远程剪贴板同步 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Command className="w-3.5 h-3.5 text-[#0078d4]" />
                    OSC 52 远程剪贴板双向同步 (Remote Clipboard Sync)
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">OSC 52 运行模式</label>
                      <select 
                        value={(settings as any).osc52Mode || 'write'}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, osc52Mode: e.target.value } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value="write">仅写入本地剪贴板 (Write-only, 推荐)</option>
                        <option value="readwrite">双向读写同步 (Read-Write)</option>
                        <option value="disabled">完全禁用 (Disabled)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">最大载荷限制 (Max Payload)</label>
                      <select 
                        value={(settings as any).osc52MaxBytes || 102400}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, osc52MaxBytes: Number(e.target.value) } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={51200}>50 KB</option>
                        <option value={102400}>100 KB (默认安全上限)</option>
                        <option value={524288}>512 KB</option>
                        <option value={1048576}>1 MB</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2.5 p-2 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).osc52ShowToast !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, osc52ShowToast: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">远程剪贴板同步 Toast 提示 (Sync Toast Notification)</div>
                      <div className="text-[10px] text-[#858585]">当远端 tmux / vim 通过 OSC 52 写入本地剪贴板时弹出淡色同步反馈浮标</div>
                    </div>
                  </label>
                </div>

                {/* 24.1.2: SSH 连接池 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-[#0078d4]" />
                    SSH 连接复用与智能连接池 (Connection Multiplexing & Pool)
                  </h4>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={(settings as any).enableSshConnectionPool !== false}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableSshConnectionPool: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">启用 SSH 多通道连接复用 (OpenSSH Multiplexing)</div>
                      <div className="text-[10px] text-[#858585]">同一主机的多个终端 Tab 复用已建立的物理 TCP 链路，毫秒级开启新会话，大幅节约握手资源</div>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">空闲释放倒计时 (Idle Timeout)</label>
                      <select 
                        value={(settings as any).sshPoolIdleTimeoutSec || 300}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, sshPoolIdleTimeoutSec: Number(e.target.value) } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={60}>1 分钟 (60s)</option>
                        <option value={300}>5 分钟 (300s, 推荐)</option>
                        <option value={600}>10 分钟 (600s)</option>
                        <option value={1800}>30 分钟 (1800s)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">连接池最大主机容量 (Max Pool Size)</label>
                      <select 
                        value={(settings as any).sshPoolMaxSize || 50}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, sshPoolMaxSize: Number(e.target.value) } as any))}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      >
                        <option value={20}>20 台独立主机</option>
                        <option value={50}>50 台独立主机 (推荐)</option>
                        <option value={100}>100 台独立主机</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 24.1.7: 智能结构化渲染 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Table className="w-3.5 h-3.5 text-[#0078d4]" />
                    终端输出语义化解析 (Structured Output Rendering)
                  </h4>

                  <label className="flex items-center space-x-2.5 p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] cursor-pointer transition-colors">
                    <input 
                      type="checkbox"
                      checked={Boolean((settings as any).enableStructuredOutput)}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, enableStructuredOutput: e.target.checked } as any))}
                      className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-[#cccccc]">启用智能结构化输出解析 (Warp 风格表格与 JSON 树)</div>
                      <div className="text-[10px] text-[#858585]">自动检测 docker ps / kubectl get 等等宽表格与 JSON 数据块，在终端右上角浮现交互式结构化视图</div>
                    </div>
                  </label>
                </div>

                {/* 24.1.4: 快捷键重映射 Card */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                      <Keyboard className="w-3.5 h-3.5 text-[#0078d4]" />
                      快捷键可视化管理与冲突检测 (Keybinding Manager)
                    </h4>
                    <p className="text-[11px] text-[#858585] mt-1">
                      自定义全系统快捷键映射，具备实时冲突碰撞检测与一键按键录制
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenKeybindingManager) {
                        onClose?.();
                        onOpenKeybindingManager();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-xs font-medium text-white transition-colors"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>配置快捷键</span>
                  </button>
                </div>

                {/* 24.2.1: Warp 结构化命令块模式 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
                    Warp 风格结构化命令块交互 (Command Block Interaction)
                  </h4>
                  <div className="flex items-center justify-between p-2.5 rounded bg-[#1e1e1e] border border-[#3c3c3c]">
                    <div>
                      <div className="text-xs text-[#cccccc]">默认终端呈现模式</div>
                      <div className="text-[10px] text-[#858585]">将终端交互流识别为独立 Command Block，提供块级复制、长输出折叠与 AI 诊断</div>
                    </div>
                    <select
                      value={(settings as any).commandBlockMode || 'off'}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, commandBlockMode: e.target.value } as any))}
                      className="bg-[#1e1e1e] text-xs text-[#cccccc] border border-[#3c3c3c] rounded px-2.5 py-1 focus:outline-none focus:border-[#0078d4]"
                    >
                      <option value="off">传统流式终端 (Classic Stream)</option>
                      <option value="on">Warp 命令块模式 (Modern Blocks)</option>
                    </select>
                  </div>
                </div>

                {/* 24.2.8: Quake 下拉模式动画时长 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
                    Quake 下拉模式动画与弹性阻尼 (Enhanced Quake Dropdown)
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#cccccc]">滑入动画过渡时长 (Spring Easing):</span>
                      <span className="font-mono text-[#0078d4]">{(settings as any).quakeAnimationDurationMs || 250} ms</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={600}
                      step={25}
                      value={(settings as any).quakeAnimationDurationMs || 250}
                      onChange={(e) => setSettings(new models.AppSettings({ ...settings, quakeAnimationDurationMs: Number(e.target.value) } as any))}
                      className="w-full accent-[#0078d4] h-1.5 bg-[#181818] border border-[#3c3c3c] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 24.2.2: 内置 Monaco 代码编辑器配置 */}
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-semibold text-[#cccccc] flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-[#0078d4]" />
                    远程文件内置 Monaco 编辑器偏好 (Monaco Code Editor)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[#858585] text-[11px]">编辑器字号:</span>
                      <select
                        value={(settings as any).monacoFontSize || 13}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, monacoFontSize: Number(e.target.value) } as any))}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] rounded px-2 py-1 outline-none focus:border-[#0078d4]"
                      >
                        {[11, 12, 13, 14, 15, 16, 18].map(sz => (
                          <option key={sz} value={sz}>{sz} px</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[#858585] text-[11px]">Tab 缩进空格数:</span>
                      <select
                        value={(settings as any).monacoTabSize || 2}
                        onChange={(e) => setSettings(new models.AppSettings({ ...settings, monacoTabSize: Number(e.target.value) } as any))}
                        className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] rounded px-2 py-1 outline-none focus:border-[#0078d4]"
                      >
                        <option value={2}>2 空格 (推荐)</option>
                        <option value={4}>4 空格</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
  );
}

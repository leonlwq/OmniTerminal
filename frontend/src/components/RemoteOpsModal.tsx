import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, Search, Layers, Server, Radio, AlertCircle 
} from 'lucide-react';
import { RemoteProcessItem, RemoteServiceItem, RemotePortItem } from '../types';

interface RemoteOpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string;
  sessionName: string;
}

export const RemoteOpsModal: React.FC<RemoteOpsModalProps> = ({
  isOpen,
  onClose,
  activeSessionId,
  sessionName,
}) => {
  const [activeTab, setActiveTab] = useState<'processes' | 'services' | 'ports'>('processes');
  
  // Data states
  const [processes, setProcesses] = useState<RemoteProcessItem[]>([]);
  const [services, setServices] = useState<RemoteServiceItem[]>([]);
  const [ports, setPorts] = useState<RemotePortItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'cpu' | 'mem' | 'pid'>('cpu');
  const [sortAsc, setSortAsc] = useState(false);

  const loadData = () => {
    if (!activeSessionId) return;
    setLoading(true);
    setErrorMsg('');

    const appRpc = (window as any).go?.app?.App;
    if (!appRpc) {
      setLoading(false);
      return;
    }

    if (activeTab === 'processes') {
      if (!appRpc.GetRemoteProcesses) { setLoading(false); return; }
      appRpc.GetRemoteProcesses(activeSessionId)
        .then((data: RemoteProcessItem[]) => setProcesses(data || []))
        .catch((err: any) => setErrorMsg('加载进程列表失败: ' + (err?.message || err)))
        .finally(() => setLoading(false));
    } else if (activeTab === 'services') {
      if (!appRpc.GetRemoteServices) { setLoading(false); return; }
      appRpc.GetRemoteServices(activeSessionId)
        .then((data: RemoteServiceItem[]) => setServices(data || []))
        .catch((err: any) => setErrorMsg('加载系统服务失败: ' + (err?.message || err)))
        .finally(() => setLoading(false));
    } else if (activeTab === 'ports') {
      if (!appRpc.GetRemotePorts) { setLoading(false); return; }
      appRpc.GetRemotePorts(activeSessionId)
        .then((data: RemotePortItem[]) => setPorts(data || []))
        .catch((err: any) => setErrorMsg('加载监听端口失败: ' + (err?.message || err)))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isOpen && activeSessionId) {
      loadData();
    }
  }, [isOpen, activeSessionId, activeTab]);

  if (!isOpen) return null;

  const handleKill = (pid: number, force: boolean) => {
    const actionName = force ? '强制终止 (kill -9)' : '正常结束 (SIGTERM)';
    if (!confirm(`确定要对 PID ${pid} 执行 ${actionName} 吗？`)) return;

    const killFn = (window as any).go?.app?.App?.KillRemoteProcess;
    if (!killFn) return;

    killFn(activeSessionId, pid, force)
      .then(() => {
        loadData();
      })
      .catch((err: any) => setErrorMsg('终止进程失败: ' + (err?.message || err)));
  };

  const handleServiceAction = (unit: string, action: string) => {
    const actionNames: Record<string, string> = {
      start: '启动',
      stop: '停止',
      restart: '重启',
    };
    if (!confirm(`确定要对服务 ${unit} 执行 ${actionNames[action] || action} 操作吗？`)) return;

    const ctrlFn = (window as any).go?.app?.App?.ControlRemoteService;
    if (!ctrlFn) return;

    ctrlFn(activeSessionId, unit, action)
      .then(() => {
        loadData();
      })
      .catch((err: any) => setErrorMsg(`操作服务失败: ${err?.message || err}`));
  };

  // Filtered & Sorted Processes
  const filteredProcesses = processes
    .filter(
      (p) =>
        (p.command || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.pid || '').toString().includes(searchQuery)
    )
    .sort((a, b) => {
      let diff = 0;
      if (sortField === 'cpu') diff = (a.cpu || 0) - (b.cpu || 0);
      else if (sortField === 'mem') diff = (a.mem || 0) - (b.mem || 0);
      else if (sortField === 'pid') diff = (a.pid || 0) - (b.pid || 0);
      return sortAsc ? diff : -diff;
    });

  // Filtered Services
  const filteredServices = services.filter(
    (s) =>
      (s.unit || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered Ports
  const filteredPorts = ports.filter(
    (p) =>
      (p.localAddr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.protocol || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150 text-[#cccccc]">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-5xl flex flex-col h-[650px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Server className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight flex items-center gap-2">
                远程主机运维工作台
                <span className="text-[11px] px-2 py-0.5 bg-[#2d2d2d] text-[#0078d4] border border-[#3c3c3c] rounded font-mono font-normal">
                  {sessionName}
                </span>
              </h2>
              <span className="text-[11px] text-[#858585] font-normal">
                Remote Process Tree, Systemd Services & Open Ports
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-[#858585] hover:text-[#e0e0e0] rounded hover:bg-[#333333] transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-[#858585] hover:text-[#e0e0e0] rounded p-1.5 hover:bg-[#333333] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar Tabs & Search */}
        <div className="px-5 py-2.5 bg-[#181818] border-b border-[#2b2b2b] flex items-center justify-between gap-4 shrink-0">
          <div className="flex bg-[#252526] p-0.5 rounded border border-[#2b2b2b]">
            <button
              onClick={() => setActiveTab('processes')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'processes'
                  ? 'bg-[#04395e] text-[#ffffff] border border-[#0078d4]/40 shadow-sm'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              进程管理 ({processes.length})
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'services'
                  ? 'bg-[#04395e] text-[#ffffff] border border-[#0078d4]/40 shadow-sm'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              系统服务 ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('ports')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'ports'
                  ? 'bg-[#04395e] text-[#ffffff] border border-[#0078d4]/40 shadow-sm'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              监听端口 ({ports.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#858585]" />
            <input
              type="text"
              placeholder="搜索 PID、命令、服务名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-all placeholder:text-[#858585]"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#1e1e1e]">
          {errorMsg && (
            <div className="mb-4 p-3 bg-[#a1260d]/15 border border-[#a1260d]/40 text-[#f48771] text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#f48771] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Processes Tab */}
          {activeTab === 'processes' && (
            <div className="border border-[#2b2b2b] rounded overflow-hidden shadow-sm bg-[#252526]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-[#1f1f1f] text-[#858585] border-b border-[#2b2b2b] select-none text-[11px]">
                    <th
                      className="py-2 px-3 cursor-pointer hover:text-[#cccccc]"
                      onClick={() => {
                        setSortField('pid');
                        setSortAsc(sortField === 'pid' ? !sortAsc : false);
                      }}
                    >
                      PID {sortField === 'pid' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th className="py-2 px-3">用户</th>
                    <th
                      className="py-2 px-3 cursor-pointer hover:text-[#cccccc]"
                      onClick={() => {
                        setSortField('cpu');
                        setSortAsc(sortField === 'cpu' ? !sortAsc : false);
                      }}
                    >
                      CPU % {sortField === 'cpu' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th
                      className="py-2 px-3 cursor-pointer hover:text-[#cccccc]"
                      onClick={() => {
                        setSortField('mem');
                        setSortAsc(sortField === 'mem' ? !sortAsc : false);
                      }}
                    >
                      MEM % {sortField === 'mem' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th className="py-2 px-3">状态</th>
                    <th className="py-2 px-3">运行时间</th>
                    <th className="py-2 px-3">命令行 / 程序</th>
                    <th className="py-2 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b] font-mono text-[11px]">
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-[#858585] font-sans text-xs">
                        未匹配到符合条件的进程
                      </td>
                    </tr>
                  ) : (
                    filteredProcesses.map((p) => (
                      <tr key={p.pid} className="hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-1.5 px-3 text-[#0078d4] font-bold">{p.pid}</td>
                        <td className="py-1.5 px-3 text-[#cccccc] font-sans">{p.user}</td>
                        <td className="py-1.5 px-3 font-semibold text-[#e0e0e0]">{p.cpu}%</td>
                        <td className="py-1.5 px-3 text-[#cccccc]">{p.mem}%</td>
                        <td className="py-1.5 px-3 text-[#858585]">{p.status}</td>
                        <td className="py-1.5 px-3 text-[#858585]">{p.time}</td>
                        <td className="py-1.5 px-3 text-[#cccccc] max-w-xs truncate font-sans" title={p.command}>
                          {p.command}
                        </td>
                        <td className="py-1.5 px-3 text-right font-sans space-x-1">
                          <button
                            onClick={() => handleKill(p.pid, false)}
                            className="px-2 py-0.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-[10px] border border-[#3c3c3c] transition-colors"
                            title="SIGTERM"
                          >
                            结束
                          </button>
                          <button
                            onClick={() => handleKill(p.pid, true)}
                            className="px-2 py-0.5 bg-[#a1260d]/20 hover:bg-[#a1260d]/30 text-[#f48771] rounded text-[10px] border border-[#a1260d]/40 transition-colors font-semibold"
                            title="SIGKILL (kill -9)"
                          >
                            强制
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="border border-[#2b2b2b] rounded overflow-hidden shadow-sm bg-[#252526]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-[#1f1f1f] text-[#858585] border-b border-[#2b2b2b] select-none text-[11px]">
                    <th className="py-2 px-3">服务单元 (Unit)</th>
                    <th className="py-2 px-3">状态</th>
                    <th className="py-2 px-3">描述</th>
                    <th className="py-2 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b] text-[11px]">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[#858585] text-xs">
                        未匹配到符合条件的服务
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <tr key={s.unit} className="hover:bg-[#2a2d2e] transition-colors font-sans">
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#e0e0e0]">{s.unit}</td>
                        <td className="py-1.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              s.active === 'active'
                                ? 'bg-[#388a34]/20 text-[#89d185] border border-[#388a34]/40'
                                : 'bg-[#3c3c3c]/50 text-[#858585] border border-[#3c3c3c]'
                            }`}
                          >
                            {s.active} ({s.sub})
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-[#858585] max-w-sm truncate" title={s.description}>
                          {s.description}
                        </td>
                        <td className="py-1.5 px-3 text-right space-x-1.5">
                          {s.active === 'active' ? (
                            <>
                              <button
                                onClick={() => handleServiceAction(s.unit, 'restart')}
                                className="px-2 py-0.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-[10px] border border-[#3c3c3c] transition-colors"
                              >
                                重启
                              </button>
                              <button
                                onClick={() => handleServiceAction(s.unit, 'stop')}
                                className="px-2 py-0.5 bg-[#a1260d]/20 hover:bg-[#a1260d]/30 text-[#f48771] rounded text-[10px] border border-[#a1260d]/40 transition-colors"
                              >
                                停止
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleServiceAction(s.unit, 'start')}
                              className="px-2.5 py-0.5 bg-[#0078d4] hover:bg-[#006cbe] text-white rounded text-[10px] transition-colors"
                            >
                              启动
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Ports Tab */}
          {activeTab === 'ports' && (
            <div className="border border-[#2b2b2b] rounded overflow-hidden shadow-sm bg-[#252526]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-[#1f1f1f] text-[#858585] border-b border-[#2b2b2b] select-none text-[11px]">
                    <th className="py-2 px-3">协议</th>
                    <th className="py-2 px-3">监听地址与端口 (Local Address)</th>
                    <th className="py-2 px-3">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b] font-mono text-[11px]">
                  {filteredPorts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-[#858585] font-sans text-xs">
                        未扫描到开放的监听端口
                      </td>
                    </tr>
                  ) : (
                    filteredPorts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-1.5 px-3 font-bold uppercase text-[#0078d4]">{p.protocol}</td>
                        <td className="py-1.5 px-3 text-[#cccccc]">{p.localAddr}</td>
                        <td className="py-1.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#388a34]/20 text-[#89d185] border border-[#388a34]/40">
                            {p.state || 'LISTEN'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

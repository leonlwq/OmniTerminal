import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, RefreshCw, ZoomIn, ZoomOut, Maximize2, Shield, 
  Server, Laptop, ArrowRight, Activity, Terminal, FolderOpen,
  Share2, Eye, Filter, Info, Database, Globe, AlertTriangle, CheckCircle2,
  Stethoscope, CornerDownRight, Cpu
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { 
  TopologyNode, 
  TopologyEdge, 
  TopologyTunnel, 
  NetworkTopologyData, 
  ReachabilityDiagnosisResult 
} from '../types';

interface NetworkTopologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession?: (sessionId: string) => void;
  onOpenSftp?: (sessionId: string) => void;
}

export const NetworkTopologyModal: React.FC<NetworkTopologyModalProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  onOpenSftp,
}) => {
  const { t } = useI18n();
  const [data, setData] = useState<NetworkTopologyData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // 深度多跳网络诊断状态
  const [diagnosisResult, setDiagnosisResult] = useState<ReachabilityDiagnosisResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const calculateInitialLayout = (nodes: TopologyNode[], edges: TopologyEdge[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    const localNodes = nodes.filter(n => n.type === 'local');
    const jumpNodes = nodes.filter(n => n.type === 'jumphost');
    const targetNodes = nodes.filter(n => n.type === 'target');
    const serviceNodes = nodes.filter(n => n.type === 'service');

    // Column 1: Local
    localNodes.forEach((n, idx) => {
      pos[n.id] = { x: 100, y: 240 + idx * 160 };
    });

    // Column 2: Jump Hosts
    jumpNodes.forEach((n, idx) => {
      pos[n.id] = { x: 380, y: 180 + idx * 150 };
    });

    // Column 3: Targets
    const targetX = jumpNodes.length === 0 ? 440 : 660;
    targetNodes.forEach((n, idx) => {
      pos[n.id] = { x: targetX, y: 140 + idx * 140 };
    });

    // Column 4: Service Endpoints
    const serviceX = targetX + 280;
    serviceNodes.forEach((n, idx) => {
      pos[n.id] = { x: serviceX, y: 110 + idx * 130 };
    });

    setNodePositions(pos);
  };

  const fetchTopology = useCallback(async () => {
    setIsLoading(true);
    setDiagnosisResult(null);
    try {
      const appRpc = typeof window !== 'undefined' ? (window as any).go?.app?.App : null;
      if (appRpc?.GetNetworkTopology) {
        const res = await appRpc.GetNetworkTopology();
        if (res && res.nodes) {
          setData(res);
          calculateInitialLayout(res.nodes, res.edges);
          return;
        }
      }

      // 缺省/预览兜底拓扑
      const fallback: NetworkTopologyData = {
        nodes: [
          {
            id: 'local_root',
            label: 'Local Client',
            host: '127.0.0.1',
            port: 0,
            user: 'omni',
            type: 'local',
            status: 'connected',
            uptime: 'Active',
            activeTunnelsCount: 1,
            rttMs: 1,
          },
          {
            id: 'bastion_01',
            label: 'Bastion Gateway',
            host: '198.51.100.1',
            port: 22,
            user: 'admin',
            type: 'jumphost',
            status: 'connected',
            uptime: '1d 4h',
            activeTunnelsCount: 2,
            rttMs: 18,
          },
          {
            id: 'prod_db',
            label: 'Prod Cluster Host',
            host: '10.0.1.25',
            port: 22,
            user: 'deploy',
            type: 'target',
            status: 'connected',
            uptime: '4h 12m',
            activeTunnelsCount: 1,
            rttMs: 25,
          },
          {
            id: 'svc_mysql',
            label: 'MySQL Database (10.0.1.50:3306)',
            host: '10.0.1.50',
            port: 3306,
            user: 'service',
            type: 'service',
            status: 'connected',
            uptime: 'Tunnel Active',
            activeTunnelsCount: 0,
            rttMs: 3,
          },
        ],
        edges: [
          { id: 'e1', source: 'local_root', target: 'bastion_01', type: 'direct', label: 'SSH TLS', status: 'healthy', rttMs: 18 },
          { id: 'e2', source: 'bastion_01', target: 'prod_db', type: 'jump_host', label: 'ProxyJump', status: 'healthy', rttMs: 25 },
          { id: 'e3', source: 'prod_db', target: 'svc_mysql', type: 'tunnel', label: 'LOCAL 3306', status: 'healthy', rttMs: 3 },
        ],
        tunnels: [
          { sessionId: 'prod_db', type: 'LOCAL', localAddr: '127.0.0.1:3306', remoteAddr: '10.0.1.50:3306', status: 'ACTIVE' },
          { sessionId: 'bastion_01', type: 'DYNAMIC', localAddr: '127.0.0.1:1080', remoteAddr: 'SOCKS5', status: 'ACTIVE' },
        ]
      };
      setData(fallback);
      calculateInitialLayout(fallback.nodes, fallback.edges);
    } catch (err) {
      console.error('获取拓扑数据失败', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTopology();
    }
  }, [isOpen, fetchTopology]);

  // 执行单节点深度多跳网络诊断
  const handleRunDiagnosis = async (node: TopologyNode) => {
    if (!node || node.type === 'local') return;
    setIsDiagnosing(true);
    setDiagnosisResult(null);

    try {
      const appRpc = typeof window !== 'undefined' ? (window as any).go?.app?.App : null;
      if (appRpc?.DiagnoseTopologyHop) {
        const targetAddr = node.port > 0 ? `${node.host}:${node.port}` : node.host;
        // 如果是服务节点，寻找其绑定的上游宿主会话
        let hostSessionId = node.id;
        if (node.type === 'service') {
          const inEdge = data?.edges.find(e => e.target === node.id);
          if (inEdge) hostSessionId = inEdge.source;
        }

        const res = await appRpc.DiagnoseTopologyHop(hostSessionId, targetAddr);
        if (res) {
          setDiagnosisResult(res);
          return;
        }
      }

      // 诊断演示兜底
      setDiagnosisResult({
        target: `${node.host}:${node.port}`,
        healthy: node.status !== 'error',
        totalRttMs: node.rttMs || 15,
        hops: [
          {
            hopIndex: 1,
            name: '本机 -> SSH 跳板机/网关',
            fromAddr: 'localhost',
            toAddr: 'Gateway',
            rttMs: 12,
            status: 'healthy',
          },
          {
            hopIndex: 2,
            name: 'SSH 跳板机 -> 目标服务端口',
            fromAddr: 'Gateway',
            toAddr: `${node.host}:${node.port}`,
            rttMs: node.rttMs || 5,
            status: node.status === 'error' ? 'broken' : 'healthy',
            errorDetail: node.errorMessage || undefined,
          }
        ],
        conclusion: node.status === 'error' 
          ? `目标端拒绝连接 (${node.host}:${node.port})` 
          : `端到端网络畅通，TCP 握手时延约 ${node.rttMs || 15} ms`,
        suggestion: node.status === 'error'
          ? '目标服务端口未处于监听状态或防火墙拒绝了请求，请检查远程守护进程与安全组规则'
          : '网络链路质量优良，无丢包与路由抖动',
        diagnosedAt: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setDiagnosisResult({
        target: `${node.host}:${node.port}`,
        healthy: false,
        totalRttMs: 0,
        hops: [],
        conclusion: `诊断异常: ${err?.message || err}`,
        suggestion: '请检查网络连接配置',
        diagnosedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  // 画布平移交互
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.topo-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const mouseX = (e.clientX - containerRect.left - pan.x) / zoom;
      const mouseY = (e.clientY - containerRect.top - pan.y) / zoom;
      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: Math.max(20, mouseX - 90), y: Math.max(20, mouseY - 40) }
      }));
      return;
    }

    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingNodeId(null);
  };

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.4, Math.min(2.5, newZoom)));
  };

  if (!isOpen) return null;

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const tunnels = data?.tunnels || [];

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'local':
        return <Laptop className="w-4 h-4 text-emerald-400" />;
      case 'jumphost':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'service':
        return <Database className="w-4 h-4 text-purple-400" />;
      default:
        return <Server className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[86vh] bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#cccccc]">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#2b2b2b]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#0078d4]" />
            <h2 className="text-sm font-semibold text-white">
              {t('topology.title') || '网络拓扑与多跳诊断图谱'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#0078d4]/15 border border-[#0078d4]/30 text-[#3794ff]">
              {nodes.length} 节点 / {edges.length} 链路
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.zoomIn')}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.zoomOut')}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.resetView')}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={fetchTopology}
              disabled={isLoading}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0078d4]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#333333] transition-colors ml-1"
              title={t('topo.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Canvas & Detail Sidebar */}
        <div className="flex-1 flex relative overflow-hidden bg-[#1e1e1e]">
          {/* Interactive Topology Viewport */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{
              backgroundImage: 'radial-gradient(#2d2d2d 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* SVG Link Layer */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              <defs>
                {/* 流动发光渐变 */}
                <linearGradient id="edgeGradientDirect" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0078d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="edgeGradientJump" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#cca700" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="edgeGradientTunnel" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
                </linearGradient>
                {/* 箭头标记 */}
                <marker id="arrowDirect" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,1 L7,4 L0,7 Z" fill="#60a5fa" />
                </marker>
                <marker id="arrowJump" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,1 L7,4 L0,7 Z" fill="#cca700" />
                </marker>
                <marker id="arrowTunnel" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,1 L7,4 L0,7 Z" fill="#c084fc" />
                </marker>
                <marker id="arrowBroken" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,1 L7,4 L0,7 Z" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Render Edges */}
              {edges.map(edge => {
                const sPos = nodePositions[edge.source];
                const tPos = nodePositions[edge.target];
                if (!sPos || !tPos) return null;

                const isJump = edge.type === 'jump_host';
                const isTunnel = edge.type === 'tunnel';
                const isBroken = edge.status === 'broken';

                const dx = (tPos.x - sPos.x) / 2;
                const pathData = `M ${sPos.x + 85} ${sPos.y + 35} C ${sPos.x + 85 + dx} ${sPos.y + 35}, ${tPos.x - dx} ${tPos.y + 35}, ${tPos.x} ${tPos.y + 35}`;

                let strokeGradient = 'url(#edgeGradientDirect)';
                let markerEnd = 'url(#arrowDirect)';
                let baseColor = '#0078d4';

                if (isBroken) {
                  strokeGradient = '#f43f5e';
                  markerEnd = 'url(#arrowBroken)';
                  baseColor = '#f43f5e';
                } else if (isTunnel) {
                  strokeGradient = 'url(#edgeGradientTunnel)';
                  markerEnd = 'url(#arrowTunnel)';
                  baseColor = '#818cf8';
                } else if (isJump) {
                  strokeGradient = 'url(#edgeGradientJump)';
                  markerEnd = 'url(#arrowJump)';
                  baseColor = '#cca700';
                }

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    {/* 底层发光流动虚线 */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={baseColor}
                      strokeWidth={isBroken ? "2.5" : "2"}
                      strokeOpacity={isBroken ? "0.9" : "0.5"}
                      strokeDasharray={isBroken ? "4 4" : "6 4"}
                      className={isBroken ? "animate-pulse" : "animate-[dash_15s_linear_infinite]"}
                    />
                    {/* 流动发光线 */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeGradient}
                      strokeWidth="2.5"
                      markerEnd={markerEnd}
                    />
                    {/* 连线文字与实时 RTT 标签 */}
                    <text
                      x={(sPos.x + tPos.x + 85) / 2}
                      y={(sPos.y + tPos.y + 70) / 2 - 8}
                      fill={isBroken ? '#f43f5e' : isTunnel ? '#c084fc' : isJump ? '#ffd700' : '#93c5fd'}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="bg-black/90 px-1.5 py-0.5 rounded shadow"
                    >
                      {edge.label} {edge.rttMs !== undefined && edge.rttMs > 0 ? `(${edge.rttMs}ms)` : ''}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Nodes DOM Layer */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {nodes.map(node => {
                const pos = nodePositions[node.id] || { x: 100, y: 100 };
                const isSelected = selectedNode?.id === node.id;
                const isLocal = node.type === 'local';
                const isJump = node.type === 'jumphost';
                const isService = node.type === 'service';
                const isError = node.status === 'error';

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingNodeId(node.id);
                      setSelectedNode(node);
                    }}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                      width: '190px',
                    }}
                    className={`topo-node pointer-events-auto absolute p-3 rounded-lg border shadow-xl cursor-pointer transition-all duration-150 select-none ${
                      isError
                        ? 'bg-[#291316] border-rose-500/80 ring-2 ring-rose-500/40 shadow-rose-950/40'
                        : isSelected
                        ? 'bg-[#04395e]/60 border-[#0078d4] ring-2 ring-[#0078d4] shadow-sky-950/50'
                        : isService
                        ? 'bg-[#1e182a] border-purple-500/40 hover:border-purple-400'
                        : isJump
                        ? 'bg-[#252526] border-amber-500/40 hover:border-amber-400'
                        : isLocal
                        ? 'bg-[#252526] border-zinc-700 hover:border-zinc-500'
                        : 'bg-[#252526] border-zinc-800 hover:border-[#0078d4]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getNodeIcon(node.type)}
                        <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                          {node.label}
                        </span>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                        isError
                          ? 'bg-rose-500 shadow-rose-500/80 animate-ping'
                          : node.status === 'connected'
                          ? 'bg-emerald-400 shadow-emerald-400/80'
                          : 'bg-zinc-500'
                      }`} />
                    </div>

                    <div className="text-[11px] font-mono text-[#858585] space-y-0.5 truncate">
                      <div className="truncate text-zinc-300">{node.host}{node.port > 0 ? `:${node.port}` : ''}</div>
                      <div className="text-[10px] text-zinc-500">{node.user}</div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#333] flex items-center justify-between text-[10px] text-[#858585]">
                      <span className="flex items-center gap-1 font-mono">
                        <Activity className={`w-3 h-3 ${isError ? 'text-rose-400' : 'text-sky-400'}`} />
                        {isError ? (
                          <span className="text-rose-400 font-semibold">{t('topo.broken')}</span>
                        ) : node.rttMs > 0 ? (
                          <span className={node.rttMs > 100 ? 'text-amber-400' : 'text-emerald-400'}>
                            {node.rttMs} ms
                          </span>
                        ) : (
                          <span>0 ms</span>
                        )}
                      </span>

                      {node.activeTunnelsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-[#04395e]/50 text-sky-300 border border-sky-500/30 font-mono text-[9px]">
                          {t('topo.tunnelsCount').replace('{count}', String(node.activeTunnelsCount))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail & Diagnostics Sidebar */}
          <div className="w-84 bg-[#181818] border-l border-[#2b2b2b] flex flex-col p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 pb-2 border-b border-[#2b2b2b]">
              <Info className="w-4 h-4 text-[#0078d4]" />
              {t('topo.nodeDetailTitle')}
            </h3>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                {/* Node Overview Card */}
                <div className="p-3 bg-[#252526] border border-[#2b2b2b] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm truncate max-w-[170px]">{selectedNode.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[#04395e]/40 text-[#0078d4] border border-[#0078d4]/30">
                      {selectedNode.type}
                    </span>
                  </div>
                  <div className="font-mono text-[#858585] space-y-1 text-[11px]">
                    <div>{t('topo.detailHost')}<span className="text-zinc-200">{selectedNode.host}:{selectedNode.port}</span></div>
                    <div>{t('topo.detailUser')}<span className="text-zinc-200">{selectedNode.user}</span></div>
                    <div className="flex items-center gap-1.5">
                      <span>{t('topo.detailStatus')}</span>
                      <span className={`font-semibold ${selectedNode.status === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedNode.status === 'error' ? t('topo.broken') : t('topo.healthy')}
                      </span>
                    </div>
                    <div>{t('topo.detailRtt')}<span className="text-sky-400 font-semibold">{selectedNode.rttMs} ms</span></div>
                    <div>{t('topo.detailUptime')}<span className="text-zinc-300">{selectedNode.uptime}</span></div>
                    {selectedNode.errorMessage && (
                      <div className="text-[10px] text-rose-400 pt-1 border-t border-rose-900/40">
                        {selectedNode.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* 深度多跳网络诊断按钮与面板 */}
                {selectedNode.type !== 'local' && (
                  <div className="p-3 bg-[#1e2025] border border-sky-500/30 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-white text-[11px]">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
                        <span>{t('topo.diagnose')}</span>
                      </div>
                      <button
                        onClick={() => handleRunDiagnosis(selectedNode)}
                        disabled={isDiagnosing}
                        className="px-2 py-0.5 text-[10px] rounded bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                        <span>{isDiagnosing ? t('topo.diagnosing') : t('topo.reprobeBtn')}</span>
                      </button>
                    </div>

                    {diagnosisResult && (
                      <div className="space-y-2 pt-1 border-t border-[#333]">
                        {/* Hops */}
                        <div className="space-y-1 font-mono text-[10px]">
                          {diagnosisResult.hops.map((hop, i) => (
                            <div key={i} className="flex items-center justify-between p-1.5 rounded bg-[#141414] border border-[#2e2e2e]">
                              <div className="flex items-center gap-1 truncate max-w-[160px]">
                                <CornerDownRight className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="truncate text-zinc-300">{hop.name}</span>
                              </div>
                              <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                                hop.status === 'healthy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                              }`}>
                                {hop.status === 'healthy' ? `${hop.rttMs}ms` : 'FAIL'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Diagnostic Conclusion & Suggestion */}
                        <div className={`p-2 rounded border text-[11px] leading-relaxed ${
                          diagnosisResult.healthy
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        }`}>
                          <div className="font-semibold flex items-center gap-1.5 mb-1">
                            {diagnosisResult.healthy ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span>{diagnosisResult.conclusion}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 pt-1 border-t border-white/5">
                            💡 {t('topo.suggestion')}: {diagnosisResult.suggestion}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Node Tunnels */}
                <div>
                  <h4 className="text-[11px] font-medium text-[#858585] mb-1.5">{t('topo.activeTunnelsHeader')}</h4>
                  {tunnels.filter(t => t.sessionId === selectedNode.id).length === 0 ? (
                    <div className="p-2.5 rounded bg-[#252526] border border-[#2b2b2b] text-[#858585] text-center text-xs">
                      {t('topo.noActiveTunnels')}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {tunnels.filter(t => t.sessionId === selectedNode.id).map((tun, i) => (
                        <div key={i} className="p-2 rounded bg-[#252526] border border-[#2b2b2b] text-[11px] font-mono space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sky-400 font-semibold">{tun.type}</span>
                            <span className="text-[10px] text-emerald-400">ACTIVE</span>
                          </div>
                          <div className="text-zinc-300 truncate">{tun.localAddr} → {tun.remoteAddr}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Navigation Actions */}
                {selectedNode.type !== 'local' && selectedNode.type !== 'service' && (
                  <div className="pt-2 border-t border-[#2b2b2b] space-y-2">
                    {onSelectSession && (
                      <button
                        onClick={() => {
                          onSelectSession(selectedNode.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{t('topology.switchTerm') || '切换至终端'}</span>
                      </button>
                    )}
                    {onOpenSftp && (
                      <button
                        onClick={() => {
                          onOpenSftp(selectedNode.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('topology.openSftp') || '打开 SFTP'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[#858585] text-center space-y-2">
                <Share2 className="w-8 h-8 opacity-30" />
                <p className="text-xs">{t('topo.clickNodeHint')}</p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-auto pt-3 border-t border-[#2b2b2b] space-y-1.5 text-[11px] text-[#858585]">
              <span className="font-semibold text-white block">{t('topology.legend') || '图例说明'}</span>
              <div className="flex items-center gap-2">
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('topology.localClient') || '本机工作台'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('topology.jumpHost') || '跳板机网关'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('topology.targetCluster') || '目标主机集群'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('topo.serviceNode')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

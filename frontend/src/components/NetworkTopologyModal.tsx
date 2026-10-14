import React, { useState, useEffect, useRef } from 'react';
import { 
  X, RefreshCw, ZoomIn, ZoomOut, Maximize2, Shield, 
  Server, Laptop, ArrowRight, Activity, Terminal, FolderOpen,
  Share2, Eye, Filter, Info
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface TopologyNode {
  id: string;
  label: string;
  host: string;
  port: number;
  user: string;
  type: 'local' | 'jumphost' | 'target';
  status: 'connected' | 'disconnected';
  uptime: string;
  activeTunnelsCount: number;
  rttMs: number;
  x?: number;
  y?: number;
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: 'direct' | 'jump_host' | 'cascade';
  label: string;
}

interface TopologyTunnel {
  sessionId: string;
  type: 'LOCAL' | 'REMOTE' | 'DYNAMIC';
  localAddr: string;
  remoteAddr: string;
  status: string;
}

interface NetworkTopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  tunnels: TopologyTunnel[];
}

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

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTopology = async () => {
    setIsLoading(true);
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

      // 缺省/预览兜底拓扑（例如当前未连或离线模式）
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
            label: 'Prod MySQL Cluster',
            host: '10.0.1.25',
            port: 22,
            user: 'deploy',
            type: 'target',
            status: 'connected',
            uptime: '4h 12m',
            activeTunnelsCount: 1,
            rttMs: 25,
          },
        ],
        edges: [
          { id: 'e1', source: 'local_root', target: 'bastion_01', type: 'direct', label: 'SSH TLS' },
          { id: 'e2', source: 'bastion_01', target: 'prod_db', type: 'jump_host', label: 'ProxyJump' },
        ],
        tunnels: [
          { sessionId: 'prod_db', type: 'LOCAL', localAddr: '127.0.0.1:3306', remoteAddr: '127.0.0.1:3306', status: 'ACTIVE' },
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
  };

  const calculateInitialLayout = (nodes: TopologyNode[], edges: TopologyEdge[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    const localNodes = nodes.filter(n => n.type === 'local');
    const jumpNodes = nodes.filter(n => n.type === 'jumphost');
    const targetNodes = nodes.filter(n => n.type === 'target');

    // Column 1: Local
    localNodes.forEach((n, idx) => {
      pos[n.id] = { x: 120, y: 260 + idx * 160 };
    });

    // Column 2: Jump Hosts
    if (jumpNodes.length === 0) {
      // 目标直接排布在右侧
      targetNodes.forEach((n, idx) => {
        pos[n.id] = { x: 550, y: 160 + idx * 130 };
      });
    } else {
      jumpNodes.forEach((n, idx) => {
        pos[n.id] = { x: 420, y: 200 + idx * 150 };
      });
      targetNodes.forEach((n, idx) => {
        pos[n.id] = { x: 750, y: 140 + idx * 120 };
      });
    }

    setNodePositions(pos);
  };

  useEffect(() => {
    if (isOpen) {
      fetchTopology();
    }
  }, [isOpen]);

  // 画布平移交互
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.topo-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      // 拖拽单个节点
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const mouseX = (e.clientX - containerRect.left - pan.x) / zoom;
      const mouseY = (e.clientY - containerRect.top - pan.y) / zoom;
      setNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: Math.max(50, mouseX), y: Math.max(50, mouseY) }
      }));
      return;
    }

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(2.0, Math.max(0.4, prev + delta)));
  };

  if (!isOpen) return null;

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const tunnels = data?.tunnels || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="flex flex-col w-[92vw] max-w-[1250px] h-[85vh] bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] overflow-hidden text-[#cccccc]">
        
        {/* Top Header & Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] flex items-center gap-2">
                {t('topology.title')}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#04395e]/40 text-[#0078d4] border border-[#0078d4]/30">
                  {nodes.length} Nodes / {edges.length} Edges / {tunnels.length} Tunnels
                </span>
              </h2>
              <p className="text-xs text-[#858585]">
                {t('topology.subtitle')}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.zoomIn') || '放大画布'}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.zoomOut') || '缩小画布'}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.resetView') || '重置视角'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={fetchTopology}
              disabled={isLoading}
              className="p-1.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors"
              title={t('topo.refresh') || '刷新拓扑'}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0078d4]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#333333] transition-colors ml-1"
              title={t('topo.close') || '关闭'}
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
                  <stop offset="100%" stopColor="#0078d4" stopOpacity="0.9" />
                </linearGradient>
                {/* 箭头标记 */}
                <marker id="arrowDirect" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,1 L7,4 L0,7 Z" fill="#60a5fa" />
                </marker>
                <marker id="arrowJump" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M0,1 L7,4 L0,7 Z" fill="#cca700" />
                </marker>
              </defs>

              {/* Render Edges */}
              {edges.map(edge => {
                const sPos = nodePositions[edge.source];
                const tPos = nodePositions[edge.target];
                if (!sPos || !tPos) return null;

                const isJump = edge.type === 'jump_host';
                // 绘制平滑贝塞尔曲线
                const dx = (tPos.x - sPos.x) / 2;
                const pathData = `M ${sPos.x + 80} ${sPos.y + 35} C ${sPos.x + 80 + dx} ${sPos.y + 35}, ${tPos.x - dx} ${tPos.y + 35}, ${tPos.x} ${tPos.y + 35}`;

                return (
                  <g key={edge.id}>
                    {/* 底层发光虚线 */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isJump ? '#cca700' : '#0078d4'}
                      strokeWidth="2"
                      strokeOpacity="0.6"
                      strokeDasharray="6 4"
                      className="animate-[dash_20s_linear_infinite]"
                    />
                    {/* 流动光粒子动画线 */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isJump ? 'url(#edgeGradientJump)' : 'url(#edgeGradientDirect)'}
                      strokeWidth="2.5"
                      markerEnd={isJump ? 'url(#arrowJump)' : 'url(#arrowDirect)'}
                    />
                    {/* 连线文字标签 */}
                    <text
                      x={(sPos.x + tPos.x + 80) / 2}
                      y={(sPos.y + tPos.y + 70) / 2 - 8}
                      fill={isJump ? '#ffd700' : '#93c5fd'}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="bg-black/80 px-1 py-0.5 rounded"
                    >
                      {edge.label}
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
                      width: '180px',
                    }}
                    className={`topo-node pointer-events-auto absolute p-3 rounded border shadow-lg cursor-pointer transition-shadow select-none ${
                      isSelected
                        ? 'bg-[#04395e]/40 border-[#0078d4] ring-1 ring-[#0078d4]'
                        : isJump
                        ? 'bg-[#252526] border-[#cca700]/50 hover:border-[#cca700]'
                        : isLocal
                        ? 'bg-[#252526] border-[#3c3c3c] hover:border-[#484848]'
                        : 'bg-[#252526] border-[#2b2b2b] hover:border-[#0078d4]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {isLocal ? (
                          <Laptop className="w-4 h-4 text-[#4ec9b0]" />
                        ) : isJump ? (
                          <Shield className="w-4 h-4 text-[#cca700]" />
                        ) : (
                          <Server className="w-4 h-4 text-[#0078d4]" />
                        )}
                        <span className="text-xs font-medium text-[#e0e0e0] truncate max-w-[110px]">
                          {node.label}
                        </span>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${node.status === 'connected' ? 'bg-[#4ec9b0]' : 'bg-[#f14c4c]'}`} />
                    </div>

                    <div className="text-[11px] font-mono text-[#858585] space-y-0.5 truncate">
                      <div>{node.host}{node.port > 0 ? `:${node.port}` : ''}</div>
                      <div className="text-[10px] text-[#858585]">{node.user}</div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#2b2b2b] flex items-center justify-between text-[10px] text-[#858585]">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#0078d4]" />
                        {node.rttMs}ms
                      </span>
                      {node.activeTunnelsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-[#04395e]/40 text-[#0078d4] border border-[#0078d4]/30">
                          {(t('topo.tunnelsCount') || '{count} 隧道').replace('{count}', String(node.activeTunnelsCount))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Sidebar */}
          <div className="w-80 bg-[#181818] border-l border-[#2b2b2b] flex flex-col p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5 pb-2 border-b border-[#2b2b2b]">
              <Info className="w-4 h-4 text-[#0078d4]" />
              {t('topo.nodeDetailTitle') || '节点与隧道详细信息'}
            </h3>

            {selectedNode ? (
              <div className="space-y-3.5 text-xs">
                {/* Card */}
                <div className="p-3 bg-[#252526] border border-[#2b2b2b] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#e0e0e0] text-sm">{selectedNode.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[#04395e]/40 text-[#0078d4] border border-[#0078d4]/30">
                      {selectedNode.type}
                    </span>
                  </div>
                  <div className="font-mono text-[#858585] space-y-1 text-[11px]">
                    <div>{t('topo.detailHost') || '主机: '}<span className="text-[#cccccc]">{selectedNode.host}:{selectedNode.port}</span></div>
                    <div>{t('topo.detailUser') || '用户: '}<span className="text-[#cccccc]">{selectedNode.user}</span></div>
                    <div>{t('topo.detailStatus') || '状态: '}<span className="text-[#4ec9b0] font-semibold">{selectedNode.status}</span></div>
                    <div>{t('topo.detailRtt') || 'RTT 时延: '}<span className="text-[#0078d4]">{selectedNode.rttMs} ms</span></div>
                    <div>{t('topo.detailUptime') || '在线时长: '}<span className="text-[#cccccc]">{selectedNode.uptime}</span></div>
                  </div>
                </div>

                {/* Node Tunnels */}
                <div>
                  <h4 className="text-[11px] font-medium text-[#858585] mb-1.5">{t('topo.activeTunnelsHeader') || '经由此节点的活动隧道:'}</h4>
                  {tunnels.filter(t => t.sessionId === selectedNode.id).length === 0 ? (
                    <div className="p-2.5 rounded bg-[#252526] border border-[#2b2b2b] text-[#858585] text-center text-xs">
                      {t('topo.noActiveTunnels') || '无活动转发隧道'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tunnels.filter(t => t.sessionId === selectedNode.id).map((tun, i) => (
                        <div key={i} className="p-2.5 rounded bg-[#252526] border border-[#2b2b2b] text-[11px] font-mono space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[#0078d4] font-semibold">{(t('topo.forwarding') || '{type} 转发').replace('{type}', tun.type)}</span>
                            <span className="text-[10px] text-[#4ec9b0]">ACTIVE</span>
                          </div>
                          <div className="text-[#cccccc] truncate">{tun.localAddr} → {tun.remoteAddr}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedNode.type !== 'local' && (
                  <div className="pt-3 border-t border-[#2b2b2b] space-y-2">
                    {onSelectSession && (
                      <button
                        onClick={() => {
                          onSelectSession(selectedNode.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{t('topology.switchTerm')}</span>
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
                        <FolderOpen className="w-3.5 h-3.5 text-[#cca700]" />
                        <span>{t('topology.openSftp')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[#858585] text-center space-y-2">
                <Share2 className="w-8 h-8 opacity-30" />
                <p className="text-xs">{t('topo.clickNodeHint') || '点击画布中任意节点查看链路详情与隧道管线'}</p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-auto pt-4 border-t border-[#2b2b2b] space-y-2 text-[11px] text-[#858585]">
              <span className="font-semibold text-[#e0e0e0] block">{t('topology.legend')}</span>
              <div className="flex items-center gap-2">
                <Laptop className="w-3.5 h-3.5 text-[#4ec9b0]" />
                <span>{t('topology.localClient')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#cca700]" />
                <span>{t('topology.jumpHost')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>{t('topology.targetCluster')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

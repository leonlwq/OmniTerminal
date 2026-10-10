import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Maximize, Minimize, RefreshCw, KeyRound, 
  Volume2, VolumeX, ShieldCheck, Power, Settings2, Sparkles
} from 'lucide-react';
import { app } from '../../wailsjs/go/models';

interface RdpInstanceProps {
  tab: app.SessionConfig;
  isActive: boolean;
  onStatusChange?: (id: string, status: string) => void;
}

export const RdpInstance: React.FC<RdpInstanceProps> = ({
  tab,
  isActive,
  onStatusChange,
}) => {
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [scaleMode, setScaleMode] = useState<'fit' | 'original' | 'stretch'>('fit');
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setConnecting(true);
    const timer = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      onStatusChange?.(tab.id, 'connected');

      // Draw initial simulated high-definition remote desktop canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const w = canvasRef.current.width;
          const h = canvasRef.current.height;
          // Wallpaper gradient
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#004e92');
          grad.addColorStop(1, '#000428');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Windows taskbar
          ctx.fillStyle = '#0a101b';
          ctx.fillRect(0, h - 40, w, 40);

          // Start button
          ctx.fillStyle = '#0078d4';
          ctx.fillRect(10, h - 34, 28, 28);

          // Host banner text
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
          ctx.fillText(`OmniTerminal RDP Session: ${tab.name} (${tab.host || '127.0.0.1'}:${tab.port || 3389})`, 60, 40);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '13px monospace';
          ctx.fillText(`User: ${tab.user || 'Administrator'} | Protocol: RDP v10.4 | Audio: PCM Stereo 48kHz`, 60, 65);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [tab.id, tab.host, tab.port]);

  const handleSendCtrlAltDel = () => {
    alert(`已向远端主机 [${tab.name}] 发送 Ctrl+Alt+Delete 系统中断调用`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] relative overflow-hidden select-none">
      {/* Top Floating Control Ribbon */}
      <div className="h-8 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between px-3 z-20 text-xs text-[#cccccc]">
        <div className="flex items-center space-x-2">
          <Monitor className="w-3.5 h-3.5 text-[#3794ff]" />
          <span className="font-semibold text-[11px] text-[#cccccc]">{tab.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0078d4]/20 text-[#3794ff] font-mono">
            RDP {resolution.width}x{resolution.height}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSendCtrlAltDel}
            className="px-2 py-0.5 bg-[#0078d4]/20 hover:bg-[#0078d4] text-[#3794ff] hover:text-white rounded text-[10px] font-medium transition-colors"
            title="发送 Ctrl+Alt+Delete 安全中断指令"
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            title={isAudioEnabled ? "静音远程音频" : "启用远程音频重定向"}
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setScaleMode(prev => prev === 'fit' ? 'original' : 'fit')}
            className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            title={`当前显示模式: ${scaleMode === 'fit' ? '自适应缩放' : '原始像素'}`}
          >
            {scaleMode === 'fit' ? <Minimize className="w-3.5 h-3.5 text-[#3794ff]" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* RDP Graphics Viewport */}
      <div className="flex-1 flex items-center justify-center p-2 relative overflow-auto">
        {connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090b0e]/95 z-30 space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-300 font-medium">正在建立 RDP 远程图形桌面通道 ({tab.host}:{tab.port || 3389})...</p>
            <p className="text-[10px] text-slate-500 font-mono">Negotiating NLA / TLS Security & Screen Resolution</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={resolution.width}
          height={resolution.height}
          className={`shadow-2xl rounded-md transition-all ${
            scaleMode === 'fit' ? 'max-w-full max-h-full object-contain' : ''
          }`}
          style={{
            maxWidth: scaleMode === 'fit' ? '100%' : undefined,
            maxHeight: scaleMode === 'fit' ? '100%' : undefined,
          }}
        />
      </div>
    </div>
  );
};

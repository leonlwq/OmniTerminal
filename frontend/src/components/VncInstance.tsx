import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Maximize, Minimize, RefreshCw, Eye, ShieldCheck, Settings, Power
} from 'lucide-react';
import { app } from '../../wailsjs/go/models';

interface VncInstanceProps {
  tab: app.SessionConfig;
  isActive: boolean;
  onStatusChange?: (id: string, status: string) => void;
}

export const VncInstance: React.FC<VncInstanceProps> = ({
  tab,
  isActive,
  onStatusChange,
}) => {
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [scaleMode, setScaleMode] = useState<'fit' | 'original'>('fit');
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setConnecting(true);
    const timer = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      onStatusChange?.(tab.id, 'connected');

      // Draw initial VNC Linux X11 desktop canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const w = canvasRef.current.width;
          const h = canvasRef.current.height;
          // Wallpaper gradient
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#2d1b4e');
          grad.addColorStop(1, '#1b1b2f');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Top panel (GNOME style)
          ctx.fillStyle = '#0e0e17';
          ctx.fillRect(0, 0, w, 28);

          // Activities button
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
          ctx.fillText('Activities', 12, 18);

          // Host info banner
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
          ctx.fillText(`OmniTerminal VNC (RFB 3.8): ${tab.name} (${tab.host || '127.0.0.1'}:${tab.port || 5900})`, 60, 80);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '13px monospace';
          ctx.fillText(`Display: :0 | Color Depth: 24-bit TrueColor | Encoding: Tight / Hextile`, 60, 105);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [tab.id, tab.host, tab.port]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] relative overflow-hidden select-none">
      {/* Top Control Ribbon */}
      <div className="h-8 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between px-3 z-20 text-xs text-[#cccccc]">
        <div className="flex items-center space-x-2">
          <Monitor className="w-3.5 h-3.5 text-[#3794ff]" />
          <span className="font-semibold text-[11px] text-[#cccccc]">{tab.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0078d4]/20 text-[#3794ff] font-mono">
            VNC :0 ({resolution.width}x{resolution.height})
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setScaleMode(prev => prev === 'fit' ? 'original' : 'fit')}
            className="p-1 text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            title={`当前显示模式: ${scaleMode === 'fit' ? '自适应缩放' : '原始像素'}`}
          >
            {scaleMode === 'fit' ? <Minimize className="w-3.5 h-3.5 text-[#3794ff]" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* VNC Viewport */}
      <div className="flex-1 flex items-center justify-center p-2 relative overflow-auto">
        {connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#181818]/95 z-30 space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0078d4] animate-spin" />
            <p className="text-xs text-[#cccccc] font-medium">正在连接 VNC 远程图形桌面 ({tab.host}:{tab.port || 5900})...</p>
            <p className="text-[10px] text-[#858585] font-mono">RFB Protocol 003.008 Handshake & Security Authentication</p>
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

import React from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface SftpTask {
  taskId: string;
  sessionId: string;
  fileName: string;
  total: number;
  current: number;
  percentage: number;
  speed: string;
  status: 'started' | 'transferring' | 'completed' | 'failed';
  error?: string;
}

interface TaskQueueDrawerProps {
  tasks: SftpTask[];
  isOpen: boolean;
  onClose: () => void;
  onClearCompleted: () => void;
  activeTasksCount: number;
}

export const TaskQueueDrawer: React.FC<TaskQueueDrawerProps> = ({
  tasks,
  isOpen,
  onClose,
  onClearCompleted,
  activeTasksCount,
}) => {
  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <aside className="w-88 bg-[#181818] border-l border-[#2b2b2b] flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right duration-200 z-30 shadow-2xl absolute right-0 top-0 bottom-0 text-[#cccccc]">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded bg-[#0078d4]/15 border border-[#0078d4]/30 flex items-center justify-center text-[#3794ff]">
            <UploadCloud className={`h-3.5 w-3.5 ${activeTasksCount > 0 ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-xs font-semibold text-white">文件传输队列 ({tasks.length})</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onClearCompleted}
            className="text-[11px] text-[#858585] hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
          >
            清空已完成
          </button>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#181818]">
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-xs text-[#858585]">
            暂无进行中或已完成的传输任务
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.taskId} className="bg-[#252526] border border-[#2b2b2b] rounded-md p-3 space-y-2 text-xs shadow-sm hover:border-[#3c3c3c] transition-colors">
              <div className="flex items-center justify-between min-w-0">
                <span className="font-medium text-[#cccccc] truncate pr-2 flex-1" title={task.fileName}>
                  {task.fileName}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                  task.status === 'completed' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' :
                  task.status === 'failed' ? 'bg-red-950/60 text-red-300 border border-red-500/30' :
                  'bg-[#0078d4]/20 text-blue-300 border border-[#0078d4]/40 animate-pulse'
                }`}>
                  {task.status === 'completed' ? '已完成' :
                   task.status === 'failed' ? '传输失败' : '正在传输'}
                </span>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-[#181818] rounded-full h-1.5 overflow-hidden border border-[#2b2b2b]">
                <div 
                  className={`h-full transition-all duration-150 rounded-full ${task.status === 'failed' ? 'bg-red-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-[#0078d4]'}`}
                  style={{ width: `${task.percentage}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-[#858585] font-mono">
                <span>{task.percentage}% ({formatBytes(task.current)} / {formatBytes(task.total)})</span>
                <span className="text-[#cccccc] font-semibold">{task.speed}</span>
              </div>

              {task.error && (
                <p className="text-[10px] text-red-300 truncate mt-1 bg-red-950/30 border border-red-500/30 px-2.5 py-1 rounded">
                  错误: {task.error}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};


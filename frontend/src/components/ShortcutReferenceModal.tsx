import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutReferenceModal({ isOpen, onClose }: ShortcutReferenceModalProps) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: '选项卡与导航 (Tabs & Navigation)',
      shortcuts: [
        { key: 'Ctrl+Tab / ⌘⇧] / ⌥⌘→', desc: '向右切换至下一个选项卡' },
        { key: 'Ctrl+Shift+Tab / ⌘⇧[ / ⌥⌘←', desc: '向左切换至上一个选项卡' },
        { key: 'Ctrl+1~9 / ⌘1~9 / Alt+1~9', desc: '直接切换到第 1~9 个选项卡' },
        { key: 'Ctrl+T / ⌘T', desc: '新建本地终端选项卡' },
        { key: 'Ctrl+W / ⌘W', desc: '关闭当前选项卡' },
        { key: 'Ctrl+K / ⌘K', desc: '唤起 OmniAI 快速指令生成弹窗' },
        { key: 'Ctrl+L / ⌘L', desc: '唤起/折叠 OmniAI 右侧智能运维对话侧边栏' }
      ]
    },
    {
      title: '终端操作与编辑 (Terminal & Screen)',
      shortcuts: [
        { key: 'Ctrl+C / ⌘C', desc: '有选区时复制文本 / 无选区时中断 (SIGINT)' },
        { key: 'Ctrl+V / ⌘V / ⇧Insert', desc: '快速粘贴系统剪贴板内容' },
        { key: 'Ctrl+Shift+A / ⌘A', desc: '全选终端屏幕文本' },
        { key: 'Ctrl+Shift+L / ⌘L', desc: '清屏并清空回滚缓冲区' },
        { key: 'Ctrl+F / ⌘F', desc: '唤出终端内置快速查找栏' },
        { key: 'Ctrl+Shift+F / ⌘⇧F', desc: '唤起 Live Buffer 实时日志过滤器' },
        { key: 'Ctrl+= / ⌘+', desc: '放大终端字号' },
        { key: 'Ctrl+- / ⌘-', desc: '缩小终端字号' },
        { key: 'Ctrl+0 / ⌘0', desc: '重置为全局默认字号' },
        { key: 'Shift+PgUp / Shift+PgDn', desc: '终端回滚缓冲区快速翻页' }
      ]
    },
    {
      title: '工作区与运维工具 (Workspace & Ops Panels)',
      shortcuts: [
        { key: 'Ctrl+P / ⌘P', desc: '唤起万能命令调色板 (Command Palette)' },
        { key: 'Ctrl+Shift+H / ⌘⇧H', desc: '跨会话命令历史检索与一键执行' },
        { key: 'Ctrl+N / ⌘N', desc: '新建远程会话配置' },
        { key: 'Ctrl+I / ⌘I', desc: '从 OpenSSH ~/.ssh/config 导入会话' },
        { key: 'Ctrl+B / ⌘B', desc: '展开/收起左侧会话管理器' },
        { key: 'Ctrl+, / ⌘, / Alt+O', desc: '打开全局偏好设置中心' },
        { key: 'Ctrl+Shift+P / ⌘⇧P', desc: '展开/收起多行指令撰写窗格 (Compose)' },
        { key: 'Ctrl+Shift+S / ⌘⇧S', desc: '展开/收起 SFTP 文件管理器' },
        { key: 'Ctrl+Alt+F / ⌥⌘F', desc: '跨全部终端全局缓冲区搜索' },
        { key: 'Alt+B / ⌥⌘B', desc: '开启/关闭多终端输入同步广播' },
        { key: 'Ctrl+Shift+D / ⌘⇧D', desc: '左右垂直分屏' },
        { key: 'Ctrl+Shift+E / ⌘⇧E', desc: '上下水平分屏' },
        { key: 'Ctrl+Shift+U / ⌘⇧U', desc: 'SSH 隧道与端口转发监控' },
        { key: 'Ctrl+Shift+M / ⌘⇧M', desc: '主机性能与实时负载监控' },
        { key: 'Ctrl+Shift+O / ⌘⇧O', desc: '远程进程与服务管理工作台' },
        { key: 'Ctrl+Shift+L / ⌘⇧L', desc: '远程服务器日志实时追踪器' },
        { key: 'F11 / ⌃⌘F', desc: '切换全屏工作区模式' },
        { key: 'Ctrl+/ / ⌘/ / F1', desc: '打开快捷键指南' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[520px] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">键盘快捷键指南</h2>
              <span className="text-[11px] text-[#858585] font-normal">Keyboard Shortcuts & Hotkeys</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-[#cccccc] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 bg-[#1e1e1e] custom-scrollbar">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className="bg-[#252526] border border-[#2b2b2b] rounded p-3.5 space-y-2">
              <h3 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4]" />
                {group.title}
              </h3>
              <div className="space-y-1 pt-0.5">
                {group.shortcuts.map((shortcut, sIdx) => (
                  <div key={sIdx} className="flex justify-between items-center py-1 px-2 rounded hover:bg-[#2a2d2e] transition-colors">
                    <span className="text-xs text-[#cccccc] font-medium">{shortcut.desc}</span>
                    <kbd className="text-[11px] font-mono bg-[#181818] border border-[#3c3c3c] px-2 py-0.5 text-[#0078d4] rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b]">
          <button 
            onClick={onClose} 
            className="px-3 py-1 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}


import { useMemo, useCallback } from 'react';

export interface KeybindingDef {
  id: string;
  label: string;
  category: 'session' | 'tabs' | 'panels' | 'terminal' | 'tools';
  categoryLabel: string;
  defaultKey: string;
  description: string;
}

export const DEFAULT_KEYBINDINGS: KeybindingDef[] = [
  {
    id: 'new_session',
    label: '新建会话',
    category: 'session',
    categoryLabel: '会话管理',
    defaultKey: 'CmdOrCtrl+N',
    description: '打开新建 SSH/多协议会话属性弹窗',
  },
  {
    id: 'local_shell',
    label: '新建本地 Shell',
    category: 'session',
    categoryLabel: '会话管理',
    defaultKey: 'CmdOrCtrl+T',
    description: '直接打开本地终端 Shell 标签页',
  },
  {
    id: 'close_tab',
    label: '关闭当前标签',
    category: 'tabs',
    categoryLabel: '标签导航',
    defaultKey: 'CmdOrCtrl+W',
    description: '关闭当前激活的终端或工具标签页',
  },
  {
    id: 'next_tab',
    label: '切换至下一标签',
    category: 'tabs',
    categoryLabel: '标签导航',
    defaultKey: 'Ctrl+Tab',
    description: '向右轮转切换打开的标签页',
  },
  {
    id: 'prev_tab',
    label: '切换至上一标签',
    category: 'tabs',
    categoryLabel: '标签导航',
    defaultKey: 'Ctrl+Shift+Tab',
    description: '向左轮转切换打开的标签页',
  },
  {
    id: 'toggle_sidebar',
    label: '切换会话侧栏',
    category: 'panels',
    categoryLabel: '工作区面板',
    defaultKey: 'CmdOrCtrl+B',
    description: '展开或折叠左侧会话树侧边栏',
  },
  {
    id: 'toggle_command_blocks',
    label: '切换 Warp 命令块模式',
    category: 'terminal',
    categoryLabel: '终端交互',
    defaultKey: 'CmdOrCtrl+Shift+B',
    description: '在传统流式终端与 Warp 结构化命令块模式之间切换',
  },
  {
    id: 'toggle_sftp',
    label: 'SFTP 传输面板',
    category: 'panels',
    categoryLabel: '工作区面板',
    defaultKey: 'CmdOrCtrl+Shift+S',
    description: '打开或折叠右侧并排 SFTP 文件管理器',
  },
  {
    id: 'compose_pane',
    label: '多行撰写窗格',
    category: 'panels',
    categoryLabel: '工作区面板',
    defaultKey: 'CmdOrCtrl+Shift+P',
    description: '展开或收起底部多行指令撰写窗口',
  },
  {
    id: 'container_explorer',
    label: '容器资源浏览器',
    category: 'panels',
    categoryLabel: '工作区面板',
    defaultKey: 'CmdOrCtrl+Shift+C',
    description: '打开 Docker 与 Kubernetes 容器浏览器抽屉',
  },
  {
    id: 'global_search',
    label: '跨会话全局搜索',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+Alt+F',
    description: '在所有会话的终端缓冲区中全局搜索文本',
  },
  {
    id: 'broadcast',
    label: '多终端输入广播',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'Alt+B',
    description: '开启或关闭向所有打开的标签页同步投递输入',
  },
  {
    id: 'split_vertical',
    label: '垂直分屏',
    category: 'terminal',
    categoryLabel: '终端交互',
    defaultKey: 'CmdOrCtrl+Shift+D',
    description: '左右垂直拆分当前终端工作区',
  },
  {
    id: 'split_horizontal',
    label: '水平分屏',
    category: 'terminal',
    categoryLabel: '终端交互',
    defaultKey: 'CmdOrCtrl+Shift+E',
    description: '上下水平拆分当前终端工作区',
  },
  {
    id: 'command_palette',
    label: '全局命令调色板',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+P',
    description: '快速检索并执行所有系统命令与操作',
  },
  {
    id: 'command_history',
    label: '跨会话命令历史',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+Shift+H',
    description: '检索历史执行过的 Shell 命令并一键复用',
  },
  {
    id: 'tunnel_monitor',
    label: '端口转发链路监控',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+Shift+U',
    description: '查看所有活动 SSH 隧道的实时流量与状态',
  },
  {
    id: 'host_monitor',
    label: '主机系统实时监控',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+Shift+M',
    description: '查看当前远端主机的 CPU、内存与磁盘利用率',
  },
  {
    id: 'remote_ops',
    label: '远程批量运维工作台',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+Shift+O',
    description: '批量向多个服务器执行脚本与命令任务',
  },
  {
    id: 'realtime_log',
    label: '终端实时审计日志',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+Shift+L',
    description: '查看会话审计日志流与十六进制监控',
  },
  {
    id: 'shortcut_reference',
    label: '快捷键速查指南',
    category: 'tools',
    categoryLabel: '高阶工具',
    defaultKey: 'CmdOrCtrl+/',
    description: '弹出系统快捷键备忘速查面板',
  },
];

// 将按键事件标准化为统一的按键字符串
export function normalizeKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (e.ctrlKey || (isMac && e.metaKey)) {
    parts.push(isMac && e.metaKey ? 'Cmd' : 'Ctrl');
  }
  if (e.altKey) {
    parts.push('Alt');
  }
  if (e.shiftKey) {
    parts.push('Shift');
  }

  let key = e.key;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return '';
  }

  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join('+');
}

// 显示友好的跨平台快捷键提示
export function formatKeyDisplay(keyStr: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return keyStr.replace(/CmdOrCtrl/g, isMac ? '⌘' : 'Ctrl');
}

export function useKeybindingManager(customBindings: Record<string, string> = {}) {
  // 获取每个 Action 的有效快捷键
  const keybindingsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const def of DEFAULT_KEYBINDINGS) {
      map.set(def.id, customBindings[def.id] || def.defaultKey);
    }
    return map;
  }, [customBindings]);

  // 检测键位冲突
  const conflicts = useMemo(() => {
    const keyToActions = new Map<string, KeybindingDef[]>();
    for (const def of DEFAULT_KEYBINDINGS) {
      const activeKey = customBindings[def.id] || def.defaultKey;
      const normalized = activeKey.toLowerCase();
      const existing = keyToActions.get(normalized) || [];
      existing.push(def);
      keyToActions.set(normalized, existing);
    }

    const conflictList: Array<{ key: string; actions: KeybindingDef[] }> = [];
    keyToActions.forEach((actions, key) => {
      if (actions.length > 1) {
        conflictList.push({ key, actions });
      }
    });
    return conflictList;
  }, [customBindings]);

  // 匹配键盘事件与 Action ID
  const matchesAction = useCallback(
    (e: KeyboardEvent, actionId: string): boolean => {
      const boundKey = keybindingsMap.get(actionId);
      if (!boundKey) return false;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const normalizedTarget = boundKey.replace(/CmdOrCtrl/g, isMac ? 'Cmd' : 'Ctrl').toLowerCase();
      const eventKey = normalizeKeyEvent(e).toLowerCase();

      return normalizedTarget === eventKey;
    },
    [keybindingsMap]
  );

  return {
    allKeybindings: DEFAULT_KEYBINDINGS,
    keybindingsMap,
    conflicts,
    matchesAction,
    formatKeyDisplay,
  };
}

export interface HighlightRuleConfig {
  id: string;
  name: string;
  pattern: string;
  color: string;             // 前景色 hex #RRGGBB
  bgColor?: string;          // 可选背景色 hex #RRGGBB
  category: 'severity' | 'network' | 'timestamp' | 'path' | 'http' | 'custom';
  enabled: boolean;
  ignoreCase?: boolean;
  showInRuler?: boolean;     // 是否在右侧 Overview Ruler 显示标尺指示点
  rulerColor?: string;
}

export function normalizeHexColor(color?: string): string | undefined {
  if (!color || typeof color !== 'string') return undefined;
  let c = color.trim();
  if (c.startsWith('#')) {
    if (c.length === 7) return c; // #RRGGBB
    if (c.length === 4) {
      // #RGB -> #RRGGBB
      return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
    }
  }
  // Named color fallbacks
  const colorMap: Record<string, string> = {
    red: '#f14c4c',
    green: '#89d185',
    yellow: '#e5c07b',
    blue: '#4ec9b0',
    purple: '#c678dd',
    cyan: '#56b6c2',
    white: '#ffffff',
    black: '#000000',
    gray: '#858585',
  };
  return colorMap[c.toLowerCase()] || undefined;
}

export const DEFAULT_HIGHLIGHT_RULES: HighlightRuleConfig[] = [
  {
    id: 'preset_fatal',
    name: 'FATAL / CRITICAL',
    pattern: '\\b(?:FATAL|CRITICAL|PANIC|EMERGENCY)\\b',
    color: '#ffffff',
    bgColor: '#b91c1c',
    category: 'severity',
    enabled: true,
    ignoreCase: true,
    showInRuler: true,
    rulerColor: '#ff4d4f',
  },
  {
    id: 'preset_error',
    name: 'ERROR / FAIL',
    pattern: '\\b(?:ERROR|FAIL(?:ED)?|EXCEPTION|ERR)\\b',
    color: '#f14c4c',
    category: 'severity',
    enabled: true,
    ignoreCase: true,
    showInRuler: true,
    rulerColor: '#f14c4c',
  },
  {
    id: 'preset_warning',
    name: 'WARN / WARNING',
    pattern: '\\b(?:WARN(?:ING)?|DEPRECATED)\\b',
    color: '#e5c07b',
    category: 'severity',
    enabled: true,
    ignoreCase: true,
    showInRuler: true,
    rulerColor: '#e5c07b',
  },
  {
    id: 'preset_success',
    name: 'SUCCESS / OK',
    pattern: '\\b(?:SUCCESS(?:FUL)?|PASSED|OK|ACTIVE)\\b',
    color: '#89d185',
    category: 'severity',
    enabled: true,
    ignoreCase: true,
    showInRuler: false,
  },
  {
    id: 'preset_ipv4',
    name: 'IPv4 Address',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)(?::\\d{1,5})?\\b',
    color: '#4ec9b0',
    category: 'network',
    enabled: true,
    ignoreCase: false,
    showInRuler: false,
  },
  {
    id: 'preset_timestamp',
    name: 'Timestamp / Date',
    pattern: '\\b\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?\\b|\\b\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?\\b',
    color: '#73c991',
    category: 'timestamp',
    enabled: true,
    ignoreCase: false,
    showInRuler: false,
  },
  {
    id: 'preset_path',
    name: 'File Path',
    pattern: '(?:\\/[\\w.-]+){2,}\\/?|\\b[A-Za-z]:\\\\[\\w.-\\\\]+',
    color: '#dcdcaa',
    category: 'path',
    enabled: true,
    ignoreCase: false,
    showInRuler: false,
  },
  {
    id: 'preset_http_status',
    name: 'HTTP 4xx/5xx',
    pattern: '\\b(?:5\\d{2}|4\\d{2})\\b',
    color: '#f48771',
    category: 'http',
    enabled: true,
    ignoreCase: false,
    showInRuler: false,
  },
];

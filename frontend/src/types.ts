export interface HostStatusResult {
  sessionId: string;
  online: boolean;
  latencyMs: number;
  checkedAt: string;
  error?: string;
}

export interface HostResourceMetrics {
  sessionId: string;
  cpuUsage: number;
  memUsage: number;
  memTotalMB: number;
  memUsedMB: number;
  diskUsage: number;
  diskTotalGB: number;
  diskUsedGB: number;
  netRxRateKBps: number;
  netTxRateKBps: number;
  uptimeStr: string;
  sampledAt: string;
  error?: string;
}

export interface RemoteProcessItem {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  status: string;
  time: string;
  command: string;
}

export interface RemoteServiceItem {
  unit: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export interface RemotePortItem {
  protocol: string;
  localAddr: string;
  process: string;
  pid: number;
  state: string;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface CloudSyncConfig {
  provider: string; // 'webdav' | 'github_gist' | 'gitee_gist' | 's3'
  serverUrl: string;
  username?: string;
  password?: string;
  remotePath: string;
  gistToken?: string;
  gistId?: string;
  autoSyncOnStartup?: boolean;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  autoSyncIntervalMinutes?: number;
  lastSyncTime?: string;
}

export interface AIChatResponse {
  command?: string;
  explanation?: string;
  riskLevel?: string;
  suggestions?: string[];
  fullText?: string;
  Command?: string;
  Explanation?: string;
  RiskLevel?: string;
  FullText?: string;
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Runbook Types
export interface RunbookVariable {
  name: string;
  description: string;
  defaultValue: string;
  required: boolean;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

export interface RunbookStep {
  id: string;
  name: string;
  description: string;
  command: string;
  timeoutSeconds: number;
  continueOnError: boolean;
  targetSessionId?: string;
}

export interface RunbookTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  variables: RunbookVariable[];
  steps: RunbookStep[];
  createdAt: string;
  updatedAt: string;
}

export interface RunbookStepResult {
  stepId: string;
  stepName: string;
  command: string;
  status: 'success' | 'failed' | 'skipped';
  output: string;
  exitCode: number;
  durationMs: number;
}

export interface RunbookExecutionRecord {
  id: string;
  runbookId: string;
  runbookName: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'failed' | 'stopped';
  targetHost: string;
  variableValues: Record<string, string>;
  stepResults: RunbookStepResult[];
}

// Container File & Log Types
export interface ContainerFileInfo {
  name: string;
  path: string;
  size: number;
  mode: string;
  modTime: string;
  isDir: boolean;
  isSymlink: boolean;
  linkTarget?: string;
}

export interface ContainerLogItem {
  containerId: string;
  containerName: string;
  timestamp: string;
  line: string;
  source: 'stdout' | 'stderr';
}

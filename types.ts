
export enum TargetType {
  Web = 'web',
  API = 'api',
  Repo = 'repo',
}

export enum RiskTier {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum ScanMode {
  Safe = 'safe',
  Aggressive = 'aggressive',
}

export enum JobStatus {
  Queued = 'queued',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum FindingSeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info',
}

export enum FindingStatus {
  Open = 'open',
  Triaged = 'triaged',
  AcceptedRisk = 'accepted_risk',
  Fixed = 'fixed',
  FalsePositive = 'false_positive',
}

export interface TargetApp {
  id: string;
  name: string;
  type: TargetType;
  identifiers: string;
  riskTier: RiskTier;
  lastScanAt: string;
  tags: string[];
}

export interface ScanPolicy {
  id: string;
  name: string;
  mode: ScanMode;
  maxReqPerMin: number;
  spiderDepth: number;
  allowedTools: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  tool: string;
  targetId: string;
  owaspTop10Tags: string[];
  location: string;
  firstSeenAt: string;
}

export interface ScanJob {
  id: string;
  targetId: string;
  policyId: string;
  status: JobStatus;
  startedAt: string;
  finishedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}

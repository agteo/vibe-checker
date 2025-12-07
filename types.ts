
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
  Passive = 'passive',
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
  exclusions?: string[];
  description?: string;
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
  lastSeenAt?: string;
  lastUpdatedAt?: string;
  description?: string;
  recommendation?: string;
  priority?: FindingPriority;
  urgency?: FindingUrgency;
  actionPlan?: ActionStep[];
  businessImpact?: string;
  technicalImpact?: string;
  remediationEffort?: RemediationEffort;
  rule?: string;
  confidence?: string;
  risk?: string;
  template?: string;
  templateUrl?: string;
  cve?: string;
  tags?: string[];
  rawResult?: any;
}

export enum FindingPriority {
  P0 = 'p0', // Critical - Fix immediately
  P1 = 'p1', // High - Fix within 24 hours
  P2 = 'p2', // Medium - Fix within 1 week
  P3 = 'p3', // Low - Fix within 1 month
  P4 = 'p4', // Info - Monitor/Review
}

export enum FindingUrgency {
  Immediate = 'immediate', // Fix now
  High = 'high', // Fix today
  Medium = 'medium', // Fix this week
  Low = 'low', // Fix this month
  Monitor = 'monitor', // Monitor only
}

export enum RemediationEffort {
  Low = 'low', // < 1 hour
  Medium = 'medium', // 1-8 hours
  High = 'high', // 1-3 days
  VeryHigh = 'very_high', // > 3 days
}

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  priority: FindingPriority;
  estimatedTime: string;
  requiredSkills: string[];
  resources: string[];
  dependencies?: string[];
  completed: boolean;
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

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DEFAULT_ADMIN_SETTINGS, DEFAULT_POLICIES } from '../defaults.js';

export interface PersistedTarget {
  id: string;
  name: string;
  type: string;
  identifiers: string;
  riskTier: string;
  lastScanAt: string;
  tags: string[];
}

export interface PersistedFinding {
  id: string;
  title: string;
  severity: string;
  status: string;
  tool: string;
  location: string;
  targetId: string;
  firstSeenAt: string;
  lastSeenAt?: string;
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

export interface PersistedScan {
  id: string;
  jobId: string;
  status: string;
  targetId: string;
  policyId: string;
  tools: string[];
  startedAt: string;
  finishedAt?: string;
  estimatedDuration?: number;
  message?: string;
  findings?: PersistedFinding[];
  summary?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  errors?: string[];
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PersistedState {
  targets: PersistedTarget[];
  policies: any[];
  findings: PersistedFinding[];
  scans: PersistedScan[];
  auditLogs: AuditLogEntry[];
  settings: typeof DEFAULT_ADMIN_SETTINGS;
}

const DEFAULT_STATE: PersistedState = {
  targets: [],
  policies: [...DEFAULT_POLICIES],
  findings: [],
  scans: [],
  auditLogs: [],
  settings: { ...DEFAULT_ADMIN_SETTINGS },
};

export class DataStore {
  private filePath: string;
  private state: PersistedState | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(filePath = path.resolve(process.cwd(), 'data', 'store.json')) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    if (this.state) {
      return;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      this.state = this.normalizeState(parsed);
      await this.flush();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        throw error;
      }

      this.state = structuredClone(DEFAULT_STATE);
      await this.flush();
    }
  }

  async getState(): Promise<PersistedState> {
    await this.init();
    return structuredClone(this.state as PersistedState);
  }

  async update(mutator: (draft: PersistedState) => void): Promise<PersistedState> {
    await this.init();
    const draft = structuredClone(this.state as PersistedState);
    mutator(draft);
    this.state = this.normalizeState(draft);
    await this.flush();
    return structuredClone(this.state);
  }

  async appendAuditLog(
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    actorUserId = 'system'
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: randomUUID(),
      actorUserId,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      metadata,
    };

    await this.update((draft) => {
      draft.auditLogs.unshift(entry);
      draft.auditLogs = draft.auditLogs.slice(0, 500);
    });

    return entry;
  }

  private normalizeState(state: Partial<PersistedState>): PersistedState {
    return {
      targets: Array.isArray(state.targets) ? state.targets : [],
      policies: Array.isArray(state.policies) && state.policies.length > 0
        ? state.policies
        : [...DEFAULT_POLICIES],
      findings: Array.isArray(state.findings) ? state.findings : [],
      scans: Array.isArray(state.scans) ? state.scans : [],
      auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs : [],
      settings: {
        ...DEFAULT_ADMIN_SETTINGS,
        ...(state.settings || {}),
      },
    };
  }

  private async flush(): Promise<void> {
    const nextWrite = this.writeChain.then(async () => {
      const tempFile = `${this.filePath}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(this.state, null, 2), 'utf8');
      await fs.rename(tempFile, this.filePath);
    });

    this.writeChain = nextWrite.catch(() => {});
    await nextWrite;
  }
}

export const dataStore = new DataStore();

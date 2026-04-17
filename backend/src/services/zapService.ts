import { getJson } from './httpClient.js';

export class ZapService {
  private baseUrl: string;
  private apiKey: string;
  private fallbackUrls: string[];

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || '';
    this.fallbackUrls = ['http://localhost:8082', 'http://127.0.0.1:8082'];
  }

  private async requestJson<T>(path: string): Promise<T> {
    const candidates = Array.from(new Set([this.baseUrl, ...this.fallbackUrls]));
    let lastError: unknown;

    for (const baseUrl of candidates) {
      try {
        const response = await getJson<T>(`${baseUrl}${path}`);
        this.baseUrl = baseUrl;
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to reach ZAP');
  }

  async getVersion(): Promise<string> {
    const response = await this.requestJson<{ version?: string }>('/JSON/core/view/version/');
    return response.version || 'unknown';
  }

  async startSpider(targetUrl: string): Promise<string> {
    try {
      const response = await this.requestJson<{ scan: string }>(
        `/JSON/spider/action/scan/?url=${encodeURIComponent(targetUrl)}`
      );
      return response.scan;
    } catch (error) {
      throw new Error(`ZAP spider failed: ${error}`);
    }
  }

  async getSpiderStatus(scanId: string): Promise<{ status: string }> {
    try {
      return await this.requestJson(`/JSON/spider/view/status/?scanId=${scanId}`);
    } catch (error) {
      throw new Error(`Failed to get ZAP spider status: ${error}`);
    }
  }

  async getSpiderProgress(scanId: string): Promise<{ results?: string[] }> {
    try {
      return await this.requestJson(`/JSON/spider/view/results/?scanId=${scanId}`);
    } catch (error) {
      throw new Error(`Failed to get ZAP spider progress: ${error}`);
    }
  }

  async startActiveScan(targetUrl: string): Promise<string> {
    try {
      const response = await this.requestJson<{ scan: string }>(
        `/JSON/ascan/action/scan/?url=${encodeURIComponent(targetUrl)}`
      );
      return response.scan;
    } catch (error) {
      throw new Error(`ZAP active scan failed: ${error}`);
    }
  }

  async getActiveScanStatus(scanId: string): Promise<{ status: string }> {
    try {
      return await this.requestJson(`/JSON/ascan/view/status/?scanId=${scanId}`);
    } catch (error) {
      throw new Error(`Failed to get ZAP active scan status: ${error}`);
    }
  }

  async getActiveScanProgress(scanId: string): Promise<{ rulesCompleted?: number }> {
    try {
      return await this.requestJson(`/JSON/ascan/view/scanProgress/?scanId=${scanId}`);
    } catch (error) {
      throw new Error(`Failed to get ZAP active scan progress: ${error}`);
    }
  }

  async getScanProgress(scanId: string, scanType: 'spider' | 'active'): Promise<any> {
    try {
      let status: { status: string };
      let urlsDiscovered = 0;
      let rulesCompleted = 0;

      if (scanType === 'spider') {
        status = await this.getSpiderStatus(scanId);
        const progressData = await this.getSpiderProgress(scanId);
        urlsDiscovered = progressData.results?.length || 0;
      } else {
        status = await this.getActiveScanStatus(scanId);
        const progressData = await this.getActiveScanProgress(scanId);
        rulesCompleted = progressData.rulesCompleted || 0;
      }

      return {
        progress: parseInt(status.status, 10) || 0,
        urlsDiscovered,
        rulesCompleted,
        scanType,
        scanId,
      };
    } catch (error) {
      throw new Error(`Failed to get scan progress: ${error}`);
    }
  }

  async getAlerts(): Promise<any[]> {
    try {
      const response = await this.requestJson<{ alerts?: any[] }>('/JSON/core/view/alerts/');
      return response.alerts || [];
    } catch (error) {
      throw new Error(`Failed to get ZAP alerts: ${error}`);
    }
  }

  async getSpiderResults(): Promise<any[]> {
    try {
      const response = await this.requestJson<{ results?: any[] }>('/JSON/spider/view/results/');
      return response.results || [];
    } catch (error) {
      throw new Error(`Failed to get ZAP spider results: ${error}`);
    }
  }

  async accessUrl(targetUrl: string): Promise<void> {
    try {
      await this.requestJson(`/JSON/core/action/accessUrl/?url=${encodeURIComponent(targetUrl)}`);
    } catch (error) {
      throw new Error(`Failed to access URL in ZAP: ${error}`);
    }
  }

  async generateReport(format: 'JSON' | 'HTML' | 'XML' = 'JSON'): Promise<any> {
    try {
      return await this.requestJson(`/OTHER/core/other/report/?format=${format}`);
    } catch (error) {
      throw new Error(`Failed to generate ZAP report: ${error}`);
    }
  }

  async waitForScanCompletion(
    scanId: string,
    scanType: 'spider' | 'active',
    maxWaitTime: number = 300000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = scanType === 'spider'
          ? await this.getSpiderStatus(scanId)
          : await this.getActiveScanStatus(scanId);

        const progress = parseInt(status.status, 10);
        if (progress >= 100) {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Error checking ${scanType} scan status:`, error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    throw new Error(`${scanType} scan timed out after ${maxWaitTime / 1000} seconds`);
  }
}

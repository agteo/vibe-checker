import { getJson, postJson } from './httpClient.js';

export class SemgrepService {
  private baseUrl = 'https://semgrep.dev';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async scanRepository(repoUrl: string, ruleset: string = 'p/security-audit'): Promise<any> {
    try {
      return await postJson(
        `${this.baseUrl}/api/v1/scans`,
        {
          repo_url: repoUrl,
          ruleset,
          branch: 'main',
        },
        this.getHeaders()
      );
    } catch (error) {
      throw new Error(`Semgrep scan failed: ${error}`);
    }
  }

  async getScanResults(scanId: string): Promise<any[]> {
    try {
      const response = await getJson<{ results?: any[] }>(
        `${this.baseUrl}/api/v1/scans/${scanId}/results`,
        this.getHeaders()
      );
      return response.results || [];
    } catch (error) {
      throw new Error(`Failed to get Semgrep results: ${error}`);
    }
  }

  async getScanStatus(scanId: string): Promise<any> {
    try {
      return await getJson(`${this.baseUrl}/api/v1/scans/${scanId}`, this.getHeaders());
    } catch (error) {
      throw new Error(`Failed to get Semgrep scan status: ${error}`);
    }
  }
}

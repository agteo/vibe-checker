import axios from 'axios';

export class SemgrepService {
  private baseUrl = 'https://semgrep.dev';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scanRepository(repoUrl: string, ruleset: string = 'p/security-audit'): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/scans`,
        {
          repo_url: repoUrl,
          ruleset: ruleset,
          branch: 'main'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Semgrep scan failed: ${error}`);
    }
  }

  async getScanResults(scanId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/scans/${scanId}/results`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data.results || [];
    } catch (error) {
      throw new Error(`Failed to get Semgrep results: ${error}`);
    }
  }

  async getScanStatus(scanId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/scans/${scanId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Semgrep scan status: ${error}`);
    }
  }
}

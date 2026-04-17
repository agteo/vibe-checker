import { getJson } from './httpClient.js';

export class GitHubSecurityService {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders() {
    return this.token ? { Authorization: `token ${this.token}` } : undefined;
  }

  async getSecurityAdvisories(owner: string, repo: string): Promise<any[]> {
    try {
      return await getJson(`${this.baseUrl}/repos/${owner}/${repo}/security-advisories`, this.getHeaders());
    } catch (error) {
      throw new Error(`Failed to get GitHub security advisories: ${error}`);
    }
  }

  async getDependabotAlerts(owner: string, repo: string): Promise<any[]> {
    try {
      return await getJson(`${this.baseUrl}/repos/${owner}/${repo}/dependabot/alerts`, this.getHeaders());
    } catch (error) {
      throw new Error(`Failed to get Dependabot alerts: ${error}`);
    }
  }

  async getCodeScanningAlerts(owner: string, repo: string): Promise<any[]> {
    try {
      return await getJson(`${this.baseUrl}/repos/${owner}/${repo}/code-scanning/alerts`, this.getHeaders());
    } catch (error) {
      throw new Error(`Failed to get code scanning alerts: ${error}`);
    }
  }

  async getRepositoryVulnerabilities(owner: string, repo: string): Promise<any[]> {
    try {
      return await getJson(`${this.baseUrl}/repos/${owner}/${repo}/vulnerability-alerts`, this.getHeaders());
    } catch (error) {
      throw new Error(`Failed to get repository vulnerabilities: ${error}`);
    }
  }
}

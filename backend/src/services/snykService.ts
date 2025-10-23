import axios from 'axios';

export class GitHubSecurityService {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  async getSecurityAdvisories(owner: string, repo: string): Promise<any[]> {
    try {
      const headers = this.token ? { 'Authorization': `token ${this.token}` } : {};
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/security-advisories`,
        { headers }
      );
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to get GitHub security advisories: ${error}`);
    }
  }

  async getDependabotAlerts(owner: string, repo: string): Promise<any[]> {
    try {
      const headers = this.token ? { 'Authorization': `token ${this.token}` } : {};
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/dependabot/alerts`,
        { headers }
      );
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to get Dependabot alerts: ${error}`);
    }
  }

  async getCodeScanningAlerts(owner: string, repo: string): Promise<any[]> {
    try {
      const headers = this.token ? { 'Authorization': `token ${this.token}` } : {};
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/code-scanning/alerts`,
        { headers }
      );
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to get code scanning alerts: ${error}`);
    }
  }

  async getRepositoryVulnerabilities(owner: string, repo: string): Promise<any[]> {
    try {
      const headers = this.token ? { 'Authorization': `token ${this.token}` } : {};
      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/vulnerability-alerts`,
        { headers }
      );
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to get repository vulnerabilities: ${error}`);
    }
  }
}

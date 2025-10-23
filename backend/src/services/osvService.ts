import axios from 'axios';

export class OSVService {
  private baseUrl = 'https://api.osv.dev';

  async queryVulnerabilities(packageInfo: {
    name: string;
    version: string;
    ecosystem: string;
  }): Promise<any[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/query`, {
        package: packageInfo,
        version: packageInfo.version
      });
      return response.data.vulns || [];
    } catch (error) {
      throw new Error(`OSV query failed: ${error}`);
    }
  }

  async getVulnerabilityById(id: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/vulns/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get vulnerability details: ${error}`);
    }
  }

  async batchQuery(packages: Array<{
    name: string;
    version: string;
    ecosystem: string;
  }>): Promise<any[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/querybatch`, {
        queries: packages.map(pkg => ({
          package: pkg,
          version: pkg.version
        }))
      });
      return response.data.results || [];
    } catch (error) {
      throw new Error(`OSV batch query failed: ${error}`);
    }
  }
}

import { getJson, postJson } from './httpClient.js';

export class TrivyService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://trivy:8080') {
    this.baseUrl = baseUrl;
  }

  async scanImage(imageName: string): Promise<any> {
    try {
      return await postJson(`${this.baseUrl}/scan/image`, { image: imageName });
    } catch (error) {
      throw new Error(`Trivy image scan failed: ${error}`);
    }
  }

  async scanRepository(repoUrl: string): Promise<any> {
    try {
      return await postJson(`${this.baseUrl}/scan/repo`, { repo: repoUrl });
    } catch (error) {
      throw new Error(`Trivy repository scan failed: ${error}`);
    }
  }

  async scanFileSystem(targetPath: string): Promise<any> {
    try {
      return await postJson(`${this.baseUrl}/scan/filesystem`, { path: targetPath });
    } catch (error) {
      throw new Error(`Trivy filesystem scan failed: ${error}`);
    }
  }

  async getScanResults(scanId: string): Promise<any> {
    try {
      return await getJson(`${this.baseUrl}/scan/${scanId}/results`);
    } catch (error) {
      throw new Error(`Failed to get Trivy scan results: ${error}`);
    }
  }
}

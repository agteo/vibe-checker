import { getJson, postJson } from './httpClient.js';

export class TrivyService {
  private baseUrl: string;
  private fallbackUrls: string[];

  constructor(baseUrl: string = 'http://trivy:8080') {
    this.baseUrl = baseUrl;
    this.fallbackUrls = ['http://localhost:8081', 'http://127.0.0.1:8081'];
  }

  private async getWithFallback<T>(path: string): Promise<T> {
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

    throw lastError instanceof Error ? lastError : new Error('Unable to reach Trivy');
  }

  private async postWithFallback<T>(path: string, body: unknown): Promise<T> {
    const candidates = Array.from(new Set([this.baseUrl, ...this.fallbackUrls]));
    let lastError: unknown;

    for (const baseUrl of candidates) {
      try {
        const response = await postJson<T>(`${baseUrl}${path}`, body);
        this.baseUrl = baseUrl;
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to reach Trivy');
  }

  async getVersion(): Promise<string> {
    const response = await this.getWithFallback<{ version?: string }>('/version');
    return response.version || 'unknown';
  }

  async scanImage(imageName: string): Promise<any> {
    try {
      return await this.postWithFallback('/scan/image', { image: imageName });
    } catch (error) {
      throw new Error(`Trivy image scan failed: ${error}`);
    }
  }

  async scanRepository(repoUrl: string): Promise<any> {
    try {
      return await this.postWithFallback('/scan/repo', { repo: repoUrl });
    } catch (error) {
      throw new Error(`Trivy repository scan failed: ${error}`);
    }
  }

  async scanFileSystem(targetPath: string): Promise<any> {
    try {
      return await this.postWithFallback('/scan/filesystem', { path: targetPath });
    } catch (error) {
      throw new Error(`Trivy filesystem scan failed: ${error}`);
    }
  }

  async getScanResults(scanId: string): Promise<any> {
    try {
      return await this.getWithFallback(`/scan/${scanId}/results`);
    } catch (error) {
      throw new Error(`Failed to get Trivy scan results: ${error}`);
    }
  }
}

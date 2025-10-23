import axios from 'axios';

export class TrivyService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://trivy:8080') {
    this.baseUrl = baseUrl;
  }

  async scanImage(imageName: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/scan/image`, {
        image: imageName
      });
      return response.data;
    } catch (error) {
      throw new Error(`Trivy image scan failed: ${error}`);
    }
  }

  async scanRepository(repoUrl: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/scan/repo`, {
        repo: repoUrl
      });
      return response.data;
    } catch (error) {
      throw new Error(`Trivy repository scan failed: ${error}`);
    }
  }

  async scanFileSystem(path: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/scan/filesystem`, {
        path: path
      });
      return response.data;
    } catch (error) {
      throw new Error(`Trivy filesystem scan failed: ${error}`);
    }
  }

  async getScanResults(scanId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/scan/${scanId}/results`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Trivy scan results: ${error}`);
    }
  }
}

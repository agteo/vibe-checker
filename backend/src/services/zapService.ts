import axios from 'axios';

export class ZapService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || '';
  }

  async startSpider(targetUrl: string): Promise<string> {
    try {
      console.log(`Starting ZAP spider for: ${targetUrl}`);
      const response = await axios.get(`${this.baseUrl}/JSON/spider/action/scan/?url=${targetUrl}`);
      return response.data.scan;
    } catch (error) {
      throw new Error(`ZAP spider failed: ${error}`);
    }
  }

  async getSpiderStatus(scanId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/JSON/spider/view/status/?scanId=${scanId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ZAP spider status: ${error}`);
    }
  }

  async getSpiderProgress(scanId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/JSON/spider/view/results/?scanId=${scanId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ZAP spider progress: ${error}`);
    }
  }

  async startActiveScan(targetUrl: string): Promise<string> {
    try {
      console.log(`Starting ZAP active scan for: ${targetUrl}`);
      const response = await axios.get(`${this.baseUrl}/JSON/ascan/action/scan/?url=${targetUrl}`);
      return response.data.scan;
    } catch (error) {
      throw new Error(`ZAP active scan failed: ${error}`);
    }
  }

  async getActiveScanStatus(scanId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/JSON/ascan/view/status/?scanId=${scanId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ZAP active scan status: ${error}`);
    }
  }

  async getActiveScanProgress(scanId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/JSON/ascan/view/scanProgress/?scanId=${scanId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ZAP active scan progress: ${error}`);
    }
  }

  async getScanProgress(scanId: string, scanType: 'spider' | 'active'): Promise<any> {
    try {
      let status, progress, urlsDiscovered = 0, rulesCompleted = 0;
      
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
        progress: parseInt(status.status) || 0,
        urlsDiscovered,
        rulesCompleted,
        scanType,
        scanId
      };
    } catch (error) {
      throw new Error(`Failed to get scan progress: ${error}`);
    }
  }


  async getAlerts(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/JSON/core/view/alerts/`);
      return response.data.alerts || [];
    } catch (error) {
      throw new Error(`Failed to get ZAP alerts: ${error}`);
    }
  }

  async getSpiderResults(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/JSON/spider/view/results/`);
      return response.data.results || [];
    } catch (error) {
      throw new Error(`Failed to get ZAP spider results: ${error}`);
    }
  }

  async generateReport(format: 'JSON' | 'HTML' | 'XML' = 'JSON'): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/OTHER/core/other/report/?format=${format}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate ZAP report: ${error}`);
    }
  }

  async waitForScanCompletion(scanId: string, scanType: 'spider' | 'active', maxWaitTime: number = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        let status;
        if (scanType === 'spider') {
          status = await this.getSpiderStatus(scanId);
        } else if (scanType === 'active') {
          status = await this.getActiveScanStatus(scanId);
        }

        const progress = parseInt(status.status);
        console.log(`${scanType} scan progress: ${progress}%`);

        if (progress >= 100) {
          console.log(`${scanType} scan completed`);
          return;
        }

        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Error checking ${scanType} scan status:`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error(`${scanType} scan timed out after ${maxWaitTime / 1000} seconds`);
  }
}

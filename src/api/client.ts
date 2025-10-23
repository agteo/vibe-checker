export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ScanRequest {
  targetId: string;
  policyId: string;
  consentAccepted: boolean;
  ownershipAttested: boolean;
  scopeSnapshot: any;
}

export interface ScanJobResponse {
  jobId: string;
  status: string;
  estimatedDuration?: number;
  tools: string[];
}

export interface FindingFilters {
  severity?: string;
  status?: string;
  tool?: string;
  targetId?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Scan Management
  async startScan(request: ScanRequest): Promise<ApiResponse<ScanJobResponse>> {
    console.log('ApiClient: Starting scan request:', request);
    console.log('ApiClient: Base URL:', this.baseUrl);
    
    const response = await this.request<ScanJobResponse>('/api/scans', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    console.log('ApiClient: Scan response:', response);
    return response;
  }

  async getScanStatus(jobId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/scans/${jobId}`);
  }

  async getScanProgress(jobId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/scans/${jobId}/progress`);
  }

  async cancelScan(jobId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/scans/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  // Data Management
  async getTargets(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/targets');
  }

  async createTarget(target: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/targets', {
      method: 'POST',
      body: JSON.stringify(target),
    });
  }

  async deleteTarget(targetId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/targets/${targetId}`, {
      method: 'DELETE',
    });
  }

  async getFindings(filters?: FindingFilters): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    return this.request<any[]>(`/api/findings?${params}`);
  }

  async updateFindingStatus(
    findingId: string, 
    status: string, 
    justification?: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/findings/${findingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, justification }),
    });
  }

  async getPolicies(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/policies');
  }

  async createPolicy(policy: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  async updatePolicy(policyId: string, policy: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    });
  }

  async deletePolicy(policyId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/policies/${policyId}`, {
      method: 'DELETE',
    });
  }

  // Test connections
  async testZapConnection(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/scans/test/zap');
  }

  async testOsvConnection(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/scans/test/osv');
  }
}

export const apiClient = new ApiClient(process.env.REACT_APP_API_URL || 'http://localhost:3001');

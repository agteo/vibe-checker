import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse } from '../api/client';
import { useScanStore } from '../stores/scanStore';

export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiCall();
    
    if (response.success) {
      setData(response.data);
    } else {
      setError(response.error || 'Unknown error');
    }
    
    setLoading(false);
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

export function useScans() {
  const { activeScans, addScan, updateScan, removeScan } = useScanStore();

  const startScan = useCallback(async (request: any) => {
    console.log('useScans: Starting scan with request:', request);
    
    try {
      const response = await apiClient.startScan(request);
      console.log('useScans: API response:', response);
      
      if (response.success && response.data) {
        addScan(response.data);
        return response.data;
      }
      
      const errorMessage = response.error || 'Failed to start scan';
      console.error('useScans: Scan failed:', errorMessage);
      throw new Error(errorMessage);
    } catch (error) {
      console.error('useScans: Exception during scan start:', error);
      throw error;
    }
  }, [addScan]);

  const cancelScan = useCallback(async (jobId: string) => {
    const response = await apiClient.cancelScan(jobId);
    
    if (response.success) {
      removeScan(jobId);
    }
    
    return response.success;
  }, [removeScan]);

  const refreshScanStatus = useCallback(async (jobId: string) => {
    console.log('Refreshing scan status for:', jobId);
    const response = await apiClient.getScanStatus(jobId);
    
    if (response.success && response.data) {
      console.log('Scan status response:', response.data);
      // Update the scan with the complete data from backend
      updateScan(jobId, {
        status: response.data.status,
        finishedAt: response.data.finishedAt,
        findings: response.data.findings,
        summary: response.data.summary
      });
    } else {
      console.error('Failed to refresh scan status:', response.error);
    }
    
    return response.data;
  }, [updateScan]);

  const getScanProgress = useCallback(async (jobId: string) => {
    console.log('Getting detailed scan progress for:', jobId);
    const response = await apiClient.getScanProgress(jobId);
    
    if (response.success && response.data) {
      console.log('Scan progress response:', response.data);
      return response.data;
    } else {
      console.error('Failed to get scan progress:', response.error);
      return null;
    }
  }, []);

  return {
    activeScans,
    startScan,
    cancelScan,
    refreshScanStatus,
    getScanProgress,
  };
}

export function useTargets() {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getTargets();
    
    if (response.success) {
      setTargets(response.data);
    } else {
      setError(response.error || 'Failed to fetch targets');
    }
    
    setLoading(false);
  }, []);

  const createTarget = useCallback(async (target: any) => {
    const response = await apiClient.createTarget(target);
    
    if (response.success) {
      setTargets(prev => [...prev, response.data]);
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to create target');
  }, []);

  const deleteTarget = useCallback(async (targetId: string) => {
    const response = await apiClient.deleteTarget(targetId);
    
    if (response.success) {
      setTargets(prev => prev.filter(target => target.id !== targetId));
      return true;
    }
    
    throw new Error(response.error || 'Failed to delete target');
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return {
    targets,
    loading,
    error,
    createTarget,
    deleteTarget,
    refetch: fetchTargets,
  };
}

export function useFindings(filters?: any) {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getFindings(filters);
    
    if (response.success) {
      setFindings(response.data);
    } else {
      setError(response.error || 'Failed to fetch findings');
    }
    
    setLoading(false);
  }, [filters]);

  const updateFindingStatus = useCallback(async (findingId: string, status: string, justification?: string) => {
    const response = await apiClient.updateFindingStatus(findingId, status, justification);
    
    if (response.success) {
      setFindings(prev => 
        prev.map(finding => 
          finding.id === findingId ? { ...finding, status } : finding
        )
      );
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update finding status');
  }, []);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  return {
    findings,
    loading,
    error,
    updateFindingStatus,
    refetch: fetchFindings,
  };
}

export function usePolicies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await apiClient.getPolicies();
    
    if (response.success) {
      setPolicies(response.data);
    } else {
      setError(response.error || 'Failed to fetch policies');
    }
    
    setLoading(false);
  }, []);

  const createPolicy = useCallback(async (policy: any) => {
    const response = await apiClient.createPolicy(policy);
    
    if (response.success) {
      setPolicies(prev => [...prev, response.data]);
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to create policy');
  }, []);

  const updatePolicy = useCallback(async (policyId: string, policy: any) => {
    const response = await apiClient.updatePolicy(policyId, policy);
    
    if (response.success) {
      setPolicies(prev => prev.map(p => p.id === policyId ? response.data : p));
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to update policy');
  }, []);

  const deletePolicy = useCallback(async (policyId: string) => {
    const response = await apiClient.deletePolicy(policyId);
    
    if (response.success) {
      setPolicies(prev => prev.filter(policy => policy.id !== policyId));
      return true;
    }
    
    throw new Error(response.error || 'Failed to delete policy');
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return {
    policies,
    loading,
    error,
    createPolicy,
    updatePolicy,
    deletePolicy,
    refetch: fetchPolicies,
  };
}

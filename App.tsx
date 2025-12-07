
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TargetsPage } from './pages/TargetsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { FindingsPage } from './pages/FindingsPage';
import { AdminPage } from './pages/AdminPage';
import { ReportsPage } from './pages/ReportsPage';
import { TargetApp, ScanPolicy, Finding, ScanJob, AuditLog, FindingSeverity } from './types';
import { useFindings, useTargets, usePolicies } from './src/hooks/useApi';
import { NotificationManager } from './components/Notification';

export type Page = 'Dashboard' | 'Targets' | 'Policies' | 'Findings' | 'Reports' | 'Admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [findingsFilter, setFindingsFilter] = useState<{ severity?: FindingSeverity; status?: string } | undefined>();
  
  // Use API hooks to fetch data
  const { findings, loading: findingsLoading, error: findingsError, refetch: refetchFindings } = useFindings();
  const { targets, loading: targetsLoading, error: targetsError } = useTargets();
  const { policies, loading: policiesLoading, error: policiesError } = usePolicies();

  const renderPage = () => {
    // Show loading state if any data is still loading
    if (findingsLoading || targetsLoading || policiesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading...</div>
        </div>
      );
    }

    // Show error state if there are errors
    if (findingsError || targetsError || policiesError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-lg">
            Error loading data: {findingsError || targetsError || policiesError}
          </div>
        </div>
      );
    }

    // Helper function to navigate to Findings page with filter
    const navigateToFindings = (filter?: { severity?: FindingSeverity; status?: string }) => {
      setFindingsFilter(filter);
      setCurrentPage('Findings');
    };

    switch (currentPage) {
      case 'Dashboard':
        return <DashboardPage 
          findings={findings || []} 
          scanJobs={scanJobs} 
          targets={targets || []} 
          onScanComplete={refetchFindings}
          onNavigateToFindings={navigateToFindings}
        />;
      case 'Targets':
        return <TargetsPage targets={targets || []} policies={policies || []} onScanComplete={refetchFindings} />;
      case 'Policies':
        return <PoliciesPage policies={policies || []} />;
      case 'Findings':
        return <FindingsPage findings={findings || []} initialFilter={findingsFilter} />;
      case 'Admin':
        return <AdminPage auditLogs={auditLogs} />;
      case 'Reports':
        return <ReportsPage findings={findings || []} targets={targets || []} scanJobs={scanJobs} />;
      default:
        return <DashboardPage 
          findings={findings || []} 
          scanJobs={scanJobs} 
          targets={targets || []} 
          onScanComplete={refetchFindings}
          onNavigateToFindings={navigateToFindings}
        />;
    }
  };

  // Function to refresh findings (can be called when scans complete)
  const refreshFindings = () => {
    refetchFindings();
    // Show notification when findings are refreshed
    if ((window as any).addNotification) {
      (window as any).addNotification('Scan completed! Findings have been updated.', 'success');
    }
  };

  return (
    <NotificationManager>
      <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="ml-64 p-8">
          {renderPage()}
        </main>
      </div>
    </NotificationManager>
  );
}

export default App;

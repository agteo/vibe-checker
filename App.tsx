
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { TargetsPage } from './pages/TargetsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { FindingsPage } from './pages/FindingsPage';
import { AdminPage } from './pages/AdminPage';
import { ReportsPage } from './pages/ReportsPage';
import { TargetApp, ScanPolicy, Finding, ScanJob, AuditLog, FindingSeverity } from './types';
import { useFindings, useTargets, usePolicies, useScanHistory, useAuditLogs, useScans } from './src/hooks/useApi';
import { NotificationManager } from './components/Notification';

export type Page = 'Dashboard' | 'Targets' | 'Policies' | 'Findings' | 'Reports' | 'Admin';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [findingsFilter, setFindingsFilter] = useState<{ severity?: FindingSeverity; status?: string } | undefined>();
  
  // Use API hooks to fetch data
  const { findings, loading: findingsLoading, error: findingsError, refetch: refetchFindings } = useFindings();
  const { targets, loading: targetsLoading, error: targetsError } = useTargets();
  const { policies, loading: policiesLoading, error: policiesError } = usePolicies();
  const { data: scanJobs = [], loading: scansLoading, error: scansError, refetch: refetchScans } = useScanHistory();
  const { data: auditLogs = [], loading: auditLogsLoading, error: auditLogsError, refetch: refetchAuditLogs } = useAuditLogs();
  const { setActiveScans } = useScans();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentPage]);

  useEffect(() => {
    const runningScans = (scanJobs || []).filter((scan) => scan.status === 'running' || scan.status === 'queued');
    setActiveScans(runningScans);
  }, [scanJobs, setActiveScans]);

  const renderPage = () => {
    // Show loading state if any data is still loading
    if (findingsLoading || targetsLoading || policiesLoading || scansLoading || auditLogsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="panel px-6 py-5 text-lg text-white">Loading security data...</div>
        </div>
      );
    }

    // Show error state if there are errors
    if (findingsError || targetsError || policiesError || scansError || auditLogsError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="panel px-6 py-5 text-lg text-red-300">
            Error loading data: {findingsError || targetsError || policiesError || scansError || auditLogsError}
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
    refetchScans();
    refetchAuditLogs();
    // Show notification when findings are refreshed
    if ((window as any).addNotification) {
      (window as any).addNotification('Scan completed! Findings have been updated.', 'success');
    }
  };

  return (
    <NotificationManager>
      <div className="app-shell">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="app-main">
          <div className="shell-topbar">
            <button
              type="button"
              className="menu-button"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="font-mono text-sm">MENU</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="shell-chip">Ops Console</span>
              <div className="shell-title">Vibe Check</div>
            </div>
          </div>
          <div className="page-surface">
            <div className="page-content">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
    </NotificationManager>
  );
}

export default App;

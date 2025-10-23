import React, { useState, useMemo } from 'react';
import { Finding, TargetApp, ScanJob } from '../types';

interface ReportsPageProps {
  findings: Finding[];
  targets: TargetApp[];
  scanJobs: ScanJob[];
}

interface ReportFilters {
  timeRange: {
    start: string;
    end: string;
  };
  targetIds: string[];
  severityFilter: string[];
  toolFilter: string[];
}

interface ReportData {
  executiveSummary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    avgTimeToFix: number;
    targetsScanned: number;
    lastScanDate: string;
  };
  trends: {
    findingsOverTime: Array<{
      date: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
  };
  complianceMapping: {
    owaspTop10: Record<string, number>;
    nistMapping: Record<string, number>;
    isoMapping: Record<string, number>;
  };
  technicalBreakdown: {
    byTool: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ findings, targets, scanJobs }) => {
  const [filters, setFilters] = useState<ReportFilters>({
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      end: new Date().toISOString().split('T')[0] // today
    },
    targetIds: [],
    severityFilter: ['critical', 'high', 'medium', 'low'],
    toolFilter: []
  });

  const [selectedExportFormat, setSelectedExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Filter findings based on current filters
  const filteredFindings = useMemo(() => {
    return findings.filter(finding => {
      const findingDate = new Date(finding.firstSeenAt);
      const startDate = new Date(filters.timeRange.start);
      const endDate = new Date(filters.timeRange.end);
      
      return (
        findingDate >= startDate &&
        findingDate <= endDate &&
        (filters.targetIds.length === 0 || filters.targetIds.includes(finding.targetId)) &&
        filters.severityFilter.includes(finding.severity) &&
        (filters.toolFilter.length === 0 || filters.toolFilter.includes(finding.tool))
      );
    });
  }, [findings, filters]);

  // Generate report data
  const reportData: ReportData = useMemo(() => {
    const severityCounts = filteredFindings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const toolCounts = filteredFindings.reduce((acc, finding) => {
      acc[finding.tool] = (acc[finding.tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusCounts = filteredFindings.reduce((acc, finding) => {
      acc[finding.status] = (acc[finding.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // OWASP Top 10 mapping
    const owaspMapping = filteredFindings.reduce((acc, finding) => {
      finding.owaspTop10Tags?.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Calculate average time to fix (simplified)
    const fixedFindings = filteredFindings.filter(f => f.status === 'fixed');
    const avgTimeToFix = fixedFindings.length > 0 
      ? fixedFindings.reduce((sum, f) => {
          const timeDiff = new Date(f.lastSeenAt).getTime() - new Date(f.firstSeenAt).getTime();
          return sum + timeDiff;
        }, 0) / fixedFindings.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Get unique targets scanned
    const uniqueTargets = new Set(filteredFindings.map(f => f.targetId)).size;

    // Get last scan date
    const lastScanDate = scanJobs.length > 0 
      ? new Date(Math.max(...scanJobs.map(job => new Date(job.startedAt).getTime()))).toISOString().split('T')[0]
      : 'No scans';

    // Generate trends data (last 30 days)
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayFindings = filteredFindings.filter(f => 
        f.firstSeenAt.startsWith(dateStr)
      );
      
      trends.push({
        date: dateStr,
        critical: dayFindings.filter(f => f.severity === 'critical').length,
        high: dayFindings.filter(f => f.severity === 'high').length,
        medium: dayFindings.filter(f => f.severity === 'medium').length,
        low: dayFindings.filter(f => f.severity === 'low').length
      });
    }

    return {
      executiveSummary: {
        totalFindings: filteredFindings.length,
        criticalFindings: severityCounts.critical || 0,
        highFindings: severityCounts.high || 0,
        mediumFindings: severityCounts.medium || 0,
        lowFindings: severityCounts.low || 0,
        avgTimeToFix: Math.round(avgTimeToFix * 10) / 10,
        targetsScanned: uniqueTargets,
        lastScanDate
      },
      trends: {
        findingsOverTime: trends
      },
      complianceMapping: {
        owaspTop10: owaspMapping,
        nistMapping: {}, // Placeholder - would need actual NIST mapping logic
        isoMapping: {} // Placeholder - would need actual ISO mapping logic
      },
      technicalBreakdown: {
        byTool: toolCounts,
        bySeverity: severityCounts,
        byStatus: statusCounts
      }
    };
  }, [filteredFindings, scanJobs]);

  const handleExportReport = async () => {
    setIsGeneratingReport(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create downloadable content based on format
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (selectedExportFormat) {
        case 'json':
          content = JSON.stringify(reportData, null, 2);
          filename = `security-report-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = generateCSVContent();
          filename = `security-report-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'pdf':
          // For PDF, we'd typically use a library like jsPDF or send to backend
          content = generatePDFContent();
          filename = `security-report-${new Date().toISOString().split('T')[0]}.pdf`;
          mimeType = 'application/pdf';
          break;
        default:
          throw new Error('Invalid export format');
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generateCSVContent = (): string => {
    const headers = ['ID', 'Title', 'Severity', 'Tool', 'Target', 'Status', 'OWASP Tags', 'First Seen', 'Last Seen'];
    const rows = filteredFindings.map(finding => [
      finding.id,
      finding.title,
      finding.severity,
      finding.tool,
      finding.targetId,
      finding.status,
      finding.owaspTop10Tags?.join(';') || '',
      finding.firstSeenAt,
      finding.lastSeenAt
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const generatePDFContent = (): string => {
    // This would typically be handled by a PDF generation library
    // For now, return a simple text representation
    return `
Security Report
Generated: ${new Date().toISOString()}
Time Range: ${filters.timeRange.start} to ${filters.timeRange.end}

Executive Summary:
- Total Findings: ${reportData.executiveSummary.totalFindings}
- Critical: ${reportData.executiveSummary.criticalFindings}
- High: ${reportData.executiveSummary.highFindings}
- Medium: ${reportData.executiveSummary.mediumFindings}
- Low: ${reportData.executiveSummary.lowFindings}
- Average Time to Fix: ${reportData.executiveSummary.avgTimeToFix} days
- Targets Scanned: ${reportData.executiveSummary.targetsScanned}

OWASP Top 10 Mapping:
${Object.entries(reportData.complianceMapping.owaspTop10).map(([tag, count]) => `- ${tag}: ${count}`).join('\n')}

Technical Breakdown by Tool:
${Object.entries(reportData.technicalBreakdown.byTool).map(([tool, count]) => `- ${tool}: ${count}`).join('\n')}
    `;
  };

  const OWASP_TAGS = [
    'A01: Broken Access Control',
    'A02: Cryptographic Failures', 
    'A03: Injection',
    'A04: Insecure Design',
    'A05: Security Misconfiguration',
    'A06: Vulnerable & Outdated Components',
    'A07: Identification & Authentication Failures',
    'A08: Software & Data Integrity Failures',
    'A09: Security Logging & Monitoring Failures',
    'A10: Server-Side Request Forgery'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Security Reports</h1>
          <p className="text-gray-400 mt-2">Generate comprehensive security reports with compliance mapping</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedExportFormat}
            onChange={(e) => setSelectedExportFormat(e.target.value as 'pdf' | 'csv' | 'json')}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <button
            onClick={handleExportReport}
            disabled={isGeneratingReport}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isGeneratingReport ? 'Generating...' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.timeRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                timeRange: { ...prev.timeRange, start: e.target.value }
              }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={filters.timeRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                timeRange: { ...prev.timeRange, end: e.target.value }
              }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Targets</label>
            <select
              multiple
              value={filters.targetIds}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                targetIds: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
            >
              {targets.map(target => (
                <option key={target.id} value={target.id}>{target.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <div className="space-y-1">
              {['critical', 'high', 'medium', 'low'].map(severity => (
                <label key={severity} className="flex items-center text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={filters.severityFilter.includes(severity)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({
                          ...prev,
                          severityFilter: [...prev.severityFilter, severity]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          severityFilter: prev.severityFilter.filter(s => s !== severity)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Executive Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{reportData.executiveSummary.criticalFindings}</div>
            <div className="text-sm text-gray-300">Critical Findings</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{reportData.executiveSummary.highFindings}</div>
            <div className="text-sm text-gray-300">High Findings</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{reportData.executiveSummary.mediumFindings}</div>
            <div className="text-sm text-gray-300">Medium Findings</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{reportData.executiveSummary.lowFindings}</div>
            <div className="text-sm text-gray-300">Low Findings</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-lg font-semibold text-white">{reportData.executiveSummary.totalFindings}</div>
            <div className="text-sm text-gray-300">Total Findings</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-lg font-semibold text-white">{reportData.executiveSummary.avgTimeToFix} days</div>
            <div className="text-sm text-gray-300">Avg Time to Fix</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-lg font-semibold text-white">{reportData.executiveSummary.targetsScanned}</div>
            <div className="text-sm text-gray-300">Targets Scanned</div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Findings Over Time</h2>
        <div className="h-64 flex items-end space-x-1">
          {reportData.trends.findingsOverTime.slice(-14).map((day, index) => {
            const maxValue = Math.max(...reportData.trends.findingsOverTime.map(d => d.critical + d.high + d.medium + d.low));
            const height = maxValue > 0 ? ((day.critical + day.high + day.medium + day.low) / maxValue) * 200 : 0;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full bg-gray-700 rounded-t" style={{ height: `${height}px` }}>
                  <div className="h-full flex flex-col">
                    <div 
                      className="bg-red-500" 
                      style={{ height: `${(day.critical / (day.critical + day.high + day.medium + day.low)) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-orange-500" 
                      style={{ height: `${(day.high / (day.critical + day.high + day.medium + day.low)) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500" 
                      style={{ height: `${(day.medium / (day.critical + day.high + day.medium + day.low)) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-blue-500" 
                      style={{ height: `${(day.low / (day.critical + day.high + day.medium + day.low)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">Critical</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">High</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">Medium</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-300">Low</span>
          </div>
        </div>
      </div>

      {/* Compliance Mapping */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">OWASP Top 10 Mapping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OWASP_TAGS.map(tag => (
            <div key={tag} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">{tag}</span>
                <span className="text-blue-400 font-semibold">
                  {reportData.complianceMapping.owaspTop10[tag] || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Findings by Tool</h2>
          <div className="space-y-3">
            {Object.entries(reportData.technicalBreakdown.byTool).map(([tool, count]) => (
              <div key={tool} className="flex justify-between items-center bg-gray-700 rounded-lg p-3">
                <span className="text-white font-medium">{tool}</span>
                <span className="text-blue-400 font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Findings by Status</h2>
          <div className="space-y-3">
            {Object.entries(reportData.technicalBreakdown.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center bg-gray-700 rounded-lg p-3">
                <span className="text-white font-medium capitalize">{status.replace('_', ' ')}</span>
                <span className="text-blue-400 font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

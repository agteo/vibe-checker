
import React, { useState } from 'react';
import { Finding, FindingSeverity, FindingStatus } from '../types';
import { Modal } from '../components/Modal';

interface FindingsPageProps {
    findings: Finding[];
    initialFilter?: { severity?: FindingSeverity; status?: string };
}

const SEVERITY_COLORS: { [key in FindingSeverity]: string } = {
  [FindingSeverity.Critical]: 'bg-critical text-white',
  [FindingSeverity.High]: 'bg-high text-white',
  [FindingSeverity.Medium]: 'bg-medium text-black',
  [FindingSeverity.Low]: 'bg-low text-white',
  [FindingSeverity.Info]: 'bg-info text-white',
};

const STATUS_COLORS: { [key in FindingStatus]: string } = {
  [FindingStatus.Open]: 'bg-red-500 text-white',
  [FindingStatus.Triaged]: 'bg-yellow-500 text-black',
  [FindingStatus.AcceptedRisk]: 'bg-gray-500 text-white',
  [FindingStatus.Fixed]: 'bg-green-500 text-white',
  [FindingStatus.FalsePositive]: 'bg-blue-500 text-white',
};

const SeverityBadge: React.FC<{ severity: FindingSeverity }> = ({ severity }) => (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${SEVERITY_COLORS[severity]}`}>
        {severity}
    </span>
);

const StatusBadge: React.FC<{ status: FindingStatus }> = ({ status }) => {
    const statusText = {
        [FindingStatus.Open]: 'Open',
        [FindingStatus.Triaged]: 'Triaged',
        [FindingStatus.AcceptedRisk]: 'Accepted Risk',
        [FindingStatus.Fixed]: 'Fixed',
        [FindingStatus.FalsePositive]: 'False Positive',
    };
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${STATUS_COLORS[status]}`}>
            {statusText[status]}
        </span>
    );
};

export const FindingsPage: React.FC<FindingsPageProps> = ({ findings, initialFilter }) => {
    const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
    const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
    const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'all'>(initialFilter?.severity || 'all');
    const [statusFilter, setStatusFilter] = useState<string>(initialFilter?.status || 'all');

    const toggleExpanded = (findingId: string) => {
        setExpandedFindings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(findingId)) {
                newSet.delete(findingId);
            } else {
                newSet.add(findingId);
            }
            return newSet;
        });
    };

    const FindingDetailsModal: React.FC<{ finding: Finding; onClose: () => void }> = ({ finding, onClose }) => {
        // Parse markdown-like content for better display
        const parseDescription = (text: string) => {
            return text
                .split('\n')
                .map((line, index) => {
                    // Handle HTML tags
                    if (line.includes('<b>') && line.includes('</b>')) {
                        const parts = line.split('<b>');
                        return (
                            <p key={index} className="text-gray-300 mb-2">
                                {parts[0]}
                                <span className="font-bold text-white">{parts[1]?.split('</b>')[0]}</span>
                                {parts[1]?.split('</b>')[1]}
                            </p>
                        );
                    }
                    
                    if (line.startsWith('## ')) {
                        return <h3 key={index} className="text-xl font-bold text-white mt-6 mb-3">{line.replace('## ', '')}</h3>;
                    }
                    if (line.startsWith('### ')) {
                        return <h4 key={index} className="text-lg font-semibold text-blue-300 mt-4 mb-2">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('- **')) {
                        const content = line.replace('- **', '').replace('**:', ':');
                        return <li key={index} className="text-gray-300 ml-4 mb-1">{content}</li>;
                    }
                    if (line.startsWith('- ')) {
                        return <li key={index} className="text-gray-300 ml-4 mb-1">{line.replace('- ', '')}</li>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={index} className="font-bold text-white mt-4 mb-2">{line.replace(/\*\*/g, '')}</p>;
                    }
                    if (line.trim() === '') {
                        return <br key={index} />;
                    }
                    return <p key={index} className="text-gray-300 mb-2">{line}</p>;
                });
        };

        return (
            <Modal isOpen={true} onClose={onClose} title={`Security Scan Report: ${finding.title}`}>
                <div className="space-y-6 text-gray-300 max-h-96 overflow-y-auto">
                    {/* Scan Summary */}
                    <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-blue-300 mb-3">🔍 Scan Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold text-gray-400">Target:</span>
                                <p className="text-white font-mono">{finding.location}</p>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-400">Tool:</span>
                                <p className="text-white">{finding.tool}</p>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-400">Severity:</span>
                                <SeverityBadge severity={finding.severity} />
                            </div>
                            <div>
                                <span className="font-semibold text-gray-400">Status:</span>
                                <StatusBadge status={finding.status} />
                            </div>
                            {finding.owaspTop10Tags && finding.owaspTop10Tags.length > 0 && (
                                <div className="col-span-2">
                                    <span className="font-semibold text-gray-400">OWASP Top 10:</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {finding.owaspTop10Tags.map((tag, index) => (
                                            <span 
                                                key={index}
                                                className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs font-medium border border-purple-600/50"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Description */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3">📋 Detailed Analysis</h3>
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            {finding.description ? parseDescription(finding.description) : <p className="text-gray-400">No detailed analysis available</p>}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3">💡 Next Steps & Recommendations</h3>
                        <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                            {finding.recommendation ? parseDescription(finding.recommendation) : <p className="text-gray-400">No recommendations available</p>}
                        </div>
                    </div>

                    {/* Additional Info */}
                    {(finding as any).scanDetails && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-3">⚙️ Scan Configuration</h3>
                            <div className="bg-gray-800/50 p-4 rounded-lg text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-semibold text-gray-400">Scan Duration:</span>
                                        <p className="text-gray-300">{(finding as any).scanDetails.scanDuration || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-400">Templates Executed:</span>
                                        <p className="text-gray-300">{(finding as any).scanDetails.templatesExecuted || 'Multiple'}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-400">Severity Levels:</span>
                                        <p className="text-gray-300">{(finding as any).scanDetails.severityLevels?.join(', ') || 'All'}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-400">Security Categories:</span>
                                        <p className="text-gray-300">{(finding as any).scanDetails.tags?.join(', ') || 'Web Security'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                // Future: Add functionality to schedule another scan
                                console.log('Schedule new scan for:', finding.location);
                                onClose();
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                            Schedule New Scan
                        </button>
                    </div>
                </div>
            </Modal>
        );
    };

    // Apply filters
    const filteredFindings = findings.filter(finding => {
        if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
        if (statusFilter !== 'all' && finding.status !== statusFilter) return false;
        return true;
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Findings</h1>
                <div className="text-sm text-gray-400">
                    {filteredFindings.length} of {findings.length} findings
                    {(severityFilter !== 'all' || statusFilter !== 'all') && (
                        <span className="ml-2 text-blue-400">(filtered)</span>
                    )}
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-gray-800 p-4 rounded-lg mb-6 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Severity:</label>
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value as FindingSeverity | 'all')}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                    >
                        <option value="all">All</option>
                        <option value={FindingSeverity.Critical}>Critical</option>
                        <option value={FindingSeverity.High}>High</option>
                        <option value={FindingSeverity.Medium}>Medium</option>
                        <option value={FindingSeverity.Low}>Low</option>
                        <option value={FindingSeverity.Info}>Info</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                    >
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="triaged">Triaged</option>
                        <option value="accepted_risk">Accepted Risk</option>
                        <option value="fixed">Fixed</option>
                        <option value="false_positive">False Positive</option>
                    </select>
                </div>
                {(severityFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                        onClick={() => {
                            setSeverityFilter('all');
                            setStatusFilter('all');
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 ml-auto"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Target</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tool</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">First Seen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredFindings.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                                    {findings.length === 0 
                                        ? 'No findings available. Run a scan to discover vulnerabilities.'
                                        : 'No findings match the current filters. Try adjusting your filter criteria.'}
                                </td>
                            </tr>
                        ) : (
                            filteredFindings.map(finding => (
                            <React.Fragment key={finding.id}>
                        <tr
                            className="hover:bg-gray-700/50 cursor-pointer transition-colors"
                            onClick={() => {
                                console.log('Row clicked for finding:', finding.title);
                                setSelectedFinding(finding);
                            }}
                        >
                                    <td className="px-6 py-4 whitespace-nowrap"><SeverityBadge severity={finding.severity} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{finding.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={finding.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {finding.targetId === 'unknown-target' ? 'Unknown Target' : finding.targetId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{finding.tool}</td>
                                    <td className="px-6 py-4 text-sm text-gray-400 font-mono whitespace-nowrap min-w-0">
                                        <div className="max-w-xs overflow-x-auto">
                                            {finding.location}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(finding.firstSeenAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        <div className="flex space-x-2">
                                            <span className="text-blue-400 font-medium">
                                                Click row to view details
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                {expandedFindings.has(finding.id) && (
                                    <tr className="bg-gray-700/30">
                                        <td colSpan={8} className="px-6 py-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-400 mb-1">Description</h4>
                                                    <p className="text-gray-300 text-sm">
                                                        {finding.description || 'No description available'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-400 mb-1">Recommendation</h4>
                                                    <p className="text-green-300 text-sm bg-green-900/20 border border-green-600/30 p-2 rounded">
                                                        {finding.recommendation || 'No recommendation available'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {selectedFinding && (
                <FindingDetailsModal 
                    finding={selectedFinding} 
                    onClose={() => {
                        console.log('Closing modal for finding:', selectedFinding.title);
                        setSelectedFinding(null);
                    }} 
                />
            )}
        </div>
    );
};

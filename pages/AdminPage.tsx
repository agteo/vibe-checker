
import React, { useState } from 'react';
import { AuditLog } from '../types';

interface AdminPageProps {
    auditLogs: AuditLog[];
}

export const AdminPage: React.FC<AdminPageProps> = ({ auditLogs }) => {
    const [activeTab, setActiveTab] = useState<'audit' | 'settings'>('audit');

    const AuditLogTable: React.FC = () => (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{log.actorUserId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{log.action}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{log.entityType}:{log.entityId}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const SettingsForm: React.FC = () => (
        <div className="bg-gray-800 rounded-xl shadow-lg p-8">
            <form className="space-y-6 max-w-lg">
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Data Retention (days)</label>
                    <input type="number" defaultValue="90" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Scan Concurrency Cap</label>
                    <input type="number" defaultValue="5" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Default Rate Limit (req/min)</label>
                    <input type="number" defaultValue="100" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white" />
                </div>
                 <div className="flex justify-start pt-4">
                    <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg">
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Admin</h1>

            <div className="flex border-b border-gray-700 mb-8">
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-6 py-3 font-medium ${activeTab === 'audit' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                >
                    Audit Log
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-medium ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
                >
                    Settings
                </button>
            </div>

            {activeTab === 'audit' ? <AuditLogTable /> : <SettingsForm />}
        </div>
    );
};

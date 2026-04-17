import React from 'react';
import { Page } from '../App';
import { DashboardIcon, TargetIcon, PolicyIcon, FindingsIcon, ReportsIcon, AdminIcon } from './icons';
import { useScannerHealth } from '../src/hooks/useApi';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li
    onClick={onClick}
    className={`flex items-center rounded-2xl px-4 py-3 transition-colors ${
      isActive
        ? 'bg-primary text-white shadow-lg shadow-orange-500/10'
        : 'text-gray-400 hover:bg-gray-700/70 hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-3 font-medium">{label}</span>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isOpen, onClose }) => {
  const { data: scannerHealth } = useScannerHealth();
  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'Dashboard', label: 'Dashboard', icon: <DashboardIcon className="h-6 w-6" /> },
    { page: 'Targets', label: 'Targets', icon: <TargetIcon className="h-6 w-6" /> },
    { page: 'Policies', label: 'Policies', icon: <PolicyIcon className="h-6 w-6" /> },
    { page: 'Findings', label: 'Findings', icon: <FindingsIcon className="h-6 w-6" /> },
    { page: 'Reports', label: 'Reports', icon: <ReportsIcon className="h-6 w-6" /> },
    { page: 'Admin', label: 'Admin', icon: <AdminIcon className="h-6 w-6" /> },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside className={`app-sidebar top-0 left-0 z-40 flex h-full flex-col p-5 ${isOpen ? 'is-open' : ''}`}>
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/15 font-bold text-lg text-orange-300 shadow-lg shadow-orange-500/10">
                VC
              </div>
              <div>
                <p className="eyebrow">Security Ops</p>
                <h1 className="text-2xl font-bold text-white">Vibe Check</h1>
              </div>
            </div>
            <button
              type="button"
              className="text-slate-400 transition-colors hover:text-white lg:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              X
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Run scans, triage findings, and keep your target inventory in one operator console.
          </p>
        </div>

        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <NavItem
                key={item.page}
                icon={item.icon}
                label={item.label}
                isActive={currentPage === item.page}
                onClick={() => {
                  setCurrentPage(item.page);
                  onClose();
                }}
              />
            ))}
          </ul>
        </nav>

        <div className={`mt-auto rounded-3xl border p-4 ${
          scannerHealth?.zap.available
            ? 'border-cyan-400/15 bg-cyan-400/5'
            : 'border-yellow-500/20 bg-yellow-500/5'
        }`}>
          <p className="eyebrow">Status</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {scannerHealth?.zap.available ? 'Web scanner online' : 'Web scanner offline'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {scannerHealth?.zap.available
              ? 'ZAP is reachable, so URL-based scans can collect real web findings.'
              : 'Start Docker Desktop and run the scanner stack, or point ZAP to localhost:8082 for local scans.'}
          </p>
        </div>
      </aside>
    </>
  );
};

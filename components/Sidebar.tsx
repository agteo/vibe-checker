
import React from 'react';
import { Page } from '../App';
import { DashboardIcon, TargetIcon, PolicyIcon, FindingsIcon, ReportsIcon, AdminIcon } from './icons';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li
    onClick={onClick}
    className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
      isActive
        ? 'bg-primary text-white'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-3 font-medium">{label}</span>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'Dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" /> },
    { page: 'Targets', label: 'Targets', icon: <TargetIcon className="w-6 h-6" /> },
    { page: 'Policies', label: 'Policies', icon: <PolicyIcon className="w-6 h-6" /> },
    { page: 'Findings', label: 'Findings', icon: <FindingsIcon className="w-6 h-6" /> },
    { page: 'Reports', label: 'Reports', icon: <ReportsIcon className="w-6 h-6" /> },
    { page: 'Admin', label: 'Admin', icon: <AdminIcon className="w-6 h-6" /> },
  ];

  return (
    <aside className="w-64 bg-gray-800 p-4 flex flex-col fixed top-0 left-0 h-full">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold text-lg text-white">
          VC
        </div>
        <h1 className="text-xl font-bold ml-3 text-white">Vibe Check</h1>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <NavItem
              key={item.page}
              icon={item.icon}
              label={item.label}
              isActive={currentPage === item.page}
              onClick={() => setCurrentPage(item.page)}
            />
          ))}
        </ul>
      </nav>
      
      <div className="mt-auto p-4 bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-300">Vibe Check</p>
        <p className="text-xs text-gray-400">Security Scanner</p>
      </div>
    </aside>
  );
};

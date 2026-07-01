import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { DashboardView } from './components/DashboardView';
import { SingleDomainView } from './components/SingleDomainView';
import { BulkUploadView } from './components/BulkUploadView';
import { ResultsHubView } from './components/ResultsHubView';
import { SettingsView } from './components/SettingsView';
import { LayoutDashboard, Globe, Layers, Database, LogOut, User, Cpu, Settings } from 'lucide-react';
import { motion } from 'motion/react';

type ViewID = 'dashboard' | 'single' | 'bulk' | 'results' | 'settings';

const SaaSLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<ViewID>(() => {
    const saved = localStorage.getItem('p2t_active_view');
    return (saved as ViewID) || 'dashboard';
  });

  const handleViewChange = (view: ViewID) => {
    setActiveView(view);
    localStorage.setItem('p2t_active_view', view);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'single':
        return <SingleDomainView />;
      case 'bulk':
        return <BulkUploadView />;
      case 'results':
        return <ResultsHubView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  const navItems = [
    { id: 'dashboard' as ViewID, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'single' as ViewID, label: 'Single Lookup', icon: Globe },
    { id: 'bulk' as ViewID, label: 'Bulk Upload', icon: Layers },
    { id: 'results' as ViewID, label: 'Results Database', icon: Database },
    { id: 'settings' as ViewID, label: 'Settings Panel', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar Layout */}
      <aside className="w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col justify-between shrink-0 z-10 relative">
        <div>
          {/* Logo Area */}
          <div className="h-[56px] px-6 flex flex-col justify-center border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-[#2563EB]" />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold leading-none text-[#111827]">
                  Website Recovery Tool
                </span>
                <span className="text-[11px] text-[#6B7280] mt-0.5 leading-none">
                  Recovery Console
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  className={`w-full h-[36px] flex items-center gap-[10px] px-4 rounded-md text-[14px] transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' 
                      : 'text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile details at the bottom of sidebar */}
        <div className="p-4 border-t border-[#E5E7EB] space-y-3 bg-white">
          <div className="flex items-center gap-3 px-3 py-2 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <User className="h-4 w-4 text-[#6B7280]" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[13px] font-medium text-[#111827] truncate">{user?.name}</div>
              <div className="text-[11px] text-[#6B7280] font-normal capitalize">
                {user?.role || 'Operator'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-[#F9FAFB] text-[#374151] font-medium py-2 rounded-md text-[13px] border border-[#E5E7EB] transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-[#6B7280]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {renderActiveView()}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

const AuthWrapper: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-t-transparent border-[#2563EB] rounded-full animate-spin mb-4" />
        <span className="text-[14px] text-[#374151] font-medium">Initializing system components...</span>
      </div>
    );
  }

  return isAuthenticated ? <SaaSLayout /> : <Login />;
};

export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

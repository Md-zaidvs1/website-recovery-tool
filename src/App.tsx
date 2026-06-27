import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { DashboardView } from './components/DashboardView';
import { SingleDomainView } from './components/SingleDomainView';
import { BulkUploadView } from './components/BulkUploadView';
import { ResultsHubView } from './components/ResultsHubView';
import { SettingsView } from './components/SettingsView';
import { LayoutDashboard, Globe, Layers, Database, LogOut, User, Cpu, Settings, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

type ViewID = 'dashboard' | 'single' | 'bulk' | 'results' | 'settings';

const TerminalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<ViewID>('dashboard');

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
    <div className="min-h-screen bg-[#02040a] flex relative overflow-hidden cyber-scanlines">
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Dynamic Left Sidebar Layout */}
      <aside className="w-64 bg-[#050b14] border-r border-[#00f0ff]/15 flex flex-col justify-between shrink-0 z-10 relative">
        <div>
          {/* Sidebar Header Logo */}
          <div className="p-6 border-b border-[#00f0ff]/10 flex items-center gap-3">
            <div className="bg-[#02040a] border border-[#00f0ff]/40 p-2 rounded-lg shadow-[0_0_12px_rgba(0,240,255,0.25)] animate-pulse-cyber">
              <Cpu className="h-5 w-5 text-[#00f0ff]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-white uppercase font-mono leading-none">
                PLANT<span className="text-[#00f0ff]">2</span>TREE
              </span>
              <span className="text-[8px] uppercase font-bold tracking-[0.2em] text-[#0074d9] block mt-1 leading-none">
                RECOVERY CONSOLE
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer border ${
                    isActive 
                      ? 'bg-[#0074d9]/15 text-[#00f0ff] border-[#00f0ff]/40 shadow-[0_0_15px_rgba(0,240,255,0.12)]' 
                      : 'text-slate-400 border-transparent hover:bg-[#0074d9]/5 hover:text-[#00f0ff]/80'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#00f0ff]' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account Details */}
        <div className="p-4 border-t border-[#00f0ff]/10 space-y-3 bg-[#02040a]/50">
          <div className="flex items-center gap-3 px-3 py-2 bg-[#050b14]/85 rounded border border-[#00f0ff]/10">
            <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center border border-[#0074d9]/20">
              <User className="h-4 w-4 text-[#00f0ff]" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-mono font-bold text-slate-300 truncate">{user?.name}</div>
              <div className="text-[8px] text-[#00f0ff]/70 uppercase tracking-widest font-extrabold mt-0.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-[#00f0ff] rounded-full animate-ping" />
                SECURE ACCESS
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-[#050b14] hover:bg-red-900/45 hover:text-white hover:border-red-600/50 font-mono font-bold py-2.5 rounded text-xs transition-all duration-300 border border-[#00f0ff]/10 cursor-pointer uppercase tracking-widest text-slate-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Terminate
          </button>
        </div>

      </aside>

      {/* Main View Work Area */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-10 z-10 relative">
        <div className="max-w-6xl mx-auto">
          {/* Cyber Terminal Header Panel Accent */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#00f0ff]/10">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#00f0ff]" />
              <span className="text-[10px] font-mono text-[#0074d9] uppercase tracking-wider">
                Console Core: ACTIVE // Host: p2t_secure_gateway // Integrity: SECURED
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#00f0ff]/70 uppercase">
              Plant2Tree Enterprise Recovery Terminal v5.0.0
            </div>
          </div>

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono">
        <div className="relative mb-6">
          <div className="h-12 w-12 border border-red-500 rounded-full animate-ping absolute" />
          <div className="h-12 w-12 border-2 border-t-transparent border-red-500 rounded-full animate-spin" />
        </div>
        <span className="text-xs text-red-500 font-bold uppercase tracking-[0.25em] animate-pulse">Initializing Recovery Console Core...</span>
      </div>
    );
  }

  return isAuthenticated ? <TerminalLayout /> : <Login />;
};

export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

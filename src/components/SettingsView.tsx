import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  User, Shield, Database, Cpu, Lock, ToggleLeft, ToggleRight, 
  Trash2, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, 
  RefreshCw, Sliders, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SectionID = 'account' | 'security' | 'database' | 'config';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionID>('account');
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [updatingPass, setUpdatingPass] = useState(false);

  // Config fields (loaded from localStorage with fallbacks)
  const [timeout, setTimeoutVal] = useState<number>(30);
  const [concurrency, setConcurrency] = useState<number>(2);
  const [waybackFallback, setWaybackFallback] = useState<boolean>(true);
  const [geminiGrounding, setGeminiGrounding] = useState<boolean>(true);
  const [mode, setMode] = useState<'fast' | 'balanced' | 'deep'>('balanced');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal confirm helper
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    actionUrl: string;
    buttonText: string;
    isDanger: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get('/api/settings/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load settings stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Load custom scraper config from localstorage
    const storedTimeout = localStorage.getItem('p2t_timeout');
    const storedConcurrency = localStorage.getItem('p2t_concurrency');
    const storedWayback = localStorage.getItem('p2t_wayback');
    const storedGemini = localStorage.getItem('p2t_gemini');
    const storedMode = localStorage.getItem('p2t_mode');

    if (storedTimeout) setTimeoutVal(parseInt(storedTimeout, 10));
    if (storedConcurrency) setConcurrency(parseInt(storedConcurrency, 10));
    if (storedWayback) setWaybackFallback(storedWayback === 'true');
    if (storedGemini) setGeminiGrounding(storedGemini === 'true');
    if (storedMode) setMode(storedMode as any);
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('p2t_timeout', timeout.toString());
    localStorage.setItem('p2t_concurrency', concurrency.toString());
    localStorage.setItem('p2t_wayback', waybackFallback.toString());
    localStorage.setItem('p2t_gemini', geminiGrounding.toString());
    localStorage.setItem('p2t_mode', mode);
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setUpdatingPass(true);
    try {
      const res = await axios.post('/api/settings/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (res.data.success) {
        setPassSuccess('Passcode credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPassError(err.response?.data?.error || 'Failed to update passcode.');
    } finally {
      setUpdatingPass(false);
    }
  };

  const triggerAction = (
    title: string,
    message: string,
    actionUrl: string,
    buttonText: string,
    isDanger = true
  ) => {
    setConfirmModal({
      show: true,
      title,
      message,
      actionUrl,
      buttonText,
      isDanger,
    });
  };

  const executeAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await axios.post(confirmModal.actionUrl);
      if (res.data.success) {
        setActionSuccess(res.data.message || 'Operation executed successfully.');
        fetchStats();
        setTimeout(() => {
          setConfirmModal(null);
          setActionSuccess(null);
        }, 2000);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action execution failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const sections = [
    { id: 'account' as SectionID, label: 'Account Profile', icon: User },
    { id: 'security' as SectionID, label: 'Access Security', icon: Lock },
    { id: 'database' as SectionID, label: 'Database Maintenance', icon: Database },
    { id: 'config' as SectionID, label: 'Scraping Config', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold font-sans text-white uppercase tracking-wider block">
          Terminal System Settings
        </h1>
        <p className="text-xs text-[#0074d9] font-mono mt-1">
          Adjust security profiles, empty database caches, and configure scraping fallback modes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sub-navigation menu */}
        <div className="lg:col-span-1 bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-2 space-y-1.5">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-xs font-mono font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer border ${
                  isActive 
                    ? 'bg-[#0074d9]/15 text-[#00f0ff] border-[#00f0ff]/30 shadow-[0_0_8px_rgba(0,240,255,0.1)]' 
                    : 'text-slate-500 border-transparent hover:bg-[#0074d9]/5 hover:text-slate-300'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#00f0ff] animate-pulse' : 'text-slate-500'}`} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Right Work area */}
        <div className="lg:col-span-3 bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-6 relative min-h-[400px]">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#0074d9]/50" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#0074d9]/50" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#0074d9]/50" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#0074d9]/50" />

          {activeSection === 'account' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#00f0ff]/10 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Active Operator Session
                </span>
                <span className="text-[10px] bg-[#0074d9]/15 text-[#00f0ff] border border-[#00f0ff]/30 px-2.5 py-1 rounded font-mono uppercase tracking-widest">
                  {user?.role} ACCESS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/60 border border-[#00f0ff]/15 p-5 rounded space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#0074d9]/15 rounded-full border border-[#00f0ff]/30 flex items-center justify-center">
                      <User className="h-6 w-6 text-[#00f0ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-mono font-bold text-slate-100">{user?.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">Operator ID: {user?.id}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#00f0ff]/10 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-300">{user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Auth Level:</span>
                      <span className="text-[#00f0ff] font-bold">System Administrator</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Session Mode:</span>
                      <span className="text-emerald-400 font-bold">Secure TLS Tunnel</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 border border-[#00f0ff]/15 p-5 rounded flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono font-bold text-[#00f0ff] uppercase tracking-widest flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#00f0ff]" />
                      Access Mandate
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                      As a singular administrator, you maintain absolute clearance to run single domain scrapers, manage the batch processing queues, export client reports, and execute database maintenance operations.
                    </p>
                  </div>
                  <div className="text-[9px] text-slate-600 font-mono italic mt-4">
                    Connection: Authorized terminal node active.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#00f0ff]/10">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Change Administrator Passcode
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Secure your recovery console by updating the singular login access passcode.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                {passError && (
                  <div className="bg-rose-950/20 border border-rose-600/30 rounded p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-rose-300 font-mono">{passError}</span>
                  </div>
                )}
                {passSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-600/30 rounded p-4 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-emerald-300 font-mono">{passSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    Current Access Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    New Access Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    Confirm New Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPass}
                    className="flex justify-center items-center gap-2 py-2 px-4 border border-[#00f0ff]/25 rounded shadow-[0_0_10px_rgba(0,240,255,0.08)] text-xs font-bold font-mono text-white bg-[#0074d9]/25 hover:bg-[#0074d9] transition-all cursor-pointer disabled:opacity-50 uppercase tracking-widest"
                  >
                    {updatingPass ? 'Rewriting Passcode Node...' : 'Commit Passcode Change'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#00f0ff]/10 flex justify-between items-center">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                    Database Statistics & Wipe operations
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Direct access to wipe tables, reset historical search indices, and factory-reset the application.
                  </p>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={loadingStats}
                  className="p-2 bg-[#050b14] hover:bg-[#0074d9]/10 border border-[#00f0ff]/15 rounded text-slate-400 hover:text-[#00f0ff] transition-all cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin text-[#00f0ff]' : ''}`} />
                </button>
              </div>

              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-10 font-mono">
                  <div className="h-6 w-6 border-2 border-t-transparent border-[#00f0ff] rounded-full animate-spin mb-2" />
                  <span className="text-[10px] text-[#0074d9]">Querying DB Statistics...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Database Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/40 border border-[#00f0ff]/10 p-4 rounded text-center">
                      <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Queue Domains</div>
                      <div className="text-xl font-mono font-bold text-white mt-1">{stats?.totalDomains || 0}</div>
                    </div>
                    <div className="bg-black/40 border border-[#00f0ff]/10 p-4 rounded text-center">
                      <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Recovered Contacts</div>
                      <div className="text-xl font-mono font-bold text-emerald-400 mt-1">{stats?.totalContacts || 0}</div>
                    </div>
                    <div className="bg-black/40 border border-[#00f0ff]/10 p-4 rounded text-center">
                      <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Failed domains</div>
                      <div className="text-xl font-mono font-bold text-rose-500 mt-1">{stats?.failedDomains || 0}</div>
                    </div>
                    <div className="bg-black/40 border border-[#00f0ff]/10 p-4 rounded text-center">
                      <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Active Bulk Jobs</div>
                      <div className="text-xl font-mono font-bold text-[#00f0ff] mt-1">{stats?.bulkJobsCount || 0}</div>
                    </div>
                  </div>

                  {/* Wipe Actions List */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest font-mono">
                      Destructive Core Actions (Requires Confirmation)
                    </h3>

                    <div className="border border-[#00f0ff]/10 rounded bg-[#050b14]/40 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-100 uppercase">Clear Search History</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Wipe the list of recent single lookup checks. Does not affect contacts database.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'Clear Search History',
                          'Are you sure you want to delete all search history log records? This is irreversible.',
                          '/api/settings/delete-history',
                          'Erase History Logs'
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050b14] hover:bg-rose-950/20 border border-[#00f0ff]/15 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-mono text-[10px] uppercase font-bold rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear History
                      </button>
                    </div>

                    <div className="border border-[#00f0ff]/10 rounded bg-[#050b14]/40 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-100 uppercase">Clear Recovered Contacts</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Completely empty the table of extracted contact records. All emails and phones will be lost.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'Clear Recovered Contacts',
                          'Are you sure you want to erase all successfully recovered contact information? Your clients export sheets will be completely empty.',
                          '/api/settings/delete-contacts',
                          'Wipe Contact Records'
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050b14] hover:bg-rose-950/20 border border-[#00f0ff]/15 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-mono text-[10px] uppercase font-bold rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear Contacts
                      </button>
                    </div>

                    <div className="border border-[#00f0ff]/10 rounded bg-[#050b14]/40 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-100 uppercase">Wipe Bulk Upload Queues</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Force terminate active background crawling workers, reset bulk jobs, and delete all domains inside bulk queues.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'Wipe Bulk Queues',
                          'Are you sure you want to stop all active background scrapers and erase bulk queue items? This clears progress stats completely.',
                          '/api/settings/delete-bulk-queue',
                          'Reset Bulk Batches'
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050b14] hover:bg-rose-950/20 border border-[#00f0ff]/15 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 font-mono text-[10px] uppercase font-bold rounded cursor-pointer transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset Bulk Queues
                      </button>
                    </div>

                    <div className="border border-[#00f0ff]/10 rounded bg-[#050b14]/40 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-100 uppercase text-rose-500">FACTORY RESET ENTIRE DATABASE</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Completely wipe everything: all domains, all contacts, all bulk jobs, and logs. This returns the database to fresh install.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'FULL FACTORY RESET',
                          'CRITICAL NOTICE: You are about to wipe the entire database, terminate active threads, and reset the system to raw installation settings. There is absolutely NO rollback.',
                          '/api/settings/reset',
                          'CONFIRM FACTORY WIPE'
                        )}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/20 hover:bg-rose-600 border border-rose-900/60 hover:border-rose-600 text-rose-400 hover:text-black font-mono text-[10px] uppercase font-bold rounded cursor-pointer transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.15)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Factory Reset System
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'config' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#00f0ff]/10">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Scraping Engine Preferences
                </span>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Adjust technical crawler settings for performance tuning and fallback safety.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-6 max-w-lg font-mono">
                {saveSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-600/30 rounded p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs text-emerald-300">Engine parameters stored successfully!</span>
                  </div>
                )}

                {/* Extraction Mode Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Extraction Strategy Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="block w-full py-2.5 px-3 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
                  >
                    <option value="fast">Fast Mode (Live site & latest snapshot only)</option>
                    <option value="balanced">Balanced Mode (Default - Live site & up to 3 snapshots)</option>
                    <option value="deep">Deep Recovery Mode (Full archive scan & multi-snapshot deep crawl)</option>
                  </select>
                  <p className="text-[9px] text-slate-500 font-mono">
                    Controls snapshot scanning bounds and parallel page crawling levels.
                  </p>
                </div>

                {/* Scraping Timeout slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      HTTP Scraping Timeout
                    </label>
                    <span className="text-xs text-[#00f0ff] font-bold">{timeout} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={timeout}
                    onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                    className="w-full accent-[#00f0ff] bg-slate-900"
                  />
                  <p className="text-[9px] text-slate-500 font-mono">Maximum time to wait before forcing a watchdog retry or snapshot check.</p>
                </div>

                {/* Scraping Concurrency slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Active Thread Concurrency
                    </label>
                    <span className="text-xs text-[#00f0ff] font-bold">{concurrency} Worker Threads</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value))}
                    className="w-full accent-[#00f0ff] bg-slate-900"
                  />
                  <p className="text-[9px] text-slate-500 font-mono">Maximum concurrent domains scraped during bulk batch loops.</p>
                </div>

                {/* Fallbacks toggles */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-widest border-b border-[#00f0ff]/10 pb-2">
                    Fallback Chain Components
                  </h4>

                  <div className="flex justify-between items-center py-1">
                    <div>
                      <div className="text-xs text-slate-200 font-bold uppercase font-mono">Wayback Machine Snapshot Scanning</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 font-mono">Attempt to load historical snapshots from Archive.org if domain fails DNS checks.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWaybackFallback(!waybackFallback)}
                      className="text-[#00f0ff] hover:text-[#00f0ff]/80 transition-colors"
                    >
                      {waybackFallback ? (
                        <ToggleRight className="h-8 w-8 text-[#00f0ff] cursor-pointer" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-800 cursor-pointer" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <div>
                      <div className="text-xs text-slate-200 font-bold uppercase font-mono">Gemini WHOIS & Grounding Intelligence</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 font-mono font-mono">Leverage Gemini model search grounding to query WHOIS records and directories if web scrapers find no contact cards.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeminiGrounding(!geminiGrounding)}
                      className="text-[#00f0ff] hover:text-[#00f0ff]/80 transition-colors"
                    >
                      {geminiGrounding ? (
                        <ToggleRight className="h-8 w-8 text-[#00f0ff] cursor-pointer" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-800 cursor-pointer" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#00f0ff]/10">
                  <button
                    type="submit"
                    className="flex justify-center items-center gap-2 py-2.5 px-5 border border-[#00f0ff]/25 rounded shadow-[0_0_10px_rgba(0,240,255,0.08)] text-xs font-bold font-mono text-white bg-[#0074d9]/25 hover:bg-[#0074d9] transition-all cursor-pointer uppercase tracking-widest"
                  >
                    Save Config Parameters
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal overlay */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050b14] border-2 border-rose-600/50 p-6 rounded-lg max-w-md w-full relative shadow-[0_0_30px_rgba(244,63,94,0.15)] font-mono"
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-rose-500" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-rose-500" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-rose-500" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-rose-500" />

              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-500 animate-pulse" />
                <h3 className="text-sm font-bold uppercase text-white tracking-wider">{confirmModal.title}</h3>
              </div>

              {actionSuccess ? (
                <div className="py-6 text-center text-emerald-400 space-y-2">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 animate-bounce" />
                  <p className="text-xs">{actionSuccess}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {confirmModal.message}
                  </p>

                  <div className="flex justify-end gap-3 text-xs">
                    <button
                      onClick={() => setConfirmModal(null)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-black/60 border border-[#00f0ff]/15 hover:bg-slate-900 text-slate-400 rounded uppercase font-bold cursor-pointer transition-colors"
                    >
                      Abort Action
                    </button>
                    <button
                      onClick={executeAction}
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-rose-950/40 hover:bg-rose-600 border border-rose-900/60 hover:border-rose-600 hover:text-black text-rose-400 font-bold rounded uppercase cursor-pointer transition-all duration-300"
                    >
                      {actionLoading ? 'Executing Action Node...' : confirmModal.buttonText}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

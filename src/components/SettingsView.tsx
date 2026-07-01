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
        setPassSuccess('Credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPassError(err.response?.data?.error || 'Failed to update password.');
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
        <h1 className="text-[24px] font-bold text-[#111827]">
          Settings
        </h1>
        <p className="text-[14px] text-[#6B7280]">
          Adjust safety parameters, empty databases, and configure scraping fallback queues
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sub-navigation Menu */}
        <div className="lg:col-span-1 bg-white border border-[#E5E7EB] rounded-lg p-2 space-y-1 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-[#EFF6FF] text-[#2563EB]' 
                    : 'text-[#374151] hover:bg-[#F9FAFB]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area inside card */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] min-h-[420px]">
          
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#E5E7EB] flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Account Profile
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] rounded-full border border-[#DBEAFE] capitalize">
                  {user?.role} Access
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-[#E5E7EB] p-5 rounded-lg space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#EFF6FF] rounded-full border border-[#DBEAFE] flex items-center justify-center">
                      <User className="h-6 w-6 text-[#2563EB]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#111827]">{user?.name}</h3>
                      <p className="text-[12px] text-[#6B7280]">Operator ID: {user?.id}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-[13px] text-[#374151]">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Email:</span>
                      <span className="font-medium text-[#111827]">{user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Auth Level:</span>
                      <span className="font-semibold text-[#2563EB]">System Administrator</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Session Mode:</span>
                      <span className="font-semibold text-[#16A34A]">Secure TLS Link</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-[#E5E7EB] p-5 rounded-lg flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-[13px] font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-[#2563EB]" />
                      Session Policy
                    </h3>
                    <p className="text-[12px] text-[#6B7280] leading-relaxed">
                      As an authorized website recovery administrator, you maintain permissions to queue multiple batch lists, query single lookups, re-trigger slow extraction threads, and wipe test indices.
                    </p>
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] italic mt-4">
                    Secure session token loaded and authorized.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#E5E7EB]">
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Access Security
                </h2>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  Secure your console access by updating your account password below.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                {passError && (
                  <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-md p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-[#DC2626] shrink-0 mt-0.5" />
                    <span className="text-[12px] text-[#991B1B]">{passError}</span>
                  </div>
                )}
                {passSuccess && (
                  <div className="bg-[#HN_SUCCESS] bg-[#DCFCE7] border border-[#BBF7D0] rounded-md p-3 flex items-start gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-[#16A34A] shrink-0 mt-0.5" />
                    <span className="text-[12px] text-[#15803D]">{passSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[14px]"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[14px]"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[14px]"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPass}
                    className="inline-flex justify-center items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {updatingPass ? 'Updating Password...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#E5E7EB] flex justify-between items-center">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#111827]">
                    Database Maintenance
                  </h2>
                  <p className="text-[12px] text-[#6B7280] mt-1">
                    Review record caches and execute system-wide maintenance operations safely.
                  </p>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={loadingStats}
                  className="p-2 bg-white hover:bg-slate-50 border border-[#E5E7EB] rounded-md text-slate-500 hover:text-[#2563EB] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-6 w-6 border-2 border-t-transparent border-[#2563EB] rounded-full animate-spin mb-2" />
                  <span className="text-[12px] text-[#6B7280]">Analyzing active records...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-[#E5E7EB] p-4 rounded-lg text-center">
                      <div className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">Queue Domains</div>
                      <div className="text-xl font-bold text-[#111827] mt-1">{stats?.totalDomains || 0}</div>
                    </div>
                    <div className="bg-slate-50 border border-[#E5E7EB] p-4 rounded-lg text-center">
                      <div className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">Contacts</div>
                      <div className="text-xl font-bold text-[#16A34A] mt-1">{stats?.totalContacts || 0}</div>
                    </div>
                    <div className="bg-slate-50 border border-[#E5E7EB] p-4 rounded-lg text-center">
                      <div className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">Failed Items</div>
                      <div className="text-xl font-bold text-[#DC2626] mt-1">{stats?.failedDomains || 0}</div>
                    </div>
                    <div className="bg-slate-50 border border-[#E5E7EB] p-4 rounded-lg text-center">
                      <div className="text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">Bulk Batches</div>
                      <div className="text-xl font-bold text-[#2563EB] mt-1">{stats?.bulkJobsCount || 0}</div>
                    </div>
                  </div>

                  {/* Wipe Actions List */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-[12px] font-semibold text-[#DC2626] uppercase tracking-wider">
                      Destructive Tools
                    </h3>

                    {/* Clear history */}
                    <div className="border border-[#E5E7EB] rounded-lg bg-slate-50 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#111827]">Clear Search History</h4>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">Erase history of recent single lookup scans. Will not delete scraped contacts.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'Clear Search History',
                          'Are you sure you want to delete all search history log records? This is irreversible.',
                          '/api/settings/delete-history',
                          'Delete History'
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FEF2F2] border border-[#D1D5DB] hover:border-[#FCA5A5] text-[#374151] hover:text-[#DC2626] text-xs font-medium rounded-md cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear History
                      </button>
                    </div>

                    {/* Clear contacts */}
                    <div className="border border-[#E5E7EB] rounded-lg bg-slate-50 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#111827]">Wipe Recovered Contacts</h4>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">Permanently empty all recovered contact records. Scraped emails and phone cards will be erased.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'Clear Recovered Contacts',
                          'Are you sure you want to erase all successfully recovered contact information? Your exports will be completely empty.',
                          '/api/settings/delete-contacts',
                          'Wipe Database'
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FEF2F2] border border-[#D1D5DB] hover:border-[#FCA5A5] text-[#374151] hover:text-[#DC2626] text-xs font-medium rounded-md cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear Contacts
                      </button>
                    </div>

                    {/* Clear bulk queue */}
                    <div className="border border-[#E5E7EB] rounded-lg bg-slate-50 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#111827]">Reset Bulk Batches</h4>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">Terminate active background crawlers, drop active queue records, and delete all bulk upload batches.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'Wipe Bulk Queues',
                          'Are you sure you want to stop all active background scrapers and erase bulk queue items? This clears progress stats completely.',
                          '/api/settings/delete-bulk-queue',
                          'Reset Queues'
                        )}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FEF2F2] border border-[#D1D5DB] hover:border-[#FCA5A5] text-[#374151] hover:text-[#DC2626] text-xs font-medium rounded-md cursor-pointer transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset Queues
                      </button>
                    </div>

                    {/* Full Reset */}
                    <div className="border border-[#E5E7EB] rounded-lg bg-slate-50 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#DC2626]">FACTORY RESET ENTIRE DATABASE</h4>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">Completely wipe everything: domains, contacts, batches, settings logs. Returns system to fresh deploy state.</p>
                      </div>
                      <button
                        onClick={() => triggerAction(
                          'FULL FACTORY RESET',
                          'CRITICAL WARNING: This will drop all database records, clear credentials profiles, and reset the storage to raw defaults. This action cannot be undone.',
                          '/api/settings/reset',
                          'Factory Reset'
                        )}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#FEF2F2] border border-[#DC2626] text-[#DC2626] text-xs font-bold rounded-md cursor-pointer transition-colors shadow-sm"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Factory Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'config' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[#E5E7EB]">
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Scraping Config
                </h2>
                <p className="text-[12px] text-[#6B7280] mt-1">
                  Adjust active background scraper properties, watchdog timeouts, and fallback components.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-6 max-w-lg">
                {saveSuccess && (
                  <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-md p-3.5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                    <span className="text-[12px] text-[#15803D] font-medium">Scraper preferences stored successfully!</span>
                  </div>
                )}

                {/* Extraction Mode Select */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider block">
                    Extraction Strategy Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="block w-full py-2 px-3 bg-white border border-[#D1D5DB] rounded-md text-[#374151] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[13px] transition-colors cursor-pointer"
                  >
                    <option value="fast">Fast Mode (Live site & latest snapshot only)</option>
                    <option value="balanced">Balanced Mode (Default - Live site & up to 3 snapshots)</option>
                    <option value="deep">Deep Recovery Mode (Full archive scan & multi-snapshot deep crawl)</option>
                  </select>
                  <p className="text-[11px] text-[#6B7280]">
                    Fast mode minimizes crawling time, while deep recovery mode ensures multiple historical layers are inspected.
                  </p>
                </div>

                {/* Timeout slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      HTTP Scraping Timeout
                    </label>
                    <span className="text-[13px] text-[#2563EB] font-bold">{timeout} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={timeout}
                    onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                    className="w-full accent-[#2563EB] bg-slate-100 h-2 rounded-full cursor-pointer"
                  />
                  <p className="text-[11px] text-[#6B7280]">Maximum time to wait before forcing a watchdog thread retry or failing.</p>
                </div>

                {/* Concurrency slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Active Thread Concurrency
                    </label>
                    <span className="text-[13px] text-[#2563EB] font-bold">{concurrency} Threads</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={concurrency}
                    onChange={(e) => setConcurrency(parseInt(e.target.value))}
                    className="w-full accent-[#2563EB] bg-slate-100 h-2 rounded-full cursor-pointer"
                  />
                  <p className="text-[11px] text-[#6B7280]">Max parallel worker threads running during bulk queue batch processing.</p>
                </div>

                {/* Toggles */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-[12px] font-semibold text-[#111827] uppercase tracking-wider border-b border-[#F3F4F6] pb-2">
                    Fallback Chain preferences
                  </h4>

                  <div className="flex justify-between items-center py-1">
                    <div>
                      <div className="text-[13px] font-bold text-[#111827]">Wayback Machine Snapshots Scanning</div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">Attempt historical scans via Archive.org if domain returns inactive DNS links.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWaybackFallback(!waybackFallback)}
                      className="text-[#2563EB] transition-colors"
                    >
                      {waybackFallback ? (
                        <ToggleRight className="h-8 w-8 text-[#2563EB] cursor-pointer" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-300 cursor-pointer" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <div>
                      <div className="text-[13px] font-bold text-[#111827]">Gemini WHOIS & Search Grounding</div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">Leverage Gemini model grounding queries if static scrapers fail to extract profiles.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeminiGrounding(!geminiGrounding)}
                      className="text-[#2563EB] transition-colors"
                    >
                      {geminiGrounding ? (
                        <ToggleRight className="h-8 w-8 text-[#2563EB] cursor-pointer" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-300 cursor-pointer" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB]">
                  <button
                    type="submit"
                    className="inline-flex justify-center items-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer shadow-sm"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E5E7EB] p-6 rounded-xl max-w-md w-full relative shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-[#DC2626] animate-pulse" />
                <h3 className="text-[16px] font-bold text-[#111827]">{confirmModal.title}</h3>
              </div>

              {actionSuccess ? (
                <div className="py-6 text-center text-[#16A34A] space-y-2">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-[#16A34A]" />
                  <p className="text-[13px] font-medium">{actionSuccess}</p>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed mb-6">
                    {confirmModal.message}
                  </p>

                  <div className="flex justify-end gap-3 text-xs">
                    <button
                      onClick={() => setConfirmModal(null)}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-white hover:bg-slate-50 border border-[#D1D5DB] text-[#374151] rounded-md font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeAction}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-md cursor-pointer transition-colors shadow-sm"
                    >
                      {actionLoading ? 'Executing...' : confirmModal.buttonText}
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

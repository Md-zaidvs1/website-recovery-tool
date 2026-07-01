import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Search, Percent, RefreshCw, Layers, CheckCircle2, 
  XCircle, Clock, Cpu, Server, HardDrive, ShieldAlert, 
  ChevronRight, Compass, HelpCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

interface StatsCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface CyberStats {
  totalDomains: number;
  totalContacts: number;
  noDataFound: number;
  successRate: number;
  statusCounts: StatsCounts;
  avgProcessingTime: string;
  domainsPerMinute: number;
  currentWorker: string;
  memoryUsage: string;
  currentSourceBeingUsed: string;
  currentDomainInProcess: string;
}

interface RecentRecovery {
  id: string;
  domain: string;
  companyName: string;
  emails: string[];
  phones: string[];
  whatsappNumbers: string[];
  source: string;
  confidence: number;
  recoveredAt: string;
}

export const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<CyberStats | null>(null);
  const [recent, setRecent] = useState<RecentRecovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/dashboard/recent-searches'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (recentRes.data.success) {
        setRecent(recentRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-t-transparent border-[#2563EB] rounded-full animate-spin mb-4" />
        <span className="text-[14px] text-[#6B7280] font-medium">Loading Dashboard statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827]">
            Dashboard
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Overview of recovery operations
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] px-4 py-2 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#6B7280] ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Queue Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-l-4 border-l-[#2563EB] border border-y-[#E5E7EB] border-r-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-[120px]"
        >
          <div>
            <div className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Total Queue Size</div>
            <div className="text-[28px] font-bold text-[#111827] mt-1 leading-none">{stats?.totalDomains || 0}</div>
          </div>
          <div className="text-[12px] text-[#6B7280] flex items-center gap-1.5 truncate">
            <Database className="h-3.5 w-3.5 text-[#6B7280]" />
            <span>Active domain targets</span>
          </div>
        </motion.div>

        {/* Contacts Recovered Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border-l-4 border-l-[#16A34A] border border-y-[#E5E7EB] border-r-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-[120px]"
        >
          <div>
            <div className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Total Contacts Recovered</div>
            <div className="text-[28px] font-bold text-[#16A34A] mt-1 leading-none">{stats?.totalContacts || 0}</div>
          </div>
          <div className="text-[12px] text-[#6B7280] flex items-center gap-1.5 truncate">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
            <span>Success matches recovered</span>
          </div>
        </motion.div>

        {/* Extraction Success Rate Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-l-4 border-l-[#2563EB] border border-y-[#E5E7EB] border-r-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-[120px]"
        >
          <div>
            <div className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Success Rate</div>
            <div className="text-[28px] font-bold text-[#2563EB] mt-1 leading-none">{stats?.successRate || 0}%</div>
          </div>
          <div className="text-[12px] text-[#6B7280] flex items-center gap-1.5 truncate">
            <Percent className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Accuracy ratio index</span>
          </div>
        </motion.div>

        {/* Failed queue items Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border-l-4 border-l-[#DC2626] border border-y-[#E5E7EB] border-r-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-[120px]"
        >
          <div>
            <div className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Failed Queue Items</div>
            <div className="text-[28px] font-bold text-[#DC2626] mt-1 leading-none">{stats?.statusCounts.failed || 0}</div>
          </div>
          <div className="text-[12px] text-[#6B7280] flex items-center gap-1.5 truncate">
            <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
            <span>Failed matches inside logs</span>
          </div>
        </motion.div>
      </div>

      {/* Systems Status & Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scraper Panel (col-span-2) */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:col-span-2 space-y-5">
          <h2 className="text-[16px] font-bold text-[#111827] flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-[#2563EB]" />
            Active Scraper Engine
          </h2>

          <div className="space-y-4">
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 text-[13px] text-[#374151] space-y-2">
              <div className="flex justify-between border-b border-[#E5E7EB] pb-2">
                <span className="text-[#6B7280] font-medium">CORE SOURCES:</span>
                <span className="font-semibold text-[#111827]">WAYBACK, LIVE CRAWL, GROUNDING</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E7EB] pb-2">
                <span className="text-[#6B7280]">ACTIVE WORKERS:</span>
                <span className="font-semibold text-[#16A34A]">{stats?.currentWorker}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] shrink-0">CURRENTLY PROCESSING:</span>
                <span className="font-semibold text-[#111827] truncate max-w-[220px] sm:max-w-[340px]">
                  {stats?.currentDomainInProcess || 'IDLE'}
                </span>
              </div>
            </div>

            {/* Progress Telemetry */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                <span>Completed: {stats?.statusCounts.completed}</span>
                <span>Processing: {stats?.statusCounts.processing}</span>
                <span>Pending: {stats?.statusCounts.pending}</span>
                <span>Failed: {stats?.statusCounts.failed}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                <div 
                  className="bg-[#16A34A] transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.completed / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
                <div 
                  className="bg-[#2563EB] transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.processing / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
                <div 
                  className="bg-slate-300 transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.pending / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
                <div 
                  className="bg-[#DC2626] transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.failed / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Node Telemetry Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
          <h2 className="text-[16px] font-bold text-[#111827] flex items-center gap-2">
            <Server className="h-4.5 w-4.5 text-[#2563EB]" />
            Node Telemetry
          </h2>

          <div className="space-y-3.5 text-[13px] text-[#374151]">
            <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280] flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-[#2563EB]" />
                RAM Memory Usage
              </span>
              <span className="font-semibold text-[#111827]">{stats?.memoryUsage}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280] flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-[#2563EB]" />
                Processing Speed
              </span>
              <span className="font-semibold text-[#111827]">{stats?.domainsPerMinute} / min</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#6B7280] flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#2563EB]" />
                Avg Query Resolution
              </span>
              <span className="font-semibold text-[#111827]">{stats?.avgProcessingTime}</span>
            </div>

            <div className="mt-2 p-3 bg-slate-50 border border-[#E5E7EB] rounded-lg text-[11px] text-[#6B7280] leading-relaxed">
              Worker pool processes target lists inside secure Node environments with watchdog parameters protecting against slow responses.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Searches Stream Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
        <h2 className="text-[16px] font-bold text-[#111827] flex items-center gap-2">
          <Compass className="h-4.5 w-4.5 text-[#2563EB]" />
          Recent Operations
        </h2>

        {recent.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[#E5E7EB] rounded-lg bg-slate-50">
            <HelpCircle className="h-8 w-8 mx-auto text-[#9CA3AF] mb-2" />
            <p className="text-[13px] text-[#6B7280]">No recovery history found. Initiate Lookups to view dynamic streams.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280] text-[12px] uppercase font-semibold border-b border-[#E5E7EB]">
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Primary E-Mail</th>
                  <th className="py-3 px-4">Phone Numbers</th>
                  <th className="py-3 px-4">Recovery Source</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] text-[#374151]">
                {recent.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#111827]">{rec.domain}</td>
                    <td className="py-3 px-4 text-[#6B7280] truncate max-w-[140px]">{rec.companyName || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {rec.emails.length > 0 ? (
                        <span className="text-[#2563EB] font-medium">{rec.emails[0]}</span>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                      {rec.emails.length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 text-[#374151] rounded font-medium">
                          +{rec.emails.length - 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {rec.phones.length > 0 ? (
                        <span>{rec.phones[0]}</span>
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                      {rec.phones.length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 text-[#374151] rounded font-medium">
                          +{rec.phones.length - 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] bg-slate-100 border border-[#E5E7EB] px-2 py-0.5 rounded text-[#374151] font-medium">
                        {rec.source || 'Scraper'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        rec.confidence >= 70 ? 'bg-[#DCFCE7] text-[#16A34A]' :
                        rec.confidence >= 40 ? 'bg-[#FEF3C7] text-[#D97706]' :
                        'bg-[#FEE2E2] text-[#DC2626]'
                      }`}>
                        {rec.confidence}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

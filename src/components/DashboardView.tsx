import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Search, Percent, RefreshCw, Layers, CheckCircle2, 
  XCircle, Clock, Cpu, Server, HardDrive, ShieldAlert, 
  ChevronRight, Compass, HelpCircle, Terminal 
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
    // Auto refresh stats every 2 seconds for real-time cyber ops feel
    const interval = setInterval(fetchDashboardData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] font-mono">
        <div className="h-10 w-10 border-2 border-t-transparent border-[#00f0ff] rounded-full animate-spin mb-4" />
        <span className="text-xs text-[#00f0ff] font-bold uppercase tracking-[0.2em] animate-pulse">Querying Operations Core...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white uppercase tracking-wider block">
            Operations & Analytics
          </h1>
          <p className="text-xs text-[#0074d9] font-mono mt-1">
            Secure web recovery, index matching and real-time scrapers control telemetry.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#050b14]/90 hover:bg-[#0074d9] hover:text-white border border-[#00f0ff]/25 text-[#00f0ff] px-4 py-2 rounded text-xs font-mono uppercase font-bold tracking-widest transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.08)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Sync Telemetry'}
        </button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Queue Size card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          <div className="absolute top-0 right-0 p-4 opacity-5 text-[#00f0ff]">
            <Layers className="h-16 w-16" />
          </div>
          <div className="text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">Total Queue Size</div>
          <div className="text-3xl font-mono font-bold text-white mt-2">{stats?.totalDomains || 0}</div>
          <div className="text-[9px] text-[#0074d9] font-mono mt-3 flex items-center gap-1.5 border-t border-[#00f0ff]/10 pt-2">
            <Database className="h-3 w-3 text-[#00f0ff]" />
            Active domain targets in queue database
          </div>
        </motion.div>

        {/* Contacts Recovered card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#050b14]/75 border border-[#00f0ff]/30 rounded p-5 relative overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.08)]"
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f0ff]" />
          <div className="absolute top-0 right-0 p-4 opacity-5 text-[#00f0ff]">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <div className="text-[#00f0ff] text-[10px] font-mono uppercase tracking-wider font-bold">Contacts Recovered</div>
          <div className="text-3xl font-mono font-bold text-emerald-400 mt-2 glow-text-cyan">{stats?.totalContacts || 0}</div>
          <div className="text-[9px] text-slate-400 font-mono mt-3 flex items-center gap-1.5 border-t border-[#00f0ff]/10 pt-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Domains with public contact points found
          </div>
        </motion.div>

        {/* No Data Found card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          <div className="absolute top-0 right-0 p-4 opacity-5 text-[#00f0ff]">
            <XCircle className="h-16 w-16" />
          </div>
          <div className="text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">No Contacts Found</div>
          <div className="text-3xl font-mono font-bold text-slate-400 mt-2">{stats?.noDataFound || 0}</div>
          <div className="text-[9px] text-[#0074d9] font-mono mt-3 flex items-center gap-1.5 border-t border-[#00f0ff]/10 pt-2">
            <ShieldAlert className="h-3 w-3 text-amber-500" />
            Completed domains with no records
          </div>
        </motion.div>

        {/* Success Rate card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#050b14]/75 border border-[#00f0ff]/20 rounded p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          <div className="absolute top-0 right-0 p-4 opacity-5 text-[#00f0ff]">
            <Percent className="h-16 w-16" />
          </div>
          <div className="text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">Extraction Success Rate</div>
          <div className="text-3xl font-mono font-bold text-[#00f0ff] mt-2 glow-text-cyan">{stats?.successRate || 0}%</div>
          <div className="text-[9px] text-slate-400 font-mono mt-3 flex items-center gap-1.5 border-t border-[#00f0ff]/10 pt-2">
            <Percent className="h-3 w-3 text-[#00f0ff]" />
            Pipeline matching accuracy ratio
          </div>
        </motion.div>
      </div>

      {/* System Hardware Diagnostics & Live Crawler Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scraper Status & Active Threads */}
        <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded p-5 relative lg:col-span-2">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#00f0ff]" />
            Active Scraper Engine Daemon
          </h2>

          <div className="space-y-4">
            <div className="bg-black/40 border border-[#00f0ff]/10 p-4 rounded font-mono text-xs space-y-3">
              <div className="flex justify-between border-b border-[#00f0ff]/10 pb-2">
                <span className="text-[#0074d9] uppercase font-bold">CURRENT CORE SOURCES:</span>
                <span className="text-[#00f0ff] font-bold">WAYBACK, ARCHIVE.TODAY, CRAWL, GOOGLE</span>
              </div>
              <div className="flex justify-between border-b border-[#00f0ff]/10 pb-2">
                <span className="text-slate-400 uppercase">ACTIVE CRAWLER WORKERS:</span>
                <span className="text-emerald-400 font-bold">{stats?.currentWorker}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase">ACTIVE EXTRACTION TARGET:</span>
                <span className="text-white font-bold truncate max-w-[200px] sm:max-w-[350px]">
                  {stats?.currentDomainInProcess}
                </span>
              </div>
            </div>

            {/* Queue sizes bar display */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Completed: {stats?.statusCounts.completed}</span>
                <span>Processing: {stats?.statusCounts.processing}</span>
                <span>Pending: {stats?.statusCounts.pending}</span>
                <span>Failed: {stats?.statusCounts.failed}</span>
              </div>
              <div className="h-2 w-full bg-[#02040a] rounded-full flex overflow-hidden">
                <div 
                  className="bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.completed / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
                <div 
                  className="bg-[#00f0ff] transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.processing / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
                <div 
                  className="bg-slate-800 transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.pending / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
                <div 
                  className="bg-rose-600 transition-all duration-500" 
                  style={{ width: `${stats ? (stats.statusCounts.failed / (stats.totalDomains || 1)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server Hardware Diagnostics */}
        <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded p-5 relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-[#00f0ff]" />
            Node Telemetry
          </h2>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-[#00f0ff]/10">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-[#0074d9]" />
                RAM Memory Usage
              </span>
              <span className="text-white font-bold">{stats?.memoryUsage}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#00f0ff]/10">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#0074d9]" />
                Processing Speed
              </span>
              <span className="text-white font-bold">{stats?.domainsPerMinute} Domains/Min</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#0074d9]" />
                Avg Query Resolution
              </span>
              <span className="text-white font-bold">{stats?.avgProcessingTime}</span>
            </div>

            <div className="mt-4 p-2.5 bg-[#0074d9]/10 border border-[#00f0ff]/10 rounded text-[9px] text-[#00f0ff] leading-relaxed">
              Worker pool processes target lists inside highly-optimized Node sandboxes with watchdog triggers protecting against timeouts.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Recoveries Stream */}
      <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded p-5 relative">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
        <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#00f0ff]" />
          Live Recoveries Stream [Latest 10]
        </h2>

        {recent.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[#00f0ff]/15 rounded bg-black/20">
            <HelpCircle className="h-8 w-8 mx-auto text-slate-700 mb-2" />
            <p className="text-xs text-slate-500 font-mono">No domains recovered yet. Submit targets in Single Lookup or Bulk Upload!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#00f0ff]/10 text-slate-400">
                  <th className="py-2.5 uppercase text-[10px]">Domain</th>
                  <th className="py-2.5 uppercase text-[10px]">Company Name</th>
                  <th className="py-2.5 uppercase text-[10px]">E-Mail Addresses</th>
                  <th className="py-2.5 uppercase text-[10px]">Phone numbers</th>
                  <th className="py-2.5 uppercase text-[10px]">Recovery source</th>
                  <th className="py-2.5 uppercase text-[10px] text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00f0ff]/5 text-slate-300">
                {recent.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#0074d9]/5 transition-colors">
                    <td className="py-3 font-bold text-white">{rec.domain}</td>
                    <td className="py-3 text-slate-400 max-w-[120px] truncate">{rec.companyName || 'N/A'}</td>
                    <td className="py-3 text-slate-400">
                      {rec.emails.length > 0 ? (
                        <span className="text-[#00f0ff] font-bold">{rec.emails[0]}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                      {rec.emails.length > 1 && (
                        <span className="text-[10px] ml-1 bg-[#050b14] px-1 py-0.5 rounded text-[#00f0ff] border border-[#00f0ff]/10">
                          +{rec.emails.length - 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-300">
                      {rec.phones.length > 0 ? (
                        <span>{rec.phones[0]}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                      {rec.phones.length > 1 && (
                        <span className="text-[10px] ml-1 bg-[#050b14] px-1 py-0.5 rounded text-slate-400 border border-[#00f0ff]/10">
                          +{rec.phones.length - 1}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] bg-[#050b14] border border-[#00f0ff]/15 px-2 py-0.5 rounded text-slate-300">
                        {rec.source || 'Scrape'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rec.confidence >= 70 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                        rec.confidence >= 40 ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                        'bg-rose-950/40 text-rose-400 border border-rose-900/40'
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

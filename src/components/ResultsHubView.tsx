import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Percent, RefreshCw, FileSpreadsheet, Trash2, Globe, 
  ExternalLink, Mail, Phone, MessageSquare, MapPin, ShieldCheck, 
  Filter, ArrowUpDown, Facebook, Linkedin, Instagram, Calendar, 
  Terminal, Server, Compass, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export const ResultsHubView: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter params
  const [search, setSearch] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected row for full detail inspect
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  const isAdmin = user?.role === 'admin';

  const fetchResults = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get('/api/results', {
        params: {
          search: search || undefined,
          minConfidence: minConfidence || undefined,
          source: sourceFilter || undefined,
          page,
          limit: 12,
        },
      });

      if (response.data && response.data.success) {
        setResults(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch database results');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [search, minConfidence, sourceFilter, page]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid row click details open
    if (!window.confirm('WIPE WARNING: Are you sure you want to permanently delete this contact record from storage?')) return;

    try {
      const response = await axios.delete(`/api/results/${id}`);
      if (response.data && response.data.success) {
        fetchResults();
        if (selectedContact?.id === id) setSelectedContact(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete contact record');
    }
  };

  const handleReprocess = async (domainId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addReprocessState(domainId, true);

    try {
      const response = await axios.post('/api/results/reprocess', { domainId });
      if (response.data && response.data.success) {
        fetchResults();
        alert('Domain extraction pipeline triggered successfully! Data updated.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Reprocessing failed');
    } finally {
      addReprocessState(domainId, false);
    }
  };

  // Keep track of active row reprocess animations
  const [reprocessStates, setReprocessStates] = useState<Record<string, boolean>>({});
  const addReprocessState = (id: string, state: boolean) => {
    setReprocessStates((prev) => ({ ...prev, [id]: state }));
  };

  const { token: authCtxToken } = useAuth();

  const handleExportAll = async () => {
    try {
      setError(null);
      const activeToken = sessionStorage.getItem('token') || localStorage.getItem('token') || authCtxToken;
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const response = await axios.get('/api/results/export', {
        responseType: 'blob',
        headers,
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'RecoveredContacts.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export:', err);
      setError(err.response?.data?.error || err.message || 'Failed to export Excel database');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white uppercase tracking-wider block">
            Recovered Targets Index
          </h1>
          <p className="text-xs text-[#0074d9] font-mono mt-1">
            Browse and inspect detailed profiles, structured social channel coordinates, and export reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            disabled={results.length === 0}
            className="flex items-center gap-2 bg-[#050b14] hover:bg-[#0074d9] border border-[#00f0ff]/25 hover:border-[#00f0ff] text-white px-4 py-2.5 rounded text-xs font-mono font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_12px_rgba(0,240,255,0.08)] disabled:opacity-40 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#00f0ff]" />
            Excel Export
          </button>
          
          <button
            onClick={() => fetchResults(true)}
            disabled={refreshing}
            className="p-2.5 bg-[#050b14] hover:bg-[#0074d9]/10 border border-[#00f0ff]/15 rounded text-slate-400 hover:text-[#00f0ff] transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Target, Email, Phone..."
            className="block w-full pl-9 pr-3 py-2 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
          />
        </div>

        {/* Confidence Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Percent className="h-4 w-4" />
          </div>
          <select
            value={minConfidence}
            onChange={(e) => { setMinConfidence(Number(e.target.value)); setPage(1); }}
            className="block w-full pl-9 pr-3 py-2 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all appearance-none cursor-pointer font-mono"
          >
            <option value={0}>Any Confidence Rating</option>
            <option value={40}>&gt; 40% Confidence</option>
            <option value={60}>&gt; 60% Confidence</option>
            <option value={80}>&gt; 80% Confidence</option>
          </select>
        </div>

        {/* Scraper Engine Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Filter className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            placeholder="Filter Source: Wayback, Live..."
            className="block w-full pl-9 pr-3 py-2 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
          />
        </div>

        {/* Reset filters button */}
        <button
          onClick={() => { setSearch(''); setMinConfidence(0); setSourceFilter(''); setPage(1); }}
          className="text-xs text-[#00f0ff] hover:text-[#00f0ff]/80 font-bold transition-colors font-mono text-left px-2 uppercase tracking-widest cursor-pointer"
        >
          Clear Active Filters
        </button>
      </div>

      {/* Grid containing Database Table & Inspect Dialog */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Table layout (col-span-2) */}
        <div className="xl:col-span-2 bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#00f0ff]/10 text-left font-mono">
              <thead className="bg-[#02040a]/80">
                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-4">Domain / Company</th>
                  <th className="py-4 px-4">Recovered details</th>
                  <th className="py-4 px-4 text-center">Confidence</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00f0ff]/5 text-xs text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[#00f0ff]">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#00f0ff] mx-auto" />
                      <span className="text-xs block mt-2 font-mono uppercase tracking-widest animate-pulse">Accessing schema nodes...</span>
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-500 italic">
                      <Globe className="h-10 w-10 mx-auto mb-2 opacity-30 text-slate-600" />
                      No completed target profiles matches query parameters.
                    </td>
                  </tr>
                ) : (
                  results.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedContact(item)}
                      className={`hover:bg-[#0074d9]/5 transition-colors cursor-pointer ${selectedContact?.id === item.id ? 'bg-[#0074d9]/10' : ''}`}
                    >
                      {/* Name / domain */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white font-mono text-sm">{item.domain?.domain || 'N/A'}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">{item.companyName || 'Unknown Entity'}</div>
                      </td>

                      {/* Summary detail icons */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-3 text-slate-500 text-[11px]">
                          {item.emails.length > 0 && (
                            <div className="flex items-center gap-1 bg-black/40 border border-[#00f0ff]/10 px-2 py-0.5 rounded">
                              <Mail className="h-3.5 w-3.5 text-[#00f0ff]" />
                              <span className="font-bold text-[#00f0ff]">{item.emails.length}</span>
                            </div>
                          )}
                          {item.phones.length > 0 && (
                            <div className="flex items-center gap-1 bg-black/40 border border-[#00f0ff]/10 px-2 py-0.5 rounded">
                              <Phone className="h-3.5 w-3.5 text-[#00f0ff]" />
                              <span className="font-bold text-slate-400">{item.phones.length}</span>
                            </div>
                          )}
                          {item.whatsappNumbers && item.whatsappNumbers.length > 0 && (
                            <div className="flex items-center gap-1 bg-black/40 border border-[#00f0ff]/10 px-2 py-0.5 rounded">
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="font-bold text-slate-400">{item.whatsappNumbers.length}</span>
                            </div>
                          )}
                          {item.address && (
                            <div className="flex items-center gap-1 bg-black/40 border border-[#00f0ff]/10 px-1.5 py-0.5 rounded">
                              <MapPin className="h-3.5 w-3.5 text-[#00f0ff]" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Confidence and engine */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border ${
                          item.confidence >= 70 ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40' :
                          item.confidence >= 40 ? 'bg-amber-950/30 text-amber-400 border-amber-900/40' :
                          'bg-rose-950/30 text-rose-400 border-rose-900/40'
                        }`}>
                          {item.confidence}%
                        </span>
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 truncate max-w-[120px]" title={item.source}>
                          {item.source ? item.source.split(',')[0] : 'Scraper'}
                        </div>
                      </td>

                      {/* Quick triggers */}
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => handleReprocess(item.domainId, e)}
                            disabled={reprocessStates[item.domainId]}
                            title="Trigger Recovery Pipeline"
                            className="p-1.5 bg-black hover:bg-[#0074d9]/10 rounded text-slate-500 hover:text-[#00f0ff] border border-[#00f0ff]/10 hover:border-[#00f0ff]/30 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${reprocessStates[item.domainId] ? 'animate-spin text-[#00f0ff]' : ''}`} />
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              title="Delete Record"
                              className="p-1.5 bg-black hover:bg-rose-950/30 rounded text-slate-500 hover:text-rose-400 border border-[#00f0ff]/10 hover:border-rose-900/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="bg-[#02040a]/40 border-t border-[#00f0ff]/10 p-4 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="bg-[#050b14] hover:bg-[#0074d9]/10 border border-[#00f0ff]/15 px-3 py-1 text-slate-300 disabled:opacity-40 cursor-pointer rounded text-xs"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="bg-[#050b14] hover:bg-[#0074d9]/10 border border-[#00f0ff]/15 px-3 py-1 text-slate-300 disabled:opacity-40 cursor-pointer rounded text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected row details view side panel */}
        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            {!selectedContact ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#050b14]/25 border border-[#00f0ff]/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[420px] text-slate-500 text-center font-mono relative"
              >
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f0ff]/10" />
                <ArrowUpDown className="h-10 w-10 mb-2 opacity-35 text-[#0074d9] animate-bounce" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inspect Profile</h3>
                <p className="text-[10px] text-slate-500 max-w-[200px] mt-1 leading-relaxed">
                  Select any target domain on the left to review nested contact maps, social links, and recovery metadata.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-5 space-y-5 shadow-[0_0_20px_rgba(0,240,255,0.06)] relative font-mono"
              >
                {/* Neon Corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00f0ff]" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#00f0ff]" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#00f0ff]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00f0ff]" />

                {/* Header info */}
                <div className="border-b border-[#00f0ff]/10 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider block">
                      {selectedContact.companyName || 'Unknown Entity'}
                    </h2>
                    <span className="text-[10px] text-[#00f0ff] bg-[#0074d9]/15 border border-[#00f0ff]/30 px-2 py-0.5 rounded font-bold shrink-0">
                      {selectedContact.confidence}% MATCH
                    </span>
                  </div>
                  <a 
                    href={selectedContact.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#00f0ff] text-xs flex items-center gap-1 mt-1.5 hover:underline font-mono"
                  >
                    {selectedContact.domain?.domain}
                    <ExternalLink className="h-3 w-3 text-[#00f0ff]" />
                  </a>
                </div>

                {/* Scraped details list */}
                <div className="space-y-4 text-xs">
                  {/* Phone */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#00f0ff]" />
                      Phone coordinates
                    </span>
                    {selectedContact.phones.length === 0 ? (
                      <div className="text-slate-600 italic text-[10px]">No phone registries found</div>
                    ) : (
                      <div className="space-y-1">
                        {selectedContact.phones.map((p: string, i: number) => (
                          <div key={i} className="text-slate-300 font-bold bg-black/30 border border-[#00f0ff]/10 px-2 py-1 rounded text-[11px] font-mono">
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Emails */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                      <Mail className="h-3.5 w-3.5 text-[#00f0ff]" />
                      E-Mail coordinates
                    </span>
                    {selectedContact.emails.length === 0 ? (
                      <div className="text-slate-600 italic text-[10px]">No email structures matching</div>
                    ) : (
                      <div className="space-y-1">
                        {selectedContact.emails.map((e: string, i: number) => (
                          <div key={i} className="text-slate-300 font-bold bg-black/30 border border-[#00f0ff]/10 px-2 py-1 rounded text-[11px] font-mono break-all">
                            {e}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-[#00f0ff]" />
                      WhatsApp nodes
                    </span>
                    {!selectedContact.whatsappNumbers || selectedContact.whatsappNumbers.length === 0 ? (
                      <div className="text-slate-600 italic text-[10px]">No WhatsApp channels matched</div>
                    ) : (
                      <div className="space-y-1">
                        {selectedContact.whatsappNumbers.map((w: string, i: number) => (
                          <div key={i} className="text-slate-300 font-bold bg-black/30 border border-[#00f0ff]/10 px-2 py-1 rounded text-[11px] font-mono">
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Physical Location */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5 mb-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#00f0ff]" />
                      Physical Headquarters
                    </span>
                    <div className="text-slate-300 bg-black/30 border border-[#00f0ff]/10 px-2 py-1.5 rounded text-[11px] leading-relaxed">
                      {selectedContact.address || <span className="text-slate-600 italic text-[10px]">No physical address found</span>}
                    </div>
                  </div>

                  {/* Social links */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1.5">
                      Social Graph indexes
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      {selectedContact.socialLinks?.facebook ? (
                        <a 
                          href={selectedContact.socialLinks.facebook} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-[#050b14] border border-[#00f0ff]/10 hover:border-[#00f0ff] rounded text-slate-400 hover:text-white flex flex-col items-center gap-1"
                        >
                          <Facebook className="h-3.5 w-3.5 text-[#00f0ff]" />
                          <span>Facebook</span>
                        </a>
                      ) : (
                        <div className="p-1.5 bg-black/40 border border-[#00f0ff]/5 text-slate-700 rounded flex flex-col items-center gap-1 select-none">
                          <Facebook className="h-3.5 w-3.5 opacity-20" />
                          <span>Locked</span>
                        </div>
                      )}

                      {selectedContact.socialLinks?.linkedin ? (
                        <a 
                          href={selectedContact.socialLinks.linkedin} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-[#050b14] border border-[#00f0ff]/10 hover:border-[#00f0ff] rounded text-slate-400 hover:text-white flex flex-col items-center gap-1"
                        >
                          <Linkedin className="h-3.5 w-3.5 text-[#00f0ff]" />
                          <span>LinkedIn</span>
                        </a>
                      ) : (
                        <div className="p-1.5 bg-black/40 border border-[#00f0ff]/5 text-slate-700 rounded flex flex-col items-center gap-1 select-none">
                          <Linkedin className="h-3.5 w-3.5 opacity-20" />
                          <span>Locked</span>
                        </div>
                      )}

                      {selectedContact.socialLinks?.instagram ? (
                        <a 
                          href={selectedContact.socialLinks.instagram} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-[#050b14] border border-[#00f0ff]/10 hover:border-[#00f0ff] rounded text-slate-400 hover:text-white flex flex-col items-center gap-1"
                        >
                          <Instagram className="h-3.5 w-3.5 text-pink-500" />
                          <span>Instagram</span>
                        </a>
                      ) : (
                        <div className="p-1.5 bg-black/40 border border-[#00f0ff]/5 text-slate-700 rounded flex flex-col items-center gap-1 select-none">
                          <Instagram className="h-3.5 w-3.5 opacity-20" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata source chain */}
                  <div className="pt-3 border-t border-[#00f0ff]/10 space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="flex items-center gap-1"><Server className="h-3 w-3" /> Source Chain:</span>
                      <span className="text-[#00f0ff] font-bold truncate max-w-[150px]" title={selectedContact.source}>
                        {selectedContact.source || 'Live Scraping'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Recovered:</span>
                      <span className="text-slate-400">
                        {selectedContact.createdAt ? new Date(selectedContact.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close inspection button */}
                <button
                  onClick={() => setSelectedContact(null)}
                  className="w-full bg-[#050b14] hover:bg-[#0074d9] hover:text-white border border-[#00f0ff]/15 hover:border-[#00f0ff] text-slate-300 font-bold py-2.5 rounded text-xs transition-all duration-300 cursor-pointer uppercase tracking-widest font-mono"
                >
                  Deselect Node
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

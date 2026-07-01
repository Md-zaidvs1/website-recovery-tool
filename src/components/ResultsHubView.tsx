import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Percent, RefreshCw, FileSpreadsheet, Trash2, Globe, 
  ExternalLink, Mail, Phone, MessageSquare, MapPin, ShieldCheck, 
  Filter, ArrowUpDown, Facebook, Linkedin, Instagram, Calendar, 
  Server, AlertTriangle, CheckCircle2, ChevronRight 
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
  const [totalRecords, setTotalRecords] = useState(0);

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
          limit: 10,
        },
      });

      if (response.data && response.data.success) {
        setResults(response.data.data);
        setTotalPages(response.data.pagination.pages);
        setTotalRecords(response.data.pagination.total);
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
    if (!window.confirm('Are you sure you want to permanently delete this contact record?')) return;

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
        alert('Domain extraction pipeline triggered successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Reprocessing failed');
    } finally {
      addReprocessState(domainId, false);
    }
  };

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
          <h1 className="text-[24px] font-bold text-[#111827]">
            Results Database
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Browse and inspect completed profiles ({totalRecords} total records)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            disabled={results.length === 0}
            className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Database</span>
          </button>
          
          <button
            onClick={() => fetchResults(true)}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-[#374151] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#6B7280] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Target, Email, Phone..."
            className="block w-full pl-9 pr-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[13px] transition-colors"
          />
        </div>

        {/* Confidence Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
            <Percent className="h-4 w-4" />
          </div>
          <select
            value={minConfidence}
            onChange={(e) => { setMinConfidence(Number(e.target.value)); setPage(1); }}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[13px] transition-colors cursor-pointer"
          >
            <option value={0}>Any Confidence Rating</option>
            <option value={40}>&gt; 40% Confidence</option>
            <option value={60}>&gt; 60% Confidence</option>
            <option value={80}>&gt; 80% Confidence</option>
          </select>
        </div>

        {/* Scraper Engine Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
            <Filter className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            placeholder="Filter Source (e.g. Wayback)..."
            className="block w-full pl-9 pr-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[13px] transition-colors"
          />
        </div>

        {/* Reset filters */}
        <button
          onClick={() => { setSearch(''); setMinConfidence(0); setSourceFilter(''); setPage(1); }}
          className="text-[13px] text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors text-left px-2 cursor-pointer"
        >
          Clear Filters
        </button>
      </div>

      {/* Grid: Database Table & Side Inspection Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Table layout (col-span-2) */}
        <div className="xl:col-span-2 bg-white border border-[#E5E7EB] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280] text-[12px] uppercase font-semibold border-b border-[#E5E7EB]">
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Emails</th>
                  <th className="py-3 px-4">Phones</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] text-[#374151]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#6B7280]">
                      <div className="animate-spin rounded-full h-7 w-7 border-4 border-t-transparent border-[#2563EB] mx-auto" />
                      <span className="text-[13px] block mt-2 font-medium">Fetching records...</span>
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#6B7280] italic">
                      <Globe className="h-8 w-8 mx-auto mb-2 text-[#9CA3AF]" />
                      No completed profiles found matching query filters.
                    </td>
                  </tr>
                ) : (
                  results.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedContact(item)}
                      className={`hover:bg-[#F9FAFB] transition-colors cursor-pointer ${selectedContact?.id === item.id ? 'bg-[#EFF6FF]' : ''}`}
                    >
                      {/* Domain */}
                      <td className="py-3.5 px-4 font-semibold text-[#111827]">
                        {item.domain?.domain || 'N/A'}
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4 text-[#6B7280] truncate max-w-[120px]">
                        {item.companyName || '—'}
                      </td>

                      {/* Emails */}
                      <td className="py-3.5 px-4">
                        {item.emails.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[#2563EB] font-medium truncate max-w-[110px] block">{item.emails[0]}</span>
                            {item.emails.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 text-[#374151] rounded font-medium shrink-0">
                                +{item.emails.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Phones */}
                      <td className="py-3.5 px-4">
                        {item.phones.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[110px] block">{item.phones[0]}</span>
                            {item.phones.length > 1 && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 text-[#374151] rounded font-medium shrink-0">
                                +{item.phones.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                          item.domain?.status === 'completed' ? 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]' :
                          item.domain?.status === 'processing' ? 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]' :
                          'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
                        }`}>
                          {item.domain?.status || 'completed'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-center text-[#6B7280] text-[12px] whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end items-center gap-2.5">
                          <button
                            onClick={() => setSelectedContact(item)}
                            className="text-xs text-[#2563EB] hover:underline font-medium cursor-pointer"
                          >
                            View
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              className="text-xs text-[#DC2626] hover:underline font-medium cursor-pointer"
                            >
                              Delete
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
            <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] p-4 flex justify-between items-center text-[13px] font-medium text-[#6B7280]">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 text-[#374151] disabled:opacity-50 cursor-pointer rounded-md text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-1.5 text-[#374151] disabled:opacity-50 cursor-pointer rounded-md text-xs font-medium"
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
                className="bg-white border border-[#E5E7EB] rounded-lg p-6 flex flex-col items-center justify-center min-h-[420px] text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <ArrowUpDown className="h-8 w-8 mb-2 text-[#2563EB]" />
                <h3 className="text-[14px] font-semibold text-[#111827]">Inspect Profile</h3>
                <p className="text-[12px] text-[#6B7280] max-w-[200px] mt-1 leading-relaxed">
                  Select any completed target row in the database table to review detailed contact fields.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative"
              >
                {/* Header details */}
                <div className="border-b border-[#F3F4F6] pb-4">
                  <div className="flex justify-between items-start gap-3">
                    <h2 className="text-[16px] font-bold text-[#111827] leading-tight">
                      {selectedContact.companyName || '—'}
                    </h2>
                    <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-0.5 rounded-full shrink-0">
                      {selectedContact.confidence}% MATCH
                    </span>
                  </div>
                  <a 
                    href={selectedContact.websiteUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#2563EB] text-[13px] flex items-center gap-1 mt-1.5 hover:underline"
                  >
                    <span>{selectedContact.domain?.domain}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[#2563EB]" />
                  </a>
                </div>

                {/* Structured Fields */}
                <div className="space-y-4 text-[13px]">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#6B7280] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#6B7280]" />
                      Phones
                    </span>
                    {selectedContact.phones.length === 0 ? (
                      <div className="text-[#9CA3AF]">—</div>
                    ) : (
                      <div className="space-y-1">
                        {selectedContact.phones.map((p: string, i: number) => (
                          <div key={i} className="text-[#374151] font-medium bg-slate-50 border border-[#E5E7EB] px-2.5 py-1 rounded">
                            {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Emails */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#6B7280] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
                      Emails
                    </span>
                    {selectedContact.emails.length === 0 ? (
                      <div className="text-[#9CA3AF]">—</div>
                    ) : (
                      <div className="space-y-1">
                        {selectedContact.emails.map((e: string, i: number) => (
                          <div key={i} className="text-[#2563EB] font-medium bg-slate-50 border border-[#E5E7EB] px-2.5 py-1 rounded break-all">
                            {e}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#6B7280] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-[#16A34A]" />
                      WhatsApp
                    </span>
                    {!selectedContact.whatsappNumbers || selectedContact.whatsappNumbers.length === 0 ? (
                      <div className="text-[#9CA3AF]">—</div>
                    ) : (
                      <div className="space-y-1">
                        {selectedContact.whatsappNumbers.map((w: string, i: number) => (
                          <div key={i} className="text-[#16A34A] font-medium bg-slate-50 border border-[#E5E7EB] px-2.5 py-1 rounded">
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#6B7280] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#6B7280]" />
                      Address
                    </span>
                    <div className="text-[#374151] bg-slate-50 border border-[#E5E7EB] px-2.5 py-1.5 rounded leading-relaxed">
                      {selectedContact.address || <span className="text-[#9CA3AF]">—</span>}
                    </div>
                  </div>

                  {/* Social Graph */}
                  <div className="space-y-2">
                    <span className="text-[12px] text-[#6B7280] uppercase font-semibold tracking-wider">
                      Social Coordinates
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
                      {selectedContact.socialLinks?.facebook ? (
                        <a 
                          href={selectedContact.socialLinks.facebook} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-slate-50 border border-[#E5E7EB] rounded-md text-[#2563EB] hover:bg-slate-100 flex flex-col items-center gap-1 transition-colors"
                        >
                          <Facebook className="h-4 w-4 text-[#2563EB]" />
                          <span>Facebook</span>
                        </a>
                      ) : (
                        <div className="p-1.5 bg-slate-50 border border-slate-100 text-[#9CA3AF] rounded-md flex flex-col items-center gap-1 select-none">
                          <Facebook className="h-4 w-4 opacity-40" />
                          <span>—</span>
                        </div>
                      )}

                      {selectedContact.socialLinks?.linkedin ? (
                        <a 
                          href={selectedContact.socialLinks.linkedin} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-slate-50 border border-[#E5E7EB] rounded-md text-[#2563EB] hover:bg-slate-100 flex flex-col items-center gap-1 transition-colors"
                        >
                          <Linkedin className="h-4 w-4 text-[#2563EB]" />
                          <span>LinkedIn</span>
                        </a>
                      ) : (
                        <div className="p-1.5 bg-slate-50 border border-slate-100 text-[#9CA3AF] rounded-md flex flex-col items-center gap-1 select-none">
                          <Linkedin className="h-4 w-4 opacity-40" />
                          <span>—</span>
                        </div>
                      )}

                      {selectedContact.socialLinks?.instagram ? (
                        <a 
                          href={selectedContact.socialLinks.instagram} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-slate-50 border border-[#E5E7EB] rounded-md text-[#2563EB] hover:bg-slate-100 flex flex-col items-center gap-1 transition-colors"
                        >
                          <Instagram className="h-4 w-4 text-[#2563EB]" />
                          <span>Instagram</span>
                        </a>
                      ) : (
                        <div className="p-1.5 bg-slate-50 border border-slate-100 text-[#9CA3AF] rounded-md flex flex-col items-center gap-1 select-none">
                          <Instagram className="h-4 w-4 opacity-40" />
                          <span>—</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata source chain */}
                  <div className="pt-3 border-t border-[#F3F4F6] space-y-2 text-[11px] text-[#6B7280]">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1"><Server className="h-3 w-3" /> Sources:</span>
                      <span className="font-semibold text-[#111827] truncate max-w-[150px]" title={selectedContact.source}>
                        {selectedContact.source || 'Scraper Engine'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created:</span>
                      <span className="font-semibold text-[#374151]">
                        {selectedContact.createdAt ? new Date(selectedContact.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close inspection button */}
                <button
                  onClick={() => setSelectedContact(null)}
                  className="w-full bg-white hover:bg-slate-50 border border-[#E5E7EB] text-[#374151] font-semibold py-2 rounded-md text-[13px] transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

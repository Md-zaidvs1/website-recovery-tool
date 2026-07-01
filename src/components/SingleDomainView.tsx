import React, { useState } from 'react';
import axios from 'axios';
import { 
  Search, Globe, Phone, Mail, MapPin, ExternalLink, ShieldCheck, 
  AlertTriangle, MessageSquare, Linkedin, Facebook, Instagram, Terminal,
  Cpu, Server, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RecoveredContact } from '../types';

export const SingleDomainView: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecoveredContact | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setCurrentStatus('processing');

    addLog(`Initiating lookup process for: ${domain}`);
    addLog(`Connecting to resolver gateway...`);

    // Simulated logs to show active background operations
    const logIntervals = [
      setTimeout(() => addLog('Resolving domain nameservers and routing endpoints...'), 400),
      setTimeout(() => addLog('Requesting live page response stream via Cheerio...'), 1200),
      setTimeout(() => addLog('Parsing HTML structured tags and corporate profiles...'), 2400),
      setTimeout(() => addLog('Scanning contact anchor text and telephone patterns...'), 3600),
      setTimeout(() => addLog('Extracting social handles (Facebook, LinkedIn, Instagram)...'), 4800),
      setTimeout(() => addLog('Compiling final extracted dataset and confidence level...'), 6000),
    ];

    try {
      const storedTimeout = localStorage.getItem('p2t_timeout') || '30';
      const storedWayback = localStorage.getItem('p2t_wayback') !== 'false';
      const storedGemini = localStorage.getItem('p2t_gemini') !== 'false';
      const storedMode = localStorage.getItem('p2t_mode') || 'balanced';

      const response = await axios.post('/api/domains/process', { 
         domain,
         timeout: parseInt(storedTimeout, 10),
         waybackFallback: storedWayback,
         geminiGrounding: storedGemini,
         mode: storedMode
      });
      
      logIntervals.forEach(clearTimeout);

      if (response.data && response.data.success) {
        if (response.data.logs && response.data.logs.length > 0) {
          setLogs([]);
          let currentLogIndex = 0;
          const playLogs = () => {
            if (currentLogIndex < response.data.logs.length) {
              addLog(response.data.logs[currentLogIndex]);
              currentLogIndex++;
              setTimeout(playLogs, 250);
            } else {
              addLog(`Extraction successfully completed! Record stored.`);
              setResult(response.data.contact);
              setCurrentStatus('completed');
            }
          };
          playLogs();
        } else {
          addLog(`Extraction successfully completed! Record stored.`);
          setResult(response.data.contact);
          setCurrentStatus('completed');
        }
      } else {
        throw new Error(response.data?.error || 'Extraction failed with no detailed response.');
      }
    } catch (err: any) {
      logIntervals.forEach(clearTimeout);
      const errMsg = err.response?.data?.error || err.message || 'Scraping request failed';
      setError(errMsg);
      addLog(`Error: Extraction failed - ${errMsg}`);
      setCurrentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827]">
            Single Domain Lookup
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Recover contact details, public registers, and socials in real-time
          </p>
        </div>

        {/* Status indicator badge */}
        <div>
          {currentStatus === 'processing' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold bg-[#EFF6FF] text-[#2563EB] rounded-full border border-[#DBEAFE]">
              <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
              Processing
            </span>
          )}
          {currentStatus === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold bg-[#DCFCE7] text-[#16A34A] rounded-full border border-[#BBF7D0]">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              Completed
            </span>
          )}
          {currentStatus === 'failed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold bg-[#FEE2E2] text-[#DC2626] rounded-full border border-[#FCA5A5]">
              <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
              Failed
            </span>
          )}
          {currentStatus === 'idle' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold bg-slate-100 text-[#6B7280] rounded-full border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-[#6B7280]" />
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Input Form Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
              Enter Domain
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Globe className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Enter domain (e.g. stripe.com or digitalocean.com)"
                  className="block w-full pl-9 pr-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[14px] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)] shrink-0 h-[38px]"
              >
                <Search className="h-4 w-4" />
                <span>{loading ? 'Processing...' : 'Start Recovery'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Grid Layout: Result Fields + Logger Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Logs Panel */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[420px]">
          <div>
            <div className="flex items-center gap-2 border-b border-[#F3F4F6] pb-3 mb-3">
              <Terminal className="h-4 w-4 text-[#2563EB]" />
              <h3 className="text-[14px] font-bold text-[#111827]">Live Extraction Logs</h3>
            </div>
            
            {logs.length === 0 ? (
              <div className="text-[#6B7280] text-[13px] py-16 text-center italic">
                Awaiting lookup request to initialize crawler logs...
              </div>
            ) : (
              <div className="space-y-2 font-mono text-[11px] max-h-[300px] overflow-y-auto pr-2 text-[#4B5563]">
                {logs.map((log, index) => {
                  let logClass = 'text-[#4B5563]';
                  if (log.includes('Error:') || log.includes('ERR:')) {
                    logClass = 'text-[#DC2626] font-semibold';
                  } else if (log.includes('complete') || log.includes('success') || log.includes('Record stored')) {
                    logClass = 'text-[#16A34A] font-semibold';
                  } else if (log.includes('Initiating') || log.includes('Resolving')) {
                    logClass = 'text-[#2563EB] font-medium';
                  }
                  return (
                    <div key={index} className={logClass}>
                      <span className="text-[#9CA3AF] mr-1.5">›</span>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {loading && (
            <div className="flex items-center justify-center py-2 gap-2 text-[12px] text-[#2563EB] font-medium border-t border-[#F3F4F6] mt-2">
              <span className="h-3.5 w-3.5 border-2 border-t-transparent border-[#2563EB] rounded-full animate-spin" />
              CRAWLER CONCURRENT RESOLUTION ACTIVE
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-lg border border-[#FCA5A5] p-6 flex flex-col items-center justify-center h-[420px] text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <AlertTriangle className="h-10 w-10 text-[#DC2626] mb-3 animate-pulse" />
                <h3 className="font-bold text-[#111827] text-[16px] mb-2">Extraction Session Failed</h3>
                <p className="text-[14px] text-[#DC2626] max-w-md leading-relaxed">{error}</p>
              </motion.div>
            )}

            {!result && !error && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-lg border border-[#D1D5DB] border-dashed p-6 flex flex-col items-center justify-center h-[420px] text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <Zap className="h-10 w-10 mb-3 text-[#2563EB] opacity-60" />
                <h3 className="text-[14px] font-semibold text-[#111827]">Awaiting Domain Target</h3>
                <p className="text-[13px] text-[#6B7280] max-w-sm leading-relaxed mt-1">
                  Submit a valid domain above. The scraping engine will query active pages and snapshot indices to fetch contact cards.
                </p>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-lg border border-[#E5E7EB] p-6 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                {/* Result Header */}
                <div className="flex justify-between items-start border-b border-[#F3F4F6] pb-4">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#111827]">{result.companyName || '—'}</h2>
                    <a 
                      href={result.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#2563EB] text-[13px] flex items-center gap-1 mt-1 hover:underline"
                    >
                      <span>{result.websiteUrl}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[12px] font-semibold bg-[#EFF6FF] text-[#2563EB] rounded-full border border-[#DBEAFE]">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" />
                      Accuracy: {result.confidence}%
                    </span>
                    <span className="text-[11px] text-[#6B7280] mt-1">
                      Via {result.source || 'Scraper'}
                    </span>
                  </div>
                </div>

                {/* Grid Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company row */}
                  <div className="space-y-1">
                    <span className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Company</span>
                    <div className="text-[14px] text-[#111827] font-medium">
                      {result.companyName || <span className="text-[#9CA3AF]">—</span>}
                    </div>
                  </div>

                  {/* Emails row */}
                  <div className="space-y-1">
                    <span className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Emails</span>
                    {result.emails.length === 0 ? (
                      <div className="text-[14px] text-[#9CA3AF]">—</div>
                    ) : (
                      <div className="space-y-1 text-[14px] text-[#111827] font-medium">
                        {result.emails.map((email, i) => (
                          <div key={i} className="text-[#2563EB] break-all">{email}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phones row */}
                  <div className="space-y-1">
                    <span className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Phones</span>
                    {result.phones.length === 0 ? (
                      <div className="text-[14px] text-[#9CA3AF]">—</div>
                    ) : (
                      <div className="space-y-1 text-[14px] text-[#111827] font-medium">
                        {result.phones.map((phone, i) => (
                          <div key={i}>{phone}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp row */}
                  <div className="space-y-1">
                    <span className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">WhatsApp</span>
                    {result.whatsappNumbers.length === 0 ? (
                      <div className="text-[14px] text-[#9CA3AF]">—</div>
                    ) : (
                      <div className="space-y-1 text-[14px] text-[#111827] font-medium">
                        {result.whatsappNumbers.map((num, i) => (
                          <div key={i} className="text-[#16A34A]">{num}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Address row */}
                  <div className="space-y-1 md:col-span-2">
                    <span className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Address</span>
                    <div className="text-[14px] text-[#111827] font-medium leading-relaxed">
                      {result.address || <span className="text-[#9CA3AF]">—</span>}
                    </div>
                  </div>

                  {/* Social Links row */}
                  <div className="space-y-2 md:col-span-2 pt-2 border-t border-[#F3F4F6]">
                    <span className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">Social Links</span>
                    <div className="flex flex-wrap gap-4 text-[13px] font-medium">
                      {result.socialLinks.facebook ? (
                        <a href={result.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#2563EB] hover:underline">
                          <Facebook className="h-4 w-4" />
                          Facebook
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#9CA3AF]">
                          <Facebook className="h-4 w-4 text-slate-300" />
                          —
                        </span>
                      )}
                      {result.socialLinks.linkedin ? (
                        <a href={result.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#2563EB] hover:underline">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#9CA3AF]">
                          <Linkedin className="h-4 w-4 text-slate-300" />
                          —
                        </span>
                      )}
                      {result.socialLinks.instagram ? (
                        <a href={result.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#2563EB] hover:underline">
                          <Instagram className="h-4 w-4" />
                          Instagram
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#9CA3AF]">
                          <Instagram className="h-4 w-4 text-slate-300" />
                          —
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance telemetry stats */}
                {(result.recoveryTimeMs !== undefined || result.snapshotsVisited !== undefined || result.pagesCrawled !== undefined) && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-[#E5E7EB] grid grid-cols-3 gap-4 text-center text-[12px]">
                    <div>
                      <div className="text-[#6B7280] uppercase tracking-wider font-semibold">RECOVERY TIME</div>
                      <div className="text-[14px] text-[#111827] font-bold mt-0.5">
                        {result.recoveryTimeMs ? `${(result.recoveryTimeMs / 1000).toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6B7280] uppercase tracking-wider font-semibold">SNAPSHOTS</div>
                      <div className="text-[14px] text-[#111827] font-bold mt-0.5">
                        {result.snapshotsVisited ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6B7280] uppercase tracking-wider font-semibold">CRAWLED PAGES</div>
                      <div className="text-[14px] text-[#111827] font-bold mt-0.5">
                        {result.pagesCrawled ?? 0}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

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

    addLog(`Initiating lookup protocol for: ${domain}`);
    addLog(`Resolving connection schema nodes...`);

    // Simulate logs for real-time scraper feedback
    const logIntervals = [
      setTimeout(() => addLog('Normalizing URL schema to safe TLS protocol...'), 500),
      setTimeout(() => addLog('Requesting page resource stream via Cheerio core...'), 1500),
      setTimeout(() => addLog('Analyzing page content schema markup and OpenGraph properties...'), 3000),
      setTimeout(() => addLog('Executing telephone and structured email regex matching...'), 4500),
      setTimeout(() => addLog('Detecting social anchors (Facebook, LinkedIn, Instagram)...'), 6000),
      setTimeout(() => addLog('Merging scraped subpages and computing accuracy confidence score...'), 7500),
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
      
      // Clear simulation logs
      logIntervals.forEach(clearTimeout);

      if (response.data && response.data.success) {
        if (response.data.logs && response.data.logs.length > 0) {
          // Playback logs in sequence to feel like a real terminal
          setLogs([]);
          let currentLogIndex = 0;
          const playLogs = () => {
            if (currentLogIndex < response.data.logs.length) {
              addLog(response.data.logs[currentLogIndex]);
              currentLogIndex++;
              setTimeout(playLogs, 300);
            } else {
              addLog(`Extraction complete! Saved under Record ID: ${response.data.domain.id}`);
              setResult(response.data.contact);
            }
          };
          playLogs();
        } else {
          addLog(`Extraction complete! Saved under Record ID: ${response.data.domain.id}`);
          setResult(response.data.contact);
        }
      }
    } catch (err: any) {
      logIntervals.forEach(clearTimeout);
      const errMsg = err.response?.data?.error || err.message || 'Scraping failed';
      setError(errMsg);
      addLog(`ERR: Extraction failed - ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold font-sans text-white uppercase tracking-wider block">
          Single Lookup Node
        </h1>
        <p className="text-xs text-[#0074d9] font-mono mt-1">
          Scrape and extract public profile listings, emails, phones, and socials in real-time.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
        
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3 font-mono">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Globe className="h-5 w-5" />
            </div>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter domain (e.g. stripe.com or digitalocean.com)"
              className="block w-full pl-10 pr-3 py-3 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[#0074d9]/25 hover:bg-[#0074d9] border border-[#00f0ff]/35 hover:border-[#00f0ff] font-bold py-3 px-6 rounded text-xs transition-all duration-300 shadow-[0_0_12px_rgba(0,240,255,0.1)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] disabled:opacity-40 cursor-pointer uppercase tracking-widest text-white shrink-0 font-mono"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Crawling Domain...' : 'Initiate Recovery'}
          </button>
        </form>
      </div>

      {/* Main split display: Logs terminal and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Terminal logs panel */}
        <div className="lg:col-span-1 bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 flex flex-col justify-between min-h-[350px] relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
          
          <div>
            <div className="flex items-center gap-2 border-b border-[#00f0ff]/10 pb-3 mb-3 font-mono">
              <Terminal className="h-4 w-4 text-[#00f0ff] animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Scraper Stream Console</span>
            </div>
            
            {logs.length === 0 ? (
              <div className="text-slate-600 text-xs font-mono py-12 text-center italic">
                Awaiting active scraper pipeline connection...
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[10px] leading-relaxed max-h-[260px] overflow-y-auto pr-2 text-slate-400">
                {logs.map((log, index) => {
                  let logClass = 'text-slate-400';
                  if (log.includes('ERR:')) {
                    logClass = 'text-rose-500 font-bold';
                  } else if (log.includes('complete')) {
                    logClass = 'text-emerald-400 font-bold';
                  } else if (log.includes('Successfully') || log.includes('Initiating')) {
                    logClass = 'text-[#00f0ff]';
                  }
                  return (
                    <div key={index} className={logClass}>
                      <span className="text-[#0074d9] mr-1.5">&gt;&gt;</span>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {loading && (
            <div className="flex items-center justify-center py-2 gap-2 text-xs text-[#00f0ff] font-mono uppercase tracking-widest border-t border-[#00f0ff]/10 mt-2">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent border-[#00f0ff] animate-spin" />
              RESOLVING QUERY...
            </div>
          )}
        </div>

        {/* Results Card Display */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-rose-950/20 border border-rose-600/35 rounded-lg p-6 flex flex-col items-center justify-center min-h-[350px] text-center font-mono relative"
              >
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-rose-500" />
                <AlertTriangle className="h-10 w-10 text-rose-500 mb-3 animate-pulse" />
                <h3 className="font-bold text-white uppercase tracking-wider mb-2">Extraction Session Failed</h3>
                <p className="text-xs text-rose-300 max-w-md leading-relaxed">{error}</p>
              </motion.div>
            )}

            {!result && !error && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#050b14]/25 border border-[#00f0ff]/10 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[350px] text-slate-500 text-center font-mono relative"
              >
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f0ff]/10" />
                <Zap className="h-10 w-10 mb-3 opacity-30 text-[#0074d9]" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting active node</h3>
                <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed mt-1">
                  Submit a valid target hostname above. The recovery engine will trigger live scrapers and historical archives.
                </p>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#050b14]/75 border border-[#00f0ff]/20 rounded-lg p-6 space-y-5 relative font-mono shadow-[0_0_20px_rgba(0,240,255,0.06)]"
              >
                {/* Corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f0ff]" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f0ff]" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00f0ff]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00f0ff]" />

                {/* Result header */}
                <div className="flex justify-between items-start border-b border-[#00f0ff]/10 pb-5">
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">{result.companyName || 'Unknown Entity'}</h2>
                    <a 
                      href={result.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#00f0ff] text-xs flex items-center gap-1 mt-1 hover:underline font-mono"
                    >
                      {result.websiteUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-[#00f0ff] bg-[#0074d9]/15 border border-[#00f0ff]/30 px-2 py-0.5 rounded font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#00f0ff]" />
                      ACCURACY SCORE: {result.confidence}%
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest font-mono">
                      Via {result.source || 'Scraper Engine'}
                    </span>
                  </div>
                </div>

                {/* Structured Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone numbers card */}
                  <div className="bg-black/30 p-4 rounded border border-[#00f0ff]/10">
                    <div className="text-[10px] font-bold text-[#0074d9] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#00f0ff]" />
                      Phone numbers
                    </div>
                    {result.phones.length === 0 ? (
                      <span className="text-[10px] text-slate-600 italic font-mono">No public registers found</span>
                    ) : (
                      <div className="space-y-1">
                        {result.phones.map((phone, i) => (
                          <div key={i} className="text-xs font-bold text-slate-200 font-mono">{phone}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Emails card */}
                  <div className="bg-black/30 p-4 rounded border border-[#00f0ff]/10">
                    <div className="text-[10px] font-bold text-[#0074d9] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#00f0ff]" />
                      Email addresses
                    </div>
                    {result.emails.length === 0 ? (
                      <span className="text-[10px] text-slate-600 italic font-mono">No public registers found</span>
                    ) : (
                      <div className="space-y-1">
                        {result.emails.map((email, i) => (
                          <div key={i} className="text-xs font-bold text-[#00f0ff] font-mono break-all">{email}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp card */}
                  <div className="bg-black/30 p-4 rounded border border-[#00f0ff]/10">
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                      WhatsApp nodes
                    </div>
                    {result.whatsappNumbers.length === 0 ? (
                      <span className="text-[10px] text-slate-600 italic font-mono">No public channels found</span>
                    ) : (
                      <div className="space-y-1">
                        {result.whatsappNumbers.map((num, i) => (
                          <div key={i} className="text-xs font-bold text-slate-200 font-mono">{num}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Social Profile links */}
                  <div className="bg-black/30 p-4 rounded border border-[#00f0ff]/10">
                    <div className="text-[10px] font-bold text-[#0074d9] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-[#00f0ff]" />
                      Social coordinates
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      {result.socialLinks.facebook && (
                        <a href={result.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#00f0ff] hover:underline">
                          <Facebook className="h-3.5 w-3.5" />
                          <span>Facebook</span>
                        </a>
                      )}
                      {result.socialLinks.linkedin && (
                        <a href={result.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#00f0ff] hover:underline">
                          <Linkedin className="h-3.5 w-3.5" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {result.socialLinks.instagram && (
                        <a href={result.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-500 hover:underline">
                          <Instagram className="h-3.5 w-3.5" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {!result.socialLinks.facebook && !result.socialLinks.linkedin && !result.socialLinks.instagram && (
                        <span className="text-[10px] text-slate-600 italic font-mono">No social profiles found</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Physical address card */}
                <div className="bg-black/30 p-4 rounded border border-[#00f0ff]/10">
                  <div className="text-[10px] font-bold text-[#0074d9] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#00f0ff]" />
                    Postal Headquarters
                  </div>
                  <div className="text-xs font-bold text-slate-300 leading-relaxed font-mono">
                    {result.address || <span className="text-slate-600 italic text-[10px]">No postal registers found</span>}
                  </div>
                </div>

                {/* Telemetry performance metrics card */}
                {(result.recoveryTimeMs !== undefined || result.snapshotsVisited !== undefined || result.pagesCrawled !== undefined) && (
                  <div className="bg-[#0074d9]/5 p-4 rounded border border-[#00f0ff]/10 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div>
                      <div className="text-slate-500 uppercase tracking-widest font-mono font-bold">RECOVERY TIME</div>
                      <div className="text-xs text-[#00f0ff] font-bold mt-1">
                        {result.recoveryTimeMs ? `${(result.recoveryTimeMs / 1000).toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase tracking-widest font-mono font-bold">SNAPSHOTS VISITED</div>
                      <div className="text-xs text-[#00f0ff] font-bold mt-1">
                        {result.snapshotsVisited ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase tracking-widest font-mono font-bold">PAGES CRAWLED</div>
                      <div className="text-xs text-[#00f0ff] font-bold mt-1">
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

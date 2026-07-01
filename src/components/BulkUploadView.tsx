import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, Play, Pause, CheckCircle2, XCircle, FileSpreadsheet, 
  RefreshCw, Layers, ShieldAlert, Terminal, RotateCcw, Trash2,
  Clock, Globe, HelpCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

interface TargetItem {
  domain: string;
  source: string;
  startedAt: string;
}

export const BulkUploadView: React.FC = () => {
  const { user, token: authCtxToken } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  
  // Progress state
  const [progress, setProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
    percentage: number;
    paused: boolean;
    workers: number;
    logs: string[];
    dataFound?: number;
    noDataFound?: number;
    contactsRecovered?: number;
    currentDomain?: string;
    currentSource?: string;
    currentConfidence?: number;
    eta?: string;
    processingSpeed?: string;
    currentRecoveryTime?: number;
    blocked?: number;
    results?: any[];
    currentTargets?: TargetItem[];
  } | null>(null);
  
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // States for real-time estimated run metrics (Bug Fix 1)
  const startTimeRef = useRef<number | null>(null);
  const [speed, setSpeed] = useState<string>('Calculating...');
  const [avgTime, setAvgTime] = useState<string>('Calculating...');
  const [eta, setEta] = useState<string>('Calculating...');

  // State to trigger ticking re-renders for elapsed active target times (Bug Fix 2)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load active batch on mount to reconnect
  useEffect(() => {
    const activeBatchId = localStorage.getItem('p2t_active_batch_id');
    if (activeBatchId) {
      setBatchId(activeBatchId);
      setPolling(true);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  // Auto-scroll logs inside log container only
  useEffect(() => {
    if (logContainerRef.current && autoScroll) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progress?.logs, autoScroll]);

  // Fetch progress for active batchId
  const fetchProgress = async (id: string) => {
    try {
      const response = await axios.get(`/api/bulk/${id}`);
      if (response.data && response.data.success) {
        const stats = response.data.data;
        setProgress(stats);
        
        // Real-time calculation of run metrics (Bug Fix 1)
        if (stats.completed > 0) {
          if (!startTimeRef.current) {
            // Estimate reasonable elapsed time if we just loaded an ongoing batch
            startTimeRef.current = Date.now() - (stats.completed * 4000);
          }
          const elapsedSeconds = Math.max(1, (Date.now() - startTimeRef.current) / 1000);
          const avgSec = elapsedSeconds / stats.completed;
          setAvgTime(`${avgSec.toFixed(1)} sec/domain`);

          const elapsedMinutes = elapsedSeconds / 60;
          const currentSpeed = stats.completed / (elapsedMinutes || 1);
          setSpeed(`${currentSpeed.toFixed(1)} domains/min`);

          const remaining = stats.pending + stats.processing;
          if (remaining === 0) {
            setEta('Completed');
          } else {
            const etaSeconds = remaining * avgSec;
            if (etaSeconds < 60) {
              setEta(`${Math.round(etaSeconds)}s`);
            } else if (etaSeconds < 3600) {
              const m = Math.floor(etaSeconds / 60);
              const s = Math.round(etaSeconds % 60);
              setEta(`${m}m ${s}s`);
            } else {
              const h = Math.floor(etaSeconds / 3600);
              const m = Math.floor((etaSeconds % 3600) / 60);
              setEta(`${h}h ${m}m`);
            }
          }
        } else {
          setAvgTime('Calculating...');
          setSpeed('Calculating...');
          setEta('Calculating...');
        }

        // If everything is done, stop polling
        if (stats.pending === 0 && stats.processing === 0 && stats.total > 0) {
          setPolling(false);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  // Trigger polling loop
  useEffect(() => {
    if (polling && batchId) {
      fetchProgress(batchId);
      
      pollTimerRef.current = setInterval(() => {
        fetchProgress(batchId);
      }, 2000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [polling, batchId]);

  const handleStartBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const domainsList = inputText
      .split(/[\n,;]+/)
      .map((d) => d.trim())
      .filter((d) => d.length > 3 && d.includes('.'));

    if (domainsList.length === 0) {
      setError('No valid domains detected. Please verify your input.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setProgress(null);
    setBatchId(null);
    startTimeRef.current = Date.now(); // Reset start time for the new batch

    try {
      const storedTimeout = localStorage.getItem('p2t_timeout') || '30';
      const storedConcurrency = localStorage.getItem('p2t_concurrency') || '8'; // default to 8 for speed
      const storedWayback = localStorage.getItem('p2t_wayback') !== 'false';
      const storedGemini = localStorage.getItem('p2t_gemini') !== 'false';
      const storedMode = localStorage.getItem('p2t_mode') || 'balanced';

      const response = await axios.post('/api/domains/bulk-upload', { 
        domains: domainsList,
        timeout: parseInt(storedTimeout, 10),
        concurrency: parseInt(storedConcurrency, 10),
        waybackFallback: storedWayback,
        geminiGrounding: storedGemini,
        mode: storedMode
      });
      if (response.data && response.data.success) {
        const newBatchId = response.data.batchId;
        setBatchId(newBatchId);
        localStorage.setItem('p2t_active_batch_id', newBatchId);
        setProgress({
          total: domainsList.length,
          completed: 0,
          failed: 0,
          processing: 0,
          pending: domainsList.length,
          percentage: 0,
          paused: false,
          workers: parseInt(storedConcurrency, 10),
          logs: ['Initializing bulk queue...'],
          currentTargets: []
        });
        setPolling(true);
        setInputText('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start bulk job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post(`/api/bulk/pause/${batchId}`);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to pause batch');
    }
  };

  const handleResume = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post(`/api/bulk/resume/${batchId}`);
      setPolling(true);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to resume batch');
    }
  };

  const handleStop = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post(`/api/bulk/stop/${batchId}`);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to stop batch');
    }
  };

  const handleRestart = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post(`/api/bulk/restart/${batchId}`);
      startTimeRef.current = Date.now(); // Reset start time
      setPolling(true);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to restart batch');
    }
  };

  const handleRetryFailed = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post(`/api/bulk/retry-failed/${batchId}`);
      setPolling(true);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to retry failed items');
    }
  };

  const handleClearCompleted = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post(`/api/bulk/clear-completed/${batchId}`);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to clear completed items');
    }
  };

  const handleExportBatch = async () => {
    if (!batchId) return;
    try {
      setError(null);
      const activeToken = sessionStorage.getItem('token') || localStorage.getItem('token') || authCtxToken;
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const response = await axios.get(`/api/results/export?batchId=${batchId}`, {
        responseType: 'blob',
        headers,
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      if ((window as any).electronAPI && typeof (window as any).electronAPI.saveExcelFile === 'function') {
        const reader = new FileReader();
        reader.onloadend = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8 = new Uint8Array(arrayBuffer);
          (window as any).electronAPI.saveExcelFile(uint8, `BatchRecovered_${batchId}.xlsx`);
        };
        reader.readAsArrayBuffer(blob);
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `BatchRecovered_${batchId}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Failed to export batch:', err);
      setError(err.response?.data?.error || err.message || 'Failed to export Batch Excel');
    }
  };

  const handleStartNewBatch = () => {
    setBatchId(null);
    setProgress(null);
    setPolling(false);
    startTimeRef.current = null;
    localStorage.removeItem('p2t_active_batch_id');
  };

  const getLogLineStyle = (line: string) => {
    const lower = line.toLowerCase();
    if (lower.includes('success') || lower.includes('recovered') || lower.includes('complete') || lower.includes('done')) {
      return 'text-[#16A34A] font-semibold';
    }
    if (lower.includes('fail') || lower.includes('error') || lower.includes('exception') || lower.includes('terminate') || lower.includes('timeout')) {
      return 'text-[#DC2626] font-semibold';
    }
    if (lower.includes('warning') || lower.includes('retry') || lower.includes('unreachable') || lower.includes('paused')) {
      return 'text-[#D97706]';
    }
    return 'text-[#374151]';
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 flex flex-col items-center text-center justify-center min-h-[350px] shadow-sm max-w-xl mx-auto my-12">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <ShieldAlert className="h-10 w-10 text-[#DC2626]" />
        </div>
        <h3 className="font-bold text-[#111827] text-[16px]">Administrator Access Required</h3>
        <p className="text-[14px] text-[#6B7280] max-w-sm mt-2 leading-relaxed">
          Bulk uploading and queue batching features are restricted strictly to Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827]">
            {batchId ? 'Bulk Operations Console' : 'Bulk Queue Injector'}
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            {batchId 
              ? 'Monitor and manage live web scraping and website data extraction pipelines.' 
              : 'Upload lists of domain hostnames to process multiple extractions concurrently.'
            }
          </p>
        </div>
        {batchId && (
          <button
            onClick={handleStartNewBatch}
            className="flex items-center gap-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#374151] font-semibold px-4 py-2 rounded-md transition-colors shadow-sm text-[12px] cursor-pointer"
          >
            <Upload className="h-4 w-4 text-[#6B7280]" />
            New Batch Injection
          </button>
        )}
      </div>

      {/* Input Phase (When no batch active) */}
      {!batchId ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Box: Text Area Injector */}
          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#F3F4F6]">
              <Upload className="h-4.5 w-4.5 text-[#2563EB]" />
              <h3 className="text-[14px] font-bold text-[#111827]">Target Domain List</h3>
            </div>
            
            <form onSubmit={handleStartBulk} className="space-y-4">
              {error && (
                <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-md p-4 flex items-start gap-3 text-[12px] text-[#991B1B]">
                  <ShieldAlert className="h-4.5 w-4.5 text-[#DC2626] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  Enter domains (one per line, or separated by commas)
                </label>
                <textarea
                  rows={10}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="example.com&#10;google.com&#10;website.co.uk"
                  className="block w-full p-3 bg-slate-50 border border-[#D1D5DB] rounded-md text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white text-[13px] font-mono transition-all leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !inputText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 px-4 rounded-md transition-colors shadow-sm cursor-pointer text-[12px] uppercase tracking-wider"
              >
                <Play className="h-4 w-4" />
                {isSubmitting ? 'Processing Entry...' : 'Inject into Pipeline Queue'}
              </button>
            </form>
          </div>

          {/* Right Box: Setup Info and Instructions */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] min-h-[400px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#F3F4F6]">
                  <Layers className="h-4.5 w-4.5 text-[#2563EB]" />
                  <h3 className="text-[14px] font-bold text-[#111827]">Operational Pipeline Overview</h3>
                </div>
                <p className="text-[14px] text-[#6B7280] leading-relaxed">
                  The recovery tool bulk pipeline runs non-blocking background workers that process hundreds of websites concurrently. This screen allows you to monitor live worker activity, see speeds, and download results in real-time.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="border border-[#E5E7EB] rounded-md p-4 bg-[#F9FAFB]">
                    <h4 className="text-[13px] font-bold text-[#111827]">High-Concurrency Workers</h4>
                    <p className="text-[12px] text-[#6B7280] mt-1">Utilizes up to 8 parallel worker threads for extremely fast, non-blocking extraction sweeps.</p>
                  </div>
                  <div className="border border-[#E5E7EB] rounded-md p-4 bg-[#F9FAFB]">
                    <h4 className="text-[13px] font-bold text-[#111827]">Durable Backups</h4>
                    <p className="text-[12px] text-[#6B7280] mt-1">If the app is closed, goes to standby, or crashes, processing state is persisted and resumes safely.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F3F4F6] flex items-center gap-2 text-[12px] text-[#9CA3AF]">
                <HelpCircle className="h-4 w-4 text-[#9CA3AF]" />
                <span>Configure additional settings (timeouts, API keys) via the settings panel.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Run Phase */
        <div className="space-y-6">
          {/* Top Level Progress Stats & Bar */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
            <div className="flex items-center justify-between text-[14px]">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
                <span className="font-bold text-[#111827]">Pipeline Queue Progress</span>
              </div>
              <span className="text-[#111827] font-bold">{progress?.percentage || 0}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full border border-slate-200 p-0.5">
              <div 
                className="h-full bg-[#2563EB] transition-all duration-500 rounded-full"
                style={{ width: `${progress?.percentage || 0}%` }}
              />
            </div>

            {/* Six Count Metric Blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 text-center">
                <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Total Queue</div>
                <div className="text-lg font-bold text-[#111827] mt-1">{progress?.total || 0}</div>
              </div>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 text-center">
                <div className="text-[11px] font-semibold text-[#16A34A] uppercase tracking-wider">Recovered</div>
                <div className="text-lg font-bold text-[#16A34A] mt-1">
                  {progress?.dataFound !== undefined ? progress.dataFound : (progress?.contactsRecovered || 0)}
                </div>
              </div>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 text-center">
                <div className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider">No Data</div>
                <div className="text-lg font-bold text-[#D97706] mt-1">{progress?.noDataFound || 0}</div>
              </div>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 text-center">
                <div className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wider">Failed</div>
                <div className="text-lg font-bold text-[#DC2626] mt-1">{progress?.failed || 0}</div>
              </div>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 text-center">
                <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Pending</div>
                <div className="text-lg font-bold text-[#6B7280] mt-1">{progress?.pending || 0}</div>
              </div>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 text-center">
                <div className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Active Workers</div>
                <div className="text-lg font-bold text-[#111827] mt-1">
                  {progress?.paused ? 'Paused' : (progress?.workers || 0)}
                </div>
              </div>
            </div>

            {/* Dynamic Excel Export Strip */}
            {progress && (progress.dataFound || progress.contactsRecovered) ? (
              <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-md p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                  <div>
                    <p className="text-[13px] font-bold text-[#2563EB]">
                      {progress.percentage === 100 
                        ? `All done! Extracted ${progress.dataFound !== undefined ? progress.dataFound : (progress.contactsRecovered || 0)} contact cards.`
                        : `Currently recovering data: ${progress.dataFound !== undefined ? progress.dataFound : (progress.contactsRecovered || 0)} cards collected so far.`
                      }
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">Excludes records with no contact info automatically.</p>
                  </div>
                </div>
                
                <button
                  onClick={handleExportBatch}
                  className="flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold px-4 py-2 rounded-md transition-colors shadow-sm text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Recovered Data (XLSX)
                </button>
              </div>
            ) : null}
          </div>

          {/* Run Metrics & Active Targets split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: Run Metrics */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F3F4F6]">
                <Clock className="h-4.5 w-4.5 text-[#2563EB]" />
                <h3 className="text-[14px] font-bold text-[#111827]">Estimated Run Metrics</h3>
              </div>

              <div className="space-y-3.5 pt-1 text-[13px]">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <span className="font-semibold text-[#6B7280]">Processing Speed:</span>
                  <span className="font-bold text-[#111827]">{speed}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <span className="font-semibold text-[#6B7280]">Average Recovery Time:</span>
                  <span className="font-bold text-[#111827]">{avgTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#6B7280]">Estimated Completion (ETA):</span>
                  <span className="font-bold text-[#2563EB]">{eta}</span>
                </div>
              </div>
            </div>

            {/* Card B: Current Active Target */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#F3F4F6]">
                <Globe className="h-4.5 w-4.5 text-[#2563EB]" />
                <h3 className="text-[14px] font-bold text-[#111827]">Current Active Targets</h3>
              </div>

              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {!progress?.currentTargets || progress.currentTargets.length === 0 ? (
                  <div className="text-xs text-[#9CA3AF] italic py-6 text-center">
                    No active targets. Pipeline is idle or paused.
                  </div>
                ) : (
                  progress.currentTargets.map((target, idx) => {
                    const startedMs = new Date(target.startedAt).getTime();
                    const elapsedSec = startedMs > 0 ? Math.max(0, Math.floor((Date.now() - startedMs) / 1000)) : 0;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span className="font-bold text-[#111827] truncate max-w-[180px] font-mono">{target.domain}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">{target.source}</span>
                          <span className="font-mono">{elapsedSec}s elapsed</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Operational Controllers */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start">
              <button
                type="button"
                onClick={handlePause}
                disabled={!progress || progress.paused || (progress.pending === 0 && progress.processing === 0)}
                className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-md transition-colors text-xs shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause Batch
              </button>
              <button
                type="button"
                onClick={handleResume}
                disabled={!progress || !progress.paused || (progress.pending === 0 && progress.processing === 0)}
                className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-md transition-colors text-xs shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                Resume Batch
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!progress || (progress.pending === 0 && progress.processing === 0)}
                className="flex items-center gap-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-bold border border-[#FCA5A5] px-4 py-2 rounded-md transition-colors text-xs disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                Terminate Run
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-md transition-colors text-xs shadow-sm cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Full Restart
              </button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button
                type="button"
                onClick={handleRetryFailed}
                disabled={!progress || progress.failed === 0}
                className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-md transition-colors text-xs shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Failed ({progress?.failed || 0})
              </button>
              <button
                type="button"
                onClick={handleClearCompleted}
                disabled={!progress || progress.completed === 0}
                className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-md transition-colors text-xs shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Completed ({progress?.completed || 0})
              </button>
            </div>
          </div>

          {/* Live Stream Operations Log Box */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col h-[400px]">
            <div className="flex justify-between items-center border-b border-[#F3F4F6] pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="h-4.5 w-4.5 text-[#2563EB]" />
                <span className="font-bold text-[#111827] text-[14px]">Live Stream Operations Log</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                    autoScroll 
                      ? 'bg-amber-50 text-[#D97706] border-[#FDE68A] hover:bg-amber-100' 
                      : 'bg-emerald-50 text-[#16A34A] border-[#A7F3D0] hover:bg-emerald-100'
                  }`}
                >
                  {autoScroll ? 'Pause Auto-Scroll' : 'Resume Auto-Scroll'}
                </button>
                <span className="text-[11px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full border border-[#BBF7D0]">
                  Pipeline Active
                </span>
              </div>
            </div>

            {/* Log text box container with high contrast clean developer theme */}
            <div 
              ref={logContainerRef}
              className="bg-slate-50 border border-[#E5E7EB] rounded-md p-4 font-mono text-[11px] space-y-1.5 overflow-y-auto flex-1 min-h-0"
            >
              {(!progress?.logs || progress.logs.length === 0) ? (
                <div className="text-[#9CA3AF] italic">No logs available. Ready to stream...</div>
              ) : (
                progress.logs.map((log, index) => (
                  <div key={index} className="flex items-start leading-relaxed py-0.5 hover:bg-slate-100 px-1 rounded transition-colors">
                    <span className="text-[#2563EB] mr-2 font-bold shrink-0">›</span>
                    <span className={getLogLineStyle(log)}>{log}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

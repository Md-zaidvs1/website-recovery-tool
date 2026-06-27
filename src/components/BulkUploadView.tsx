import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, Play, Pause, Clock, CheckCircle2, XCircle, FileSpreadsheet, 
  RefreshCw, Layers, ShieldAlert, Terminal, Cpu, RotateCcw, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

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
  } | null>(null);
  
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Load active batch on mount to reconnect
  useEffect(() => {
    const activeBatchId = localStorage.getItem('p2t_active_batch_id');
    if (activeBatchId) {
      setBatchId(activeBatchId);
      setPolling(true);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress?.logs]);

  // Fetch progress for active batchId
  const fetchProgress = async (id: string) => {
    try {
      const response = await axios.get(`/api/bulk/${id}`);
      if (response.data && response.data.success) {
        const stats = response.data.data;
        setProgress(stats);
        
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

  // Trigger polling loop (snappy 2 seconds updates)
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

    // Split text into lines or commas, filter empty lines
    const domainsList = inputText
      .split(/[\n,;]+/)
      .map((d) => d.trim())
      .filter((d) => d.length > 3 && d.includes('.'));

    if (domainsList.length === 0) {
      setError('RECOVERY BULK: No valid domain entities detected.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setProgress(null);
    setBatchId(null);

    try {
      const storedTimeout = localStorage.getItem('p2t_timeout') || '30';
      const storedConcurrency = localStorage.getItem('p2t_concurrency') || '2';
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

  // Batch control handlers
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

  const handleStopAndRestart = async () => {
    if (!batchId) return;
    try {
      setError(null);
      await axios.post('/api/bulk/stop-all');
      await axios.post(`/api/bulk/restart/${batchId}`);
      setPolling(true);
      await fetchProgress(batchId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to stop and restart batch');
    }
  };

  // Helper: Triggers export download specifically for this active batchId
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
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BatchRecovered_${batchId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export batch:', err);
      setError(err.response?.data?.error || err.message || 'Failed to export Batch Excel');
    }
  };

  const handleStartNewBatch = () => {
    setBatchId(null);
    setProgress(null);
    setPolling(false);
    localStorage.removeItem('p2t_active_batch_id');
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-8 flex flex-col items-center text-center justify-center min-h-[350px] font-mono relative">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
        <ShieldAlert className="h-12 w-12 text-[#00f0ff] mb-3 animate-pulse" />
        <h3 className="font-bold text-white text-sm uppercase tracking-widest">Operator clearance failed</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
          Bulk uploading and queue batching features are restricted strictly to Administrators as defined in your organizational access matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white uppercase tracking-wider block">
            {batchId ? 'Bulk Operations Console' : 'Bulk Inject Queue'}
          </h1>
          <p className="text-xs text-[#0074d9] font-mono mt-1">
            {batchId 
              ? 'Real-time pipeline monitoring and active web-scraping queue feedback.' 
              : 'Add bulk domains lists to background scraping pools for concurrent pipeline extraction.'
            }
          </p>
        </div>
        {batchId && (
          <button
            onClick={handleStartNewBatch}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded text-[10px] font-bold uppercase tracking-wider bg-[#050b14]/80 border border-[#00f0ff]/15 hover:border-[#00f0ff]/50 text-slate-300 hover:text-white transition-all cursor-pointer font-mono shrink-0"
          >
            <Upload className="h-3.5 w-3.5 text-[#00f0ff]" />
            New Batch Injection
          </button>
        )}
      </div>

      {!batchId ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Bulk input card */}
          <div className="lg:col-span-2 bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-6 h-fit space-y-4 relative">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
            
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#00f0ff]" />
              Queuing input injector
            </h3>
            
            <form onSubmit={handleStartBulk} className="space-y-4 font-mono">
              {error && (
                <div className="bg-rose-950/20 border border-rose-600/30 rounded p-4 flex items-start gap-3 text-xs text-rose-300 leading-relaxed">
                  <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                  Domain hostname list (Separated by line breaks or commas)
                </label>
                <textarea
                  rows={10}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g.&#10;riyaglow.in&#10;yzabelle.co.in&#10;abanner.in"
                  className="block w-full p-4 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white placeholder-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs font-mono transition-all leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !inputText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#0074d9]/25 hover:bg-[#0074d9] border border-[#00f0ff]/35 hover:border-[#00f0ff] font-bold py-3 px-4 rounded text-xs transition-all duration-300 shadow-[0_0_12px_rgba(0,240,255,0.1)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] cursor-pointer uppercase tracking-widest text-white font-mono"
              >
                <Play className="h-3.5 w-3.5" />
                {isSubmitting ? 'Injecting Nodes...' : 'Commit Batch to Queue'}
              </button>
            </form>
          </div>

          {/* Idle state card */}
          <div className="lg:col-span-3">
            <div className="bg-[#050b14]/25 border border-[#00f0ff]/15 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[440px] text-slate-500 text-center font-mono relative">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00f0ff]/10" />
              <Layers className="h-10 w-10 mb-3 opacity-30 text-[#00f0ff]" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Queue Monitor Idle</h3>
              <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mt-1">
                No active bulk jobs. Input a list of target websites on the left to spawn automated recovery workers.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Operations Telemetry Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card 1: Current Target */}
            <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 relative font-mono">
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#0074d9]/50" />
              <div className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">CURRENT ACTIVE TARGET</div>
              <div className="text-sm font-bold text-white mt-1.5 truncate font-mono tracking-tight" title={progress?.currentDomain || 'None'}>
                {progress?.currentDomain || 'None (Idle)'}
              </div>
              <div className="text-[10px] text-[#0074d9] mt-2 flex items-center justify-between">
                <span>Source:</span>
                <span className="text-slate-300 max-w-[120px] truncate">{progress?.currentSource || 'N/A'}</span>
              </div>
              <div className="text-[10px] text-[#0074d9] mt-1 flex items-center justify-between">
                <span>Confidence:</span>
                <span className="text-slate-300 font-bold">{progress?.currentConfidence || 0}%</span>
              </div>
            </div>

            {/* Card 2: Speed & ETA */}
            <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 relative font-mono">
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#0074d9]/50" />
              <div className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">ESTIMATED RUN METRICS</div>
              <div className="text-sm font-bold text-[#00f0ff] mt-1.5 font-mono tracking-tight glow-text-cyan">
                ETA: {progress?.eta || 'Completed'}
              </div>
              <div className="text-[10px] text-[#0074d9] mt-2 flex items-center justify-between">
                <span>Speed:</span>
                <span className="text-slate-300">{progress?.processingSpeed || 'N/A'}</span>
              </div>
              <div className="text-[10px] text-[#0074d9] mt-1 flex items-center justify-between">
                <span>Avg Recov Time:</span>
                <span className="text-slate-300">
                  {progress?.currentRecoveryTime ? `${(progress.currentRecoveryTime / 1000).toFixed(1)}s` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Card 3: Worker Matrix */}
            <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 relative font-mono">
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#0074d9]/50" />
              <div className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">CONCURRENCY & WORKERS</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {progress?.workers && progress.workers > 0 && !progress.paused ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-[#00f0ff] animate-ping" />
                ) : (
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                )}
                <span className="text-sm font-bold text-white font-mono">
                  {progress?.paused ? 'Paused' : `${progress?.workers || 0} Workers Engaged`}
                </span>
              </div>
              <div className="text-[10px] text-[#0074d9] mt-2 flex items-center justify-between">
                <span>Operational Status:</span>
                <span className={progress?.paused ? 'text-amber-500 font-bold' : (progress?.processing && progress.processing > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400')}>
                  {progress?.paused ? 'PAUSED' : (progress?.processing && progress.processing > 0 ? 'RUNNING' : 'IDLE')}
                </span>
              </div>
              <div className="text-[10px] text-[#0074d9] mt-1 flex items-center justify-between">
                <span>Session Key:</span>
                <span className="text-slate-500 text-[8px] max-w-[120px] truncate">{batchId}</span>
              </div>
            </div>

            {/* Card 4: Detailed Breakdown */}
            <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 relative font-mono col-span-1">
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#0074d9]/50" />
              <div className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">ACCURACY & BREAKDOWN</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-[10px]">
                <div className="flex justify-between border-b border-[#00f0ff]/5 pb-0.5">
                  <span className="text-emerald-400">Recovered:</span>
                  <span className="font-bold text-white">{progress?.contactsRecovered || 0}</span>
                </div>
                <div className="flex justify-between border-b border-[#00f0ff]/5 pb-0.5">
                  <span className="text-slate-400">No Data:</span>
                  <span className="font-bold text-white">{progress?.noDataFound || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-500 font-medium">Failed:</span>
                  <span className="font-bold text-white">{progress?.failed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400 font-medium font-mono">Blocked:</span>
                  <span className="font-bold text-white">{progress?.blocked || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar & Controllers */}
          <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-5 relative font-mono space-y-4">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
            
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Pipeline Queue Progress</span>
                <span className="text-[#00f0ff] glow-text-cyan font-mono text-sm">{progress?.percentage || 0}%</span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded overflow-hidden border border-[#00f0ff]/10 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-[#005fb8] to-[#00f0ff] transition-all duration-500 rounded shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                  style={{ width: `${progress?.percentage || 0}%` }}
                />
              </div>
            </div>

            {/* Counts Quick view */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div className="bg-black/30 px-3 py-1.5 rounded border border-[#00f0ff]/5 text-center">
                <div className="text-[8px] text-slate-500 uppercase font-mono font-bold">Total</div>
                <div className="text-xs font-bold text-white mt-0.5">{progress?.total || 0}</div>
              </div>
              <div className="bg-black/30 px-3 py-1.5 rounded border border-[#00f0ff]/5 text-center">
                <div className="text-[8px] text-slate-400 uppercase font-mono font-bold">Pending</div>
                <div className="text-xs font-bold text-slate-400 mt-0.5">{progress?.pending || 0}</div>
              </div>
              <div className="bg-black/30 px-3 py-1.5 rounded border border-[#00f0ff]/5 text-center">
                <div className="text-[8px] text-[#00f0ff] uppercase font-mono font-bold">Processing</div>
                <div className="text-xs font-bold text-[#00f0ff] mt-0.5">{progress?.processing || 0}</div>
              </div>
              <div className="bg-black/30 px-3 py-1.5 rounded border border-[#00f0ff]/5 text-center">
                <div className="text-[8px] text-emerald-400 uppercase font-mono font-bold">Completed</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">{progress?.completed || 0}</div>
              </div>
              <div className="bg-black/30 px-3 py-1.5 rounded border border-[#00f0ff]/5 text-center">
                <div className="text-[8px] text-rose-500 uppercase font-mono font-bold">Failed</div>
                <div className="text-xs font-bold text-rose-500 mt-0.5">{progress?.failed || 0}</div>
              </div>
              <div className="bg-black/30 px-3 py-1.5 rounded border border-[#00f0ff]/5 text-center">
                <div className="text-[8px] text-purple-400 uppercase font-mono font-bold">Blocked</div>
                <div className="text-xs font-bold text-purple-400 mt-0.5">{progress?.blocked || 0}</div>
              </div>
            </div>

            {/* Operational Controllers */}
            <div className="space-y-3 pt-2 border-t border-[#00f0ff]/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={!progress || progress.paused || (progress.pending === 0 && progress.processing === 0)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider rounded bg-[#050b14] hover:bg-amber-950/20 text-slate-400 hover:text-amber-400 border border-[#00f0ff]/15 hover:border-amber-500/50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-mono"
                  >
                    <Pause className="h-3 w-3" />
                    Pause Batch
                  </button>
                  <button
                    type="button"
                    onClick={handleResume}
                    disabled={!progress || !progress.paused || (progress.pending === 0 && progress.processing === 0)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider rounded bg-[#050b14] hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-400 border border-[#00f0ff]/15 hover:border-emerald-500/50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-mono"
                  >
                    <Play className="h-3 w-3" />
                    Resume Batch
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={!progress || (progress.pending === 0 && progress.processing === 0)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider rounded bg-[#050b14] hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-[#00f0ff]/15 hover:border-rose-500/50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-mono"
                  >
                    <XCircle className="h-3 w-3" />
                    Terminate Run
                  </button>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider rounded bg-[#050b14] hover:bg-[#0074d9]/15 text-slate-400 hover:text-[#00f0ff] border border-[#00f0ff]/15 hover:border-[#00f0ff] transition-all cursor-pointer font-mono"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Full Restart
                  </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    disabled={!progress || progress.failed === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#050b14] hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-[#00f0ff]/15 hover:border-rose-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-mono"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Retry Failed ({progress?.failed || 0})
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCompleted}
                    disabled={!progress || progress.completed === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#050b14] hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-[#00f0ff]/15 hover:border-rose-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-mono"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Done ({progress?.completed || 0})
                  </button>
                </div>
              </div>

              {/* Emergency Action */}
              <button
                type="button"
                onClick={handleStopAndRestart}
                className="w-full flex items-center justify-center gap-2 bg-rose-950/15 border border-rose-500/25 hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 font-bold py-2 px-4 rounded text-[10px] transition-all cursor-pointer uppercase tracking-widest font-mono"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Emergency Kill & Hard Restart Pipeline
              </button>
            </div>
          </div>

          {/* Console Log Stream & Real-time Updating Table Split */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Live Scrolling Logs Terminal */}
            <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 relative font-mono flex flex-col h-[400px]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
              <div className="flex justify-between items-center border-b border-[#00f0ff]/10 pb-2 mb-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#00f0ff] animate-pulse" />
                  Live Stream Operations Log
                </span>
                <span className="text-[8px] text-emerald-400 font-mono animate-pulse bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                  ● PIPELINE ACTIVE
                </span>
              </div>

              <div className="bg-black/90 border border-[#00f0ff]/10 rounded p-3 font-mono text-[10px] text-slate-400 space-y-1 overflow-y-auto flex-1 shadow-inner relative cyber-scanlines">
                {(!progress?.logs || progress.logs.length === 0) ? (
                  <div className="text-slate-600 italic">Logs are offline or waiting for active streams...</div>
                ) : (
                  progress.logs.map((log, index) => (
                    <div key={index} className="leading-relaxed hover:bg-zinc-900/60 px-1 py-0.5 rounded transition-colors text-slate-400 font-mono">
                      <span className="text-[#0074d9] mr-2 font-bold">&gt;&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Real-time updating results table */}
            <div className="bg-[#050b14]/75 border border-[#00f0ff]/15 rounded-lg p-4 relative font-mono flex flex-col h-[400px]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#0074d9]/50" />
              <div className="flex justify-between items-center border-b border-[#00f0ff]/10 pb-2 mb-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#00f0ff]" />
                  Real-time Recovered Nodes
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Updating live</span>
              </div>

              <div className="overflow-auto flex-1 border border-[#00f0ff]/5 rounded bg-black/40">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-black/60 text-slate-400 border-b border-[#00f0ff]/10 font-bold">
                      <th className="p-2 border-r border-[#00f0ff]/5">Domain</th>
                      <th className="p-2 border-r border-[#00f0ff]/5">Status</th>
                      <th className="p-2 border-r border-[#00f0ff]/5">Company</th>
                      <th className="p-2">Contacts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!progress?.results || progress.results.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-600 italic font-mono">
                          Waiting for scraping workers to process nodes...
                        </td>
                      </tr>
                    ) : (
                      progress.results.map((row: any) => {
                        let statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
                        if (row.status === 'ACTIVE') statusColor = 'bg-emerald-950/50 text-emerald-400 border-emerald-900/40';
                        else if (row.status === 'ARCHIVED') statusColor = 'bg-amber-950/40 text-amber-400 border-amber-900/30';
                        else if (row.status === 'FAILED') statusColor = 'bg-rose-950/30 text-rose-400 border-rose-900/30';
                        else if (row.status === 'BLOCKED') statusColor = 'bg-purple-950/30 text-purple-400 border-purple-900/30';
                        else if (row.status === 'NO_DATA') statusColor = 'bg-slate-900 text-slate-500 border-slate-800';

                        const emailsCount = row.emails?.length || 0;
                        const phonesCount = row.phones?.length || 0;
                        const totalContacts = emailsCount + phonesCount;

                        return (
                          <tr key={row.id} className="border-b border-[#00f0ff]/5 hover:bg-white/5 transition-colors font-mono">
                            <td className="p-2 font-bold text-slate-300 border-r border-[#00f0ff]/5 font-mono truncate max-w-[130px]" title={row.domain}>
                              {row.domain}
                            </td>
                            <td className="p-2 border-r border-[#00f0ff]/5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold border ${statusColor}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-2 text-slate-400 border-r border-[#00f0ff]/5 truncate max-w-[100px]" title={row.companyName}>
                              {row.companyName}
                            </td>
                            <td className="p-2 text-slate-300">
                              {totalContacts > 0 ? (
                                <div className="space-y-0.5">
                                  {emailsCount > 0 && (
                                    <div className="text-[9px] text-sky-400 truncate max-w-[180px]" title={row.emails.join(', ')}>
                                      ✉ {row.emails[0]} {emailsCount > 1 && `(+${emailsCount - 1})`}
                                    </div>
                                  )}
                                  {phonesCount > 0 && (
                                    <div className="text-[9px] text-emerald-400 truncate max-w-[180px]" title={row.phones.join(', ')}>
                                      📞 {row.phones[0]} {phonesCount > 1 && `(+${phonesCount - 1})`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Success Summary Banner or Download Report */}
          {progress?.percentage === 100 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-950/20 border border-emerald-500/35 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative font-mono"
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500/40" />
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  Queue batch run fully completed!
                </h3>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  Scraping workers successfully completed analysis for all {progress.total} domains. 
                  Extracted contacts have been successfully compiled and stored in persistent records.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleExportBatch}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 hover:border-emerald-400 text-white font-bold py-2 px-5 rounded text-xs transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] uppercase tracking-widest font-mono cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export .xlsx Report
                </button>
                <button
                  onClick={handleStartNewBatch}
                  className="flex items-center justify-center gap-1.5 bg-[#050b14]/70 hover:bg-zinc-800 border border-[#00f0ff]/15 hover:border-[#00f0ff]/40 text-slate-300 hover:text-white font-bold py-2 px-5 rounded text-xs transition-all uppercase tracking-widest font-mono cursor-pointer"
                >
                  Start New Batch
                </button>
              </div>
            </motion.div>
          )}

          {/* Download batch results CTA */}
          {progress && progress.percentage < 100 && (
            <div className="pt-2 flex flex-col items-center">
              <button
                onClick={handleExportBatch}
                disabled={progress.completed === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#0074d9]/25 hover:bg-[#0074d9] hover:text-white border border-[#00f0ff]/35 hover:border-[#00f0ff] text-white font-bold py-3 px-4 rounded text-xs transition-all duration-300 shadow-[0_0_12px_rgba(0,240,255,0.1)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] cursor-pointer disabled:opacity-35 uppercase tracking-widest font-mono"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Live Batch Report (.xlsx)
              </button>
              <p className="text-[9px] text-slate-500 text-center mt-2 leading-relaxed">
                Downloads live compiled Excel file separating Recovered Contacts and No Data Found for this batch.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

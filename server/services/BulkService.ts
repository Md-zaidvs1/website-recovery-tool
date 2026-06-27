import fs from 'fs';
import path from 'path';
import { Domains, Contacts } from '../models/db';
import { ExtractionEngine } from './ExtractionEngine';
import { Domain, RecoveredContact } from '../../src/types';
import { LoggerService } from './LoggerService';

const BULK_JOBS_FILE = path.join(process.cwd(), '.data', 'bulkJobs.json');

export interface BulkJob {
  id: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  paused: boolean;
  workers: number;
  logs: string[];
  updatedAt?: string;
  options?: {
    timeout?: number;
    concurrency?: number;
    waybackFallback?: boolean;
    geminiGrounding?: boolean;
    mode?: 'fast' | 'balanced' | 'deep';
  };
}

export class BulkService {
  private static activeDomainControllers = new Map<string, AbortController>(); // domainId -> AbortController
  private static activeBatchIds = new Set<string>(); // batchId -> true
  private static pausedBatches = new Set<string>(); // batchId -> true
  private static lastProgressUpdate = 0; // timestamp
  private static completedSinceLastUpdate = 0; // count of completed in current window

  /**
   * Reads bulk jobs list from bulkJobs.json.
   */
  static readBulkJobs(): BulkJob[] {
    try {
      const dir = path.dirname(BULK_JOBS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(BULK_JOBS_FILE)) {
        fs.writeFileSync(BULK_JOBS_FILE, JSON.stringify([], null, 2), 'utf-8');
        return [];
      }
      const data = fs.readFileSync(BULK_JOBS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('[BulkService] Error reading bulkJobs.json:', err);
      return [];
    }
  }

  /**
   * Writes bulk jobs list to bulkJobs.json.
   */
  static writeBulkJobs(jobs: BulkJob[]): void {
    try {
      const dir = path.dirname(BULK_JOBS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(BULK_JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BulkService] Error writing bulkJobs.json:', err);
    }
  }

  /**
   * Saves or updates a bulk job record.
   */
  static saveBulkJob(job: BulkJob): void {
    const jobs = this.readBulkJobs();
    const index = jobs.findIndex((j) => j.id === job.id);
    if (index >= 0) {
      // Keep existing logs if none are supplied in update
      if (!job.logs && jobs[index].logs) {
        job.logs = jobs[index].logs;
      }
      jobs[index] = {
        ...job,
        updatedAt: new Date().toISOString(),
      };
    } else {
      jobs.push({
        ...job,
        updatedAt: new Date().toISOString(),
      });
    }
    this.writeBulkJobs(jobs);
  }

  /**
   * Adds a timed log to the specific bulk job, keeping only the last 100 entries.
   */
  static addJobLog(batchId: string, logMessage: string): void {
    const jobs = this.readBulkJobs();
    const index = jobs.findIndex((j) => j.id === batchId);
    if (index >= 0) {
      const job = jobs[index];
      const logs = job.logs || [];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      logs.push(`[${timestamp}] ${logMessage}`);
      job.logs = logs.slice(-100); // Memory optimization: Keep only last 100 logs
      jobs[index] = job;
      this.writeBulkJobs(jobs);
    }
  }

  /**
   * Adds a batch of domains to the processing database queue.
   */
  static addBatch(domainsList: string[], userId: string, batchId: string, options?: BulkJob['options']): void {
    const uniqueDomains = Array.from(new Set(domainsList.map((d) => d.trim().toLowerCase()).filter(Boolean)));

    for (const domainName of uniqueDomains) {
      // Avoid inserting duplicates for the same active batch
      const exists = Domains.findOne({ domain: domainName, bulkBatchId: batchId });
      if (exists) continue;

      Domains.create({
        domain: domainName,
        status: 'pending',
        processedBy: userId,
        isBulk: true,
        bulkBatchId: batchId,
        retryCount: 0,
      });
    }

    // Initialize BulkJob record
    const stats = this.getBatchProgress(batchId);
    const job: BulkJob = {
      id: batchId,
      total: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      pending: stats.pending,
      paused: false,
      workers: options?.concurrency || 2,
      logs: [],
      options,
    };
    this.saveBulkJob(job);
    this.addJobLog(batchId, `Batch job created with ${stats.total} domains.`);

    // Start background processing workers
    this.startWorkerForBatch(batchId);
  }

  /**
   * Initializes the BulkService: Checks for unfinished batches to resume on app startup.
   */
  static init(): void {
    console.log('[BulkService] Initializing and checking for unfinished batches to resume...');
    const jobs = this.readBulkJobs();
    
    // Find uncompleted, unpaused batches
    const activeBatches = jobs.filter((j) => !j.paused);
    for (const job of activeBatches) {
      const batchId = job.id;
      
      // Reset any PROCESSING domains back to PENDING (since server was down/crashed)
      const processingDomains = Domains.find({ bulkBatchId: batchId, status: 'processing' });
      if (processingDomains.length > 0) {
        console.log(`[BulkService] Resetting ${processingDomains.length} processing domains to pending for batch ${batchId}`);
        for (const d of processingDomains) {
          Domains.findByIdAndUpdate(d.id, { status: 'pending' });
        }
      }

      const pendingCount = Domains.countDocuments({ bulkBatchId: batchId, status: 'pending' });
      if (pendingCount > 0) {
        console.log(`[BulkService] Automatically resuming batch ${batchId} with ${pendingCount} pending domains`);
        // Add log
        this.addJobLog(batchId, 'Application started/recovered: Automatically resuming batch queue processing...');
        this.startWorkerForBatch(batchId);
      }
    }
  }

  /**
   * Starts background concurrent workers for a specific batch.
   */
  static startWorkerForBatch(batchId: string): void {
    if (this.activeBatchIds.has(batchId)) {
      console.log(`[BulkService] Workers are already active for batch ${batchId}`);
      return;
    }
    this.activeBatchIds.add(batchId);
    this.pausedBatches.delete(batchId);

    // Save state
    const stats = this.getBatchProgress(batchId);
    const jobs = this.readBulkJobs();
    const existingJob = jobs.find((j) => j.id === batchId);
    const concurrencyLimit = existingJob?.options?.concurrency || 2;
    
    const job: BulkJob = {
      id: batchId,
      total: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      pending: stats.pending,
      paused: false,
      workers: concurrencyLimit,
      logs: existingJob ? existingJob.logs : [],
      options: existingJob?.options,
    };
    this.saveBulkJob(job);

    // Concurrency limit = dynamic workers
    const MAX_CONCURRENT_WORKERS = concurrencyLimit;
    for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
      this.runWorkerLoop(batchId, i).catch((err) => {
        console.error(`[BulkService] Worker loop ${i} exception on batch ${batchId}:`, err);
      });
    }
  }

  /**
   * Pauses an active batch: Finishes current domain, stops accepting new ones.
   */
  static pauseBatch(batchId: string): void {
    console.log(`[BulkService] Pausing batch ${batchId}...`);
    this.pausedBatches.add(batchId);
    this.addJobLog(batchId, 'Pause requested. Finishes current domain, then pauses.');
    this.syncJobProgress(batchId);
    LoggerService.queue(batchId, 'PAUSED', 'Batch processing paused by administrator.');
  }

  /**
   * Resumes a paused batch.
   */
  static resumeBatch(batchId: string): void {
    console.log(`[BulkService] Resuming batch ${batchId}...`);
    this.pausedBatches.delete(batchId);
    this.addJobLog(batchId, 'Batch resumed. Continuing pending items.');
    this.startWorkerForBatch(batchId);
    LoggerService.queue(batchId, 'RESUMED', 'Batch processing resumed by administrator.');
  }

  /**
   * Stops a batch: Kills active workers immediately, resets their processing status to pending, saves state.
   */
  static stopBatch(batchId: string): void {
    console.log(`[BulkService] Stopping batch ${batchId}...`);
    this.pausedBatches.add(batchId);
    this.activeBatchIds.delete(batchId);

    // Abort active controllers for this batch
    const batchProcessingDomains = Domains.find({ bulkBatchId: batchId, status: 'processing' });
    let abortedCount = 0;
    
    for (const d of batchProcessingDomains) {
      const controller = this.activeDomainControllers.get(d.id);
      if (controller) {
        controller.abort();
        abortedCount++;
      }
      // Reset back to pending
      Domains.findByIdAndUpdate(d.id, { status: 'pending' });
    }

    this.addJobLog(batchId, `Batch stopped by user. Terminated ${abortedCount} active scraping processes.`);
    this.syncJobProgress(batchId);
    LoggerService.queue(batchId, 'STOPPED', `Batch stopped. Terminated ${abortedCount} active tasks.`);
  }

  /**
   * Restarts a batch: Reset processing domains to pending and restart queue crawling.
   */
  static restartBatch(batchId: string): void {
    console.log(`[BulkService] Restarting batch ${batchId}...`);
    
    const batchProcessingDomains = Domains.find({ bulkBatchId: batchId, status: 'processing' });
    for (const d of batchProcessingDomains) {
      Domains.findByIdAndUpdate(d.id, { status: 'pending' });
    }

    this.pausedBatches.delete(batchId);
    this.addJobLog(batchId, 'Restarting batch. Unfinished processing items reset to pending.');
    this.startWorkerForBatch(batchId);
    LoggerService.queue(batchId, 'RESTARTED', 'Batch processing restarted.');
  }

  /**
   * Retries failed domains in a batch: resets status to pending and starts workers.
   */
  static retryFailedBatch(batchId: string): void {
    console.log(`[BulkService] Retrying failed domains in batch ${batchId}...`);
    const failedDomains = Domains.find({ bulkBatchId: batchId, status: 'failed' });
    
    for (const d of failedDomains) {
      Domains.findByIdAndUpdate(d.id, {
        status: 'pending',
        retryCount: 0,
        errorMessage: undefined,
      });
    }

    this.pausedBatches.delete(batchId);
    this.addJobLog(batchId, `Retrying ${failedDomains.length} failed domains. Statuses reset to pending.`);
    this.startWorkerForBatch(batchId);
    LoggerService.queue(batchId, 'RETRY_FAILED', `Retrying ${failedDomains.length} failed domains.`);
  }

  /**
   * Clears completed domains from a batch queue.
   */
  static clearCompletedBatch(batchId: string): void {
    console.log(`[BulkService] Clearing completed domains in batch ${batchId}...`);
    const count = Domains.deleteMany((d) => d.bulkBatchId === batchId && d.status === 'completed');
    this.addJobLog(batchId, `Cleared ${count} completed domains from the queue.`);
    this.syncJobProgress(batchId);
    LoggerService.queue(batchId, 'CLEAR_COMPLETED', `Cleared ${count} completed domains.`);
  }

  /**
   * Force stops all workers across all batches.
   */
  static stopAll(): number {
    console.log('[BulkService] Force stopping all workers across all batches...');
    
    let stoppedCount = 0;
    for (const [domainId, controller] of this.activeDomainControllers.entries()) {
      try {
        controller.abort();
        stoppedCount++;
      } catch (err) {
        console.error('[BulkService] Error aborting controller:', err);
      }
    }
    this.activeDomainControllers.clear();

    // Mark any PROCESSING domain in db back to pending
    const processingDomains = Domains.find({ status: 'processing' });
    for (const d of processingDomains) {
      Domains.findByIdAndUpdate(d.id, { status: 'pending' });
    }

    // Mark all jobs as paused and inactive
    const jobs = this.readBulkJobs();
    for (const job of jobs) {
      this.pausedBatches.add(job.id);
      this.activeBatchIds.delete(job.id);
      
      const stats = this.getBatchProgress(job.id);
      job.total = stats.total;
      job.completed = stats.completed;
      job.failed = stats.failed;
      job.pending = stats.pending;
      job.paused = true;
      job.workers = 0;
      
      const logs = job.logs || [];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      logs.push(`[${timestamp}] FORCE STOP ALL: Terminated active workers and paused batch.`);
      job.logs = logs.slice(-100);
      
      this.saveBulkJob(job);
      LoggerService.queue(job.id, 'FORCE_STOP_ALL', 'Force stop command issued globally.');
    }

    return stoppedCount;
  }

  /**
   * Worker queue loop. Crawls domains in sequence using a while loop.
   */
  private static async runWorkerLoop(batchId: string, workerIndex: number): Promise<void> {
    console.log(`[BulkService] Worker ${workerIndex} online for batch ${batchId}`);
    
    while (true) {
      // Respect pause or stop signal
      if (this.pausedBatches.has(batchId) || !this.activeBatchIds.has(batchId)) {
        console.log(`[BulkService] Worker ${workerIndex} exiting loop: paused or stopped.`);
        break;
      }

      // getNextPendingDomain()
      const domainRecord = Domains.findOne({ bulkBatchId: batchId, status: 'pending' });
      if (!domainRecord) {
        console.log(`[BulkService] Worker ${workerIndex} exiting loop: no more pending domains.`);
        break;
      }

      // Lock status to processing & assign an AbortController
      Domains.findByIdAndUpdate(domainRecord.id, { status: 'processing' });
      const controller = new AbortController();
      this.activeDomainControllers.set(domainRecord.id, controller);

      const domainName = domainRecord.domain;
      const workerId = `Worker-${workerIndex}`;
      console.log(`[BulkService] Worker ${workerIndex} processing domain: ${domainName}`);
      this.addJobLog(batchId, `Worker ${workerIndex} is processing ${domainName}`);
      
      LoggerService.worker(workerId, domainName, 'PROCESSING', 0, domainRecord.retryCount, 'Extraction initiated');

      const jobs = this.readBulkJobs();
      const job = jobs.find((j) => j.id === batchId);
      const options = job?.options || {};
      const timeoutSec = options.timeout || 30;

      let data: any = null;
      let isTimeout = false;
      let isAborted = false;
      let errMsg = '';
      const startTime = Date.now();

      let timer: NodeJS.Timeout | undefined;
      try {
        // Watchdog timeout wrapper: dynamic timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutSec * 1000);
        });

        const extractionPromise = ExtractionEngine.extract(domainName, controller.signal, options);

        data = await Promise.race([extractionPromise, timeoutPromise]);
      } catch (error: any) {
        if (error.message === 'TIMEOUT') {
          isTimeout = true;
          controller.abort(); // Cancel ongoing HTTP requests
          errMsg = `[WATCHDOG] Domain timed out after ${timeoutSec} seconds`;
          console.warn(`[WATCHDOG] Domain timed out after ${timeoutSec} seconds: ${domainName}`);
          this.addJobLog(batchId, `[WATCHDOG] Domain timed out after ${timeoutSec} seconds: ${domainName}`);
        } else if (error.message === 'ABORTED' || controller.signal.aborted) {
          isAborted = true;
          errMsg = 'Cancelled by system';
          console.log(`[BulkService] Domain extraction cancelled for: ${domainName}`);
        } else {
          errMsg = error.message || 'Unknown extraction failure';
          console.error(`[BulkService] Error processing ${domainName}:`, errMsg);
          this.addJobLog(batchId, `Error processing ${domainName}: ${errMsg}`);
        }
      } finally {
        if (timer) clearTimeout(timer);
        this.activeDomainControllers.delete(domainRecord.id);
      }

      const durationMs = Date.now() - startTime;

      // Handle aborted states
      if (isAborted) {
        Domains.findByIdAndUpdate(domainRecord.id, { status: 'pending' });
        LoggerService.worker(workerId, domainName, 'ABORTED', durationMs, domainRecord.retryCount, 'Task cancelled');
        continue; // Unfinished resets to pending, worker loop exits or checks next iteration
      }

      if (isTimeout) {
        // Watchdog failure
        Domains.findByIdAndUpdate(domainRecord.id, {
          status: 'failed',
          errorMessage: errMsg,
          processedAt: new Date().toISOString(),
        });
        LoggerService.worker(workerId, domainName, 'FAILED', durationMs, domainRecord.retryCount, errMsg);
        LoggerService.error(domainName, errMsg, workerId, domainRecord.retryCount);
      } else if (data) {
        // saveResult()
        const existingContact = Contacts.findOne({ domainId: domainRecord.id });
        const contactPayload: Omit<RecoveredContact, 'id' | 'createdAt' | 'updatedAt'> = {
          domainId: domainRecord.id,
          ...data,
        };

        if (existingContact) {
          Contacts.findByIdAndUpdate(existingContact.id, contactPayload);
        } else {
          Contacts.create(contactPayload);
        }

        Domains.findByIdAndUpdate(domainRecord.id, {
          status: data.status === 'BLOCKED' ? 'blocked' : 'completed',
          processedAt: new Date().toISOString(),
          errorMessage: data.status === 'BLOCKED' ? 'Request was blocked (anti-scraping protective block)' : undefined,
        });

        console.log(`[BulkService] Successfully processed domain: ${domainName}`);
        this.addJobLog(batchId, `Successfully processed ${domainName}`);
        
        LoggerService.worker(workerId, domainName, 'COMPLETED', durationMs, domainRecord.retryCount, 'Successfully extracted contact details');
        LoggerService.network(domainName, 'SUCCESS', durationMs, `Extracted via: ${data.source}`);
      } else {
        // Standard recovery retry/failure logic
        if (domainRecord.retryCount < 2) {
          Domains.findByIdAndUpdate(domainRecord.id, {
            retryCount: domainRecord.retryCount + 1,
            status: 'pending',
            errorMessage: `Retry ${domainRecord.retryCount + 1}: ${errMsg}`,
          });
          this.addJobLog(batchId, `Retrying ${domainName} (attempt ${domainRecord.retryCount + 1}/2)...`);
          LoggerService.worker(workerId, domainName, 'RETRY', durationMs, domainRecord.retryCount + 1, errMsg);
        } else {
          Domains.findByIdAndUpdate(domainRecord.id, {
            status: 'failed',
            errorMessage: errMsg,
            processedAt: new Date().toISOString(),
          });
          this.addJobLog(batchId, `Failed processing ${domainName}: ${errMsg}`);
          LoggerService.worker(workerId, domainName, 'FAILED', durationMs, domainRecord.retryCount, errMsg);
          LoggerService.error(domainName, errMsg, workerId, domainRecord.retryCount);
        }
      }

      // updateProgress()
      this.completedSinceLastUpdate++;
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastProgressUpdate;

      // Update UI/file: Every 5 completed domains OR Every 2 seconds
      if (this.completedSinceLastUpdate >= 5 || timeSinceLastUpdate >= 2000) {
        this.syncJobProgress(batchId);
        this.completedSinceLastUpdate = 0;
        this.lastProgressUpdate = now;
      }

      // Brief sleep between domains to respect rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Cleanup: If this is the last running worker of this batch, mark active batch inactive
    const remainingProcessing = Domains.countDocuments({ bulkBatchId: batchId, status: 'processing' });
    if (remainingProcessing === 0) {
      this.activeBatchIds.delete(batchId);
      this.syncJobProgress(batchId);
    }
  }

  /**
   * Synchronizes progress details of a batch to bulkJobs.json.
   */
  static syncJobProgress(batchId: string): void {
    const stats = this.getBatchProgress(batchId);
    const jobs = this.readBulkJobs();
    const index = jobs.findIndex((j) => j.id === batchId);
    if (index >= 0) {
      jobs[index] = {
        ...jobs[index],
        total: stats.total,
        completed: stats.completed,
        failed: stats.failed,
        pending: stats.pending,
        paused: this.pausedBatches.has(batchId),
        workers: this.activeBatchIds.has(batchId) ? 2 : 0,
      };
      this.writeBulkJobs(jobs);
    }
  }

  /**
   * Returns progress stats for a specific bulk batch.
   */
  static getBatchProgress(batchId: string) {
    const batchDomains = Domains.find({ bulkBatchId: batchId });
    const total = batchDomains.length;

    if (total === 0) {
      return { 
        total: 0, completed: 0, failed: 0, blocked: 0, processing: 0, pending: 0, percentage: 0,
        noDataFound: 0, contactsRecovered: 0, currentDomain: 'None', currentSource: 'None',
        currentConfidence: 0, currentRecoveryTime: 0, processingSpeed: '0 domains/min', eta: 'Completed', results: []
      };
    }

    const completed = batchDomains.filter((d) => d.status === 'completed').length;
    const failed = batchDomains.filter((d) => d.status === 'failed').length;
    const blocked = batchDomains.filter((d) => d.status === 'blocked').length;
    const processing = batchDomains.filter((d) => d.status === 'processing').length;
    const pending = batchDomains.filter((d) => d.status === 'pending').length;

    const percentage = Math.round(((completed + failed + blocked) / total) * 100);

    let contactsRecovered = 0;
    let noDataFound = 0;
    let lastProcessedContact: any = null;

    const results = batchDomains.map((domain) => {
      const contact = Contacts.findOne({ domainId: domain.id });
      let status: 'ACTIVE' | 'ARCHIVED' | 'PUBLIC_RECOVERY' | 'NO_DATA' | 'FAILED' | 'BLOCKED' = 'NO_DATA';
      let companyName = 'N/A';
      let emails: string[] = [];
      let phones: string[] = [];
      let whatsappNumbers: string[] = [];
      let source = 'N/A';
      let confidence = 0;
      let recoveryTimeMs = 0;

      if (domain.status === 'failed') {
        status = 'FAILED';
        source = 'Checked Public Sources';
      } else if (domain.status === 'blocked') {
        status = 'BLOCKED';
        source = 'Checked Public Sources';
      } else if (domain.status === 'completed' && contact) {
        const hasContactInfo = (contact.emails && contact.emails.length > 0) ||
          (contact.phones && contact.phones.length > 0) ||
          (contact.whatsappNumbers && contact.whatsappNumbers.length > 0) ||
          (contact.socialLinks && (contact.socialLinks.facebook || contact.socialLinks.linkedin || contact.socialLinks.instagram));

        if (!hasContactInfo) {
          status = 'NO_DATA';
          noDataFound++;
        } else {
          contactsRecovered++;
          const isArchived = contact.status === 'ARCHIVED' || 
            (contact.source && (contact.source.toLowerCase().includes('wayback') || contact.source.toLowerCase().includes('archive')));
          status = isArchived ? 'ARCHIVED' : 'ACTIVE';
        }
        companyName = contact.companyName || 'N/A';
        emails = contact.emails || [];
        phones = contact.phones || [];
        whatsappNumbers = contact.whatsappNumbers || [];
        source = contact.source || 'Checked Public Sources';
        confidence = contact.confidence || 0;
        recoveryTimeMs = contact.recoveryTimeMs || 0;
        lastProcessedContact = contact;
      } else if (domain.status === 'completed') {
        status = 'NO_DATA';
        noDataFound++;
      }

      return {
        id: domain.id,
        domain: domain.domain,
        status,
        companyName,
        emails,
        phones,
        whatsappNumbers,
        source,
        confidence,
        recoveryTimeMs,
      };
    });

    const activeDomainObj = batchDomains.find((d) => d.status === 'processing');
    const currentDomain = activeDomainObj ? activeDomainObj.domain : 'None (Idle)';

    const currentSource = lastProcessedContact ? lastProcessedContact.source : 'Checked Public Sources';
    const currentConfidence = lastProcessedContact ? lastProcessedContact.confidence : 0;
    const currentRecoveryTime = lastProcessedContact ? lastProcessedContact.recoveryTimeMs : 0;

    const processed = completed + failed + blocked;
    const processingSpeed = processed > 0 ? `${Math.round(processed / ((processed * 3.5) / 60 || 1))} domains/min` : 'Calculated in real-time...';
    
    const remaining = pending + processing;
    const etaSeconds = Math.round((remaining * 3.5) / 2);
    const eta = remaining > 0 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : 'Completed';

    return {
      total,
      completed,
      failed,
      blocked,
      processing,
      pending,
      percentage,
      noDataFound,
      contactsRecovered,
      currentDomain,
      currentSource,
      currentConfidence,
      currentRecoveryTime,
      processingSpeed,
      eta,
      results
    };
  }
}

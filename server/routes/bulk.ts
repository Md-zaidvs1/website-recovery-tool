import { Router } from 'express';
import { BulkService } from '../services/BulkService';
import { authMiddleware, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Protect all routes
router.use(authMiddleware);

/**
 * GET /api/bulk/:batchId
 * Returns the specific BulkJob metadata, status, and log messages from bulkJobs.json.
 */
router.get('/:batchId', (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  const jobs = BulkService.readBulkJobs();
  const job = jobs.find((j) => j.id === batchId);
  
  // Calculate database live counts
  const progress = BulkService.getBatchProgress(batchId);

  if (!job) {
    res.json({
      success: true,
      data: {
        id: batchId,
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        pending: progress.pending,
        processing: progress.processing,
        percentage: progress.percentage,
        paused: true,
        workers: 0,
        logs: [],
      }
    });
    return;
  }

  res.json({
    success: true,
    data: {
      ...job,
      total: progress.total,
      completed: progress.completed,
      failed: progress.failed,
      pending: progress.pending,
      processing: progress.processing,
      percentage: progress.percentage,
    }
  });
});

/**
 * POST /api/bulk/stop-all
 * Immediately terminates all active scraping workers across all batches.
 */
router.post('/stop-all', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  try {
    const stopped = BulkService.stopAll();
    res.json({
      success: true,
      stoppedWorkers: stopped,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to stop all workers' });
  }
});

/**
 * POST /api/bulk/restart/:batchId
 * Reset PROCESSING domains to PENDING and restart workers.
 */
router.post('/restart/:batchId', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  try {
    BulkService.restartBatch(batchId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to restart batch' });
  }
});

/**
 * POST /api/bulk/pause/:batchId
 * Pauses batch processing (finishes current domains first).
 */
router.post('/pause/:batchId', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  try {
    BulkService.pauseBatch(batchId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to pause batch' });
  }
});

/**
 * POST /api/bulk/resume/:batchId
 * Resumes batch processing.
 */
router.post('/resume/:batchId', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  try {
    BulkService.resumeBatch(batchId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to resume batch' });
  }
});

/**
 * POST /api/bulk/stop/:batchId
 * Instantly stops workers for a batch and marks unfinished items as pending.
 */
router.post('/stop/:batchId', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  try {
    BulkService.stopBatch(batchId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to stop batch' });
  }
});

/**
 * POST /api/bulk/retry-failed/:batchId
 * Resets failed domains in a batch to pending and resumes crawling.
 */
router.post('/retry-failed/:batchId', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  try {
    BulkService.retryFailedBatch(batchId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to retry failed items' });
  }
});

/**
 * POST /api/bulk/clear-completed/:batchId
 * Clears completed domains from a batch queue.
 */
router.post('/clear-completed/:batchId', requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { batchId } = req.params;
  try {
    BulkService.clearCompletedBatch(batchId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear completed items' });
  }
});

export default router;

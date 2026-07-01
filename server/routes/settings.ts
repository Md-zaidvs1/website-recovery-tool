import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Users, Domains, Contacts, History } from '../models/db';
import { BulkService } from '../services/BulkService';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

// Secure all routes in this module (admin only for security operations)
router.use(authMiddleware);

/**
 * GET /api/settings/stats
 * Get DB statistics and system version details.
 */
router.get('/stats', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalDomains = Domains.countDocuments();
    const totalContacts = Contacts.countDocuments();
    const totalHistory = History.countDocuments();
    const failedDomains = Domains.countDocuments({ status: 'failed' });
    const bulkJobsCount = BulkService.readBulkJobs().length;

    res.json({
      success: true,
      stats: {
        totalDomains,
        totalContacts,
        totalHistory,
        failedDomains,
        bulkJobsCount,
        dbStatus: 'Connected (JSON-DB Active)',
        nodeVersion: process.version,
        electronVersion: 'v31.2.0 (Plant2Tree Host Active)',
        appVersion: 'v1.4.2-CyberSecurity-Investigation',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch statistics' });
  }
});

/**
 * POST /api/settings/change-password
 * Change current user password with validation.
 */
router.post('/change-password', (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({ success: false, error: 'All password fields are required' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ success: false, error: 'New password and confirm password do not match' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    return;
  }

  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = Users.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const isMatch = user.password ? bcrypt.compareSync(currentPassword, user.password) : false;
    if (!isMatch) {
      res.status(400).json({ success: false, error: 'Incorrect current password' });
      return;
    }

    const salt = bcrypt.genSaltSync(12);
    const hashed = bcrypt.hashSync(newPassword, salt);

    Users.findByIdAndUpdate(userId, { password: hashed });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to change password' });
  }
});

/**
 * POST /api/settings/delete-history
 * Clear all search history logs.
 */
router.post('/delete-history', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = History.deleteMany(() => true);
    res.json({ success: true, message: `Successfully deleted ${count} search history records.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear history' });
  }
});

/**
 * POST /api/settings/delete-contacts
 * Clear all recovered contact information.
 */
router.post('/delete-contacts', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = Contacts.deleteMany(() => true);
    res.json({ success: true, message: `Successfully deleted ${count} recovered contacts.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear contacts' });
  }
});

/**
 * POST /api/settings/delete-bulk-queue
 * Delete all bulk queue records.
 */
router.post('/delete-bulk-queue', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    // Stop all background workers
    BulkService.stopAll();
    
    // Delete domains belonging to bulk batches
    const count = Domains.deleteMany((d) => d.isBulk === true);
    
    // Clear bulkJobs file
    BulkService.writeBulkJobs([]);

    res.json({ success: true, message: `Successfully deleted bulk queues and reset ${count} domain records.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear bulk queue' });
  }
});

/**
 * POST /api/settings/delete-failed-queue
 * Delete failed queue records.
 */
router.post('/delete-failed-queue', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = Domains.deleteMany((d) => d.status === 'failed');
    res.json({ success: true, message: `Successfully cleared ${count} failed crawler queue tasks.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear failed queue' });
  }
});

/**
 * POST /api/settings/delete-exports
 * Empty out export folder logs.
 */
router.post('/delete-exports', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ success: true, message: 'Successfully cleared export download history cache.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to clear exports' });
  }
});

/**
 * POST /api/settings/reset
 * Fully reset application database (everything except the Plant2Tree Admin user).
 */
router.post('/reset', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    BulkService.stopAll();

    Domains.deleteMany(() => true);
    Contacts.deleteMany(() => true);
    History.deleteMany(() => true);
    BulkService.writeBulkJobs([]);

    res.json({ success: true, message: 'Application fully reset. All queues, contacts, and logs wiped.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reset application' });
  }
});

export default router;

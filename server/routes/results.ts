import { Router } from 'express';
import { listResults, getResultDetails, deleteResult, reprocessDomain, exportToExcel } from '../controllers/results';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Results list, detail, reprocess, and Excel export available to users & admins
router.get('/', listResults);
router.get('/export', exportToExcel); // Stream download
router.post('/reprocess', reprocessDomain);
router.get('/:id', getResultDetails);

// Delete records restricted to Admin as per SRS permissions
router.delete('/:id', requireRole('admin'), deleteResult);

export default router;

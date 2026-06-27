import { Router } from 'express';
import { processSingle, bulkUpload, listDomains, getDomainDetails, deleteDomain, getBatchProgress } from '../controllers/domain';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Standard retrieval and process routes available to both admins and users
router.get('/', listDomains);
router.post('/process', processSingle);
router.get('/:id', getDomainDetails);
router.get('/bulk/:batchId/progress', getBatchProgress);

// Admin-only operations as defined in SRS permissions
router.post('/bulk-upload', requireRole('admin'), bulkUpload);
router.delete('/:id', requireRole('admin'), deleteDomain);

export default router;

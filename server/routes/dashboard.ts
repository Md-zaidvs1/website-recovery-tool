import { Router } from 'express';
import { getStats, getRecentSearches } from '../controllers/dashboard';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getStats);
router.get('/recent-searches', getRecentSearches);

export default router;

import { Router } from 'express';
import { login, getProfile } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);

export default router;

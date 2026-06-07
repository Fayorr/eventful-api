import { Router } from 'express';
import { register, login, verifyEmail } from './auth.controller';
import { authLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/verify-email/:token', verifyEmail);

export default router;

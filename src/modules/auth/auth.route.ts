import { Router } from 'express';
import {
	login,
	refresh,
	register,
	resendVerification,
} from './auth.controller';
import { authLimiter } from '../../shared/middlewares/rateLimiter';
import { catchAsync } from '../../shared/utils/catchAsync';

const router = Router();

router.post('/register', authLimiter, catchAsync(register));
router.post('/login', authLimiter, catchAsync(login));
router.post('/refresh', authLimiter, catchAsync(refresh));
router.post(
	'/resend-verification',
	authLimiter,
	catchAsync(resendVerification),
);

export default router;

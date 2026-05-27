import { Router } from 'express';
import { getPaymentHistory } from './payment.controller';
import { protect, authorize } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Only logged-in users with the 'creator' role can access payment history
router.get('/history', protect, authorize('creator'), getPaymentHistory);

export default router;

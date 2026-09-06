import { Router } from 'express';
import { authorize, protect } from '../../shared/middlewares/auth.middleware';
import { catchAsync } from '../../shared/utils/catchAsync';
import { getPaymentHistory } from './payment.controller';

const router = Router();
router.get('/history', protect, authorize('creator'), catchAsync(getPaymentHistory));
export default router;

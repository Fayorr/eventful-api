import { Router } from 'express';
import { buyTicket, verifyPayment } from './ticket.controller';
import { protect } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Only logged in users can buy tickets
router.post('/buy/:eventId', protect, buyTicket);

// Route to hit after Paystack redirects back to your frontend
router.get('/verify/:reference', protect, verifyPayment);

export default router;

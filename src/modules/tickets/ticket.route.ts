import { Router } from 'express';
import {
	buyTicket,
	scanTicket,
	verifyPayment,
	setPersonalReminder,
	getMyTickets,
} from './ticket.controller';
import { authorize, protect } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Only logged in users can buy tickets
router.post('/buy/:eventId', protect, buyTicket);

// Route to hit after Paystack redirects back to your frontend
router.get('/verify/:reference', protect, verifyPayment);

// Add scanTicket to your imports, then add this route:
router.post('/scan/:reference', protect, authorize('creator'), scanTicket);

router.post('/:ticketId/reminder', protect, setPersonalReminder);


router.get('/my-tickets', protect, getMyTickets);

export default router;

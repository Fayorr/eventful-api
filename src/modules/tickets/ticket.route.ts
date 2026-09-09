import { Router } from 'express';
import {
	buyTicket,
	getMyTickets,
	scanTicket,
	setPersonalReminder,
	verifyPayment,
} from './ticket.controller';
import { authorize, protect } from '../../shared/middlewares/auth.middleware';
import { catchAsync } from '../../shared/utils/catchAsync';

const router = Router();

router.get('/my-tickets', protect, authorize('eventee'), catchAsync(getMyTickets));
router.post('/buy/:eventId', protect, authorize('eventee'), catchAsync(buyTicket));
router.post(
	'/verify/:reference',
	protect,
	authorize('eventee'),
	catchAsync(verifyPayment),
);
router.post(
	'/scan/:token',
	protect,
	authorize('creator'),
	catchAsync(scanTicket),
);
router.post(
	'/:ticketId/reminder',
	protect,
	authorize('eventee'),
	catchAsync(setPersonalReminder),
);

export default router;

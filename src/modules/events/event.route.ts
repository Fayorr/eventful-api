import { Router } from 'express';
import {
	createEvent,
	getAttendees,
	getEvent,
	getEvents,
	getMyEvents,
	shareEvent,
} from './event.controller';
import { authorize, protect } from '../../shared/middlewares/auth.middleware';
import { catchAsync } from '../../shared/utils/catchAsync';

const router = Router();

router.get('/', catchAsync(getEvents));
router.get('/mine', protect, authorize('creator'), catchAsync(getMyEvents));
router.post('/', protect, authorize('creator'), catchAsync(createEvent));
router.get('/:id/share', catchAsync(shareEvent));
router.get(
	'/:id/attendees',
	protect,
	authorize('creator'),
	catchAsync(getAttendees),
);
router.get('/:id', catchAsync(getEvent));

export default router;

import { Router } from 'express';
import { createEvent, getEvents, getEvent, even as getShareLinks } from './event.controller';
import { protect, authorize } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Public routes (Optionally protect this if only logged-in users can browse)
router.get('/', getEvents);
router.get('/:id', getEvent);
router.get('/:id/share', getShareLinks);

// Protected routes (Creators only)
router.post('/', protect, authorize('creator'), createEvent);

export default router;

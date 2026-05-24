import { Router } from 'express';
import { getGlobalAnalytics, getEventAnalytics } from './analytics.controller';
import { protect, authorize } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Only logged in creators can view analytics
router.use(protect, authorize('creator'));

router.get('/global', getGlobalAnalytics);
router.get('/event/:eventId', getEventAnalytics);

export default router;

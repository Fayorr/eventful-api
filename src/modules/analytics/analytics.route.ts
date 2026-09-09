import { Router } from 'express';
import { authorize, protect } from '../../shared/middlewares/auth.middleware';
import { catchAsync } from '../../shared/utils/catchAsync';
import { getEventAnalytics, getGlobalAnalytics } from './analytics.controller';

const router = Router();
router.use(protect, authorize('creator'));
router.get('/global', catchAsync(getGlobalAnalytics));
router.get('/events/:eventId', catchAsync(getEventAnalytics));
export default router;

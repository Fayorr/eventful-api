import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import * as analyticsService from './analytics.service';

export const getGlobalAnalytics = async (req: AuthRequest, res: Response) => {
	const data = await analyticsService.getCreatorAnalytics(req.user!.id);
	res.status(200).json({ status: 'success', data });
};

export const getEventAnalytics = async (req: AuthRequest, res: Response) => {
	const data = await analyticsService.getEventSpecificAnalytics(
		Array.isArray(req.params.eventId)
			? req.params.eventId[0]
			: req.params.eventId,
		req.user!.id,
	);
	res.status(200).json({ status: 'success', data });
};

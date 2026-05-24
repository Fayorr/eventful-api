import { Response } from 'express';
import * as analyticsService from './analytics.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';

export const getGlobalAnalytics = async (req: AuthRequest, res: Response) => {
	try {
		const stats = await analyticsService.getCreatorAnalytics(req.user.id);
		res.status(200).json({ status: 'success', data: stats });
	} catch (error: any) {
		res.status(500).json({ status: 'error', message: error.message });
	}
};

export const getEventAnalytics = async (req: AuthRequest, res: Response) => {
	try {
		const { eventId } = req.params;
		const stats = await analyticsService.getEventSpecificAnalytics(
			eventId,
			req.user.id,
		);
		res.status(200).json({ status: 'success', data: stats });
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { getCreatorPaymentDetails } from './payment.service';

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
	const data = await getCreatorPaymentDetails(req.user!.id);
	res.status(200).json({ status: 'success', data });
};

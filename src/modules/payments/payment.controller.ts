import { Response } from 'express';
import * as paymentService from './payment.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';

export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
	try {
		// req.user.id is guaranteed to exist because of our protect middleware
		const paymentData = await paymentService.getCreatorPaymentDetails(
			req.user.id,
		);

		res.status(200).json({
			status: 'success',
			data: paymentData,
		});
	} catch (error: any) {
		res.status(500).json({ status: 'error', message: error.message });
	}
};

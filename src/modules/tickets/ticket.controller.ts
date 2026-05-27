import { Response } from 'express';
import * as ticketService from './ticket.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';

export const buyTicket = async (req: AuthRequest, res: Response) => {
	try {
		const { eventId } = req.params;
		const result = await ticketService.initializeTicketPurchase(
			eventId,
			req.user,
		);

		res.status(200).json({
			status: 'success',
			message: 'Payment initialized',
			data: result,
		});
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
	try {
		const { reference } = req.params;
		const ticket = await ticketService.verifyAndGenerateTicket(reference);

		res.status(201).json({
			status: 'success',
			message: 'Ticket generated successfully',
			data: ticket,
		});
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

export const scanTicket = async (req: AuthRequest, res: Response) => {
	try {
		const { reference } = req.params;
		// req.user.id comes from your JWT token
		const result = await ticketService.markTicketAsScanned(
			reference,
			req.user.id,
		);

		res.status(200).json({
			status: 'success',
			message: 'Ticket verified and attendee admitted!',
			data: result,
		});
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

export const setPersonalReminder = async (req: AuthRequest, res: Response) => {
	try {
		const { ticketId } = req.params;
		const { delayInHours } = req.body;

		if (!delayInHours || delayInHours < 0) {
			return res.status(400).json({
				status: 'error',
				message: 'delayInHours is required and must be non-negative',
			});
		}

		const result = await ticketService.setPersonalReminder(
			ticketId,
			req.user.id,
			delayInHours,
		);

		res.status(200).json({
			status: 'success',
			message: 'Reminder scheduled successfully',
			data: result,
		});
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

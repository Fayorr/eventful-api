import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import * as ticketService from './ticket.service';

const param = (value: string | string[]) =>
	Array.isArray(value) ? value[0] : value;

export const buyTicket = async (req: AuthRequest, res: Response) => {
	const data = await ticketService.initializeTicketPurchase(
		param(req.params.eventId),
		req.user!,
		req.body.callbackUrl,
	);
	res.status(data.kind === 'ticket' ? 201 : 200).json({ status: 'success', data });
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
	const ticket = await ticketService.verifyAndGenerateTicket(
		param(req.params.reference),
		req.user!.id,
	);
	res.status(201).json({
		status: 'success',
		message: 'Ticket generated successfully.',
		data: ticket,
	});
};

export const scanTicket = async (req: AuthRequest, res: Response) => {
	const data = await ticketService.markTicketAsScanned(
		param(req.params.token),
		req.user!.id,
	);
	res.status(200).json({
		status: 'success',
		message: 'Ticket verified; attendee admitted.',
		data,
	});
};

export const setPersonalReminder = async (req: AuthRequest, res: Response) => {
	const data = await ticketService.setPersonalReminder(
		param(req.params.ticketId),
		req.user!.id,
		req.body.hoursBefore ?? req.body.delayInHours,
	);
	res.status(201).json({ status: 'success', data });
};

export const getMyTickets = async (req: AuthRequest, res: Response) => {
	const tickets = await ticketService.getMyTickets(req.user!.id);
	res.status(200).json({ status: 'success', data: tickets });
};

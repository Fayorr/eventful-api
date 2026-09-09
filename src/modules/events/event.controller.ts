import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import * as eventService from './event.service';

const param = (value: string | string[]) =>
	Array.isArray(value) ? value[0] : value;

export const createEvent = async (req: AuthRequest, res: Response) => {
	const event = await eventService.createEvent(req.body, req.user!.id);
	res.status(201).json({ status: 'success', data: event });
};

export const getEvents = async (req: Request, res: Response) => {
	const events = await eventService.getAllEvents(req.query);
	res.status(200).json({ status: 'success', data: events });
};

export const getEvent = async (req: Request, res: Response) => {
	const event = await eventService.getEventById(param(req.params.id));
	res.status(200).json({ status: 'success', data: event });
};

export const getMyEvents = async (req: AuthRequest, res: Response) => {
	const events = await eventService.getCreatorEvents(req.user!.id);
	res.status(200).json({ status: 'success', data: events });
};

export const getAttendees = async (req: AuthRequest, res: Response) => {
	const result = await eventService.getEventAttendees(
		param(req.params.id),
		req.user!.id,
	);
	res.status(200).json({ status: 'success', data: result });
};

export const shareEvent = async (req: Request, res: Response) => {
	const links = await eventService.getShareLinks(param(req.params.id));
	res.status(200).json({ status: 'success', data: links });
};

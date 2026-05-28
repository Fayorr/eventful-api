import { Request, Response } from 'express';
import * as eventService from './event.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';

export const createEvent = async (req: AuthRequest, res: Response) => {
	try {
		const event = await eventService.createEvent(req.body, req.user.id);
		res.status(201).json({ status: 'success', data: event });
	} catch (error: any) {
		res.status(400).json({ status: 'error', message: error.message });
	}
};

export const getEvents = async (req: Request, res: Response) => {
	try {
		const events = await eventService.getAllEvents();
		res.status(200).json({ status: 'success', data: events });
	} catch (error: any) {
		res.status(500).json({ status: 'error', message: error.message });
	}
};

export const getEvent = async (req: Request, res: Response) => {
	try {
		const event = await eventService.getEventById(req.params.id);
		res.status(200).json({ status: 'success', data: event });
	} catch (error: any) {
		res.status(404).json({ status: 'error', message: error.message });
	}
};

export const even = async (req: Request, res: Response) => {
	try {
		const event = await eventService.getEventById(req.params.id);
		const FRONTEND_URL =
			process.env.FRONTEND_URL || 'https://eventfulapp-api.vercel.app' || 'http://localhost:5173';
		const eventUrl = `${FRONTEND_URL}/checkout/${event._id}`;
		const text = `Check out this amazing event: ${event.title}!`;

		const shareLinks = {
			whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + eventUrl)}`,
			twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(eventUrl)}`,
			facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
			linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
			copyUrl: `${eventUrl}`
		};

		res.status(200).json({ status: 'success', data: shareLinks });
	} catch (error: any) {
		res.status(404).json({ status: 'error', message: error.message });
	}
};
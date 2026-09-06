import { Prisma, ReminderStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../config/prisma';
import redisClient from '../../config/redis';
import { AppError } from '../../shared/errors/AppError';
import { scheduleReminder } from '../notifications/queue.service';

const CACHE_SECONDS = 300;

const eventInput = z.object({
	title: z.string().trim().min(3).max(160),
	description: z.string().trim().min(10).max(10_000),
	date: z.coerce.date().refine((date) => date.getTime() > Date.now(), {
		message: 'Event date must be in the future.',
	}),
	location: z.string().trim().min(2).max(240),
	price: z.coerce.number().min(0).max(100_000_000),
	capacity: z.coerce.number().int().positive().max(1_000_000),
	reminderHoursBefore: z
		.array(z.coerce.number().positive().max(8760))
		.max(5)
		.default([]),
});

const eventFilters = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().trim().max(100).optional(),
	upcoming: z.enum(['true', 'false']).default('true'),
});

const eventInclude = {
	creator: { select: { id: true, name: true, email: true } },
} satisfies Prisma.EventInclude;

export const presentEvent = <T extends { priceKobo: number }>(event: T) => {
	const { priceKobo, ...rest } = event;
	return { ...rest, price: priceKobo / 100, currency: 'NGN' };
};

const bumpEventCacheVersion = async () => {
	try {
		await redisClient.incr('events:version');
	} catch (error) {
		console.warn('Redis event cache invalidation failed:', error);
	}
};

export const createEvent = async (input: unknown, creatorId: string) => {
	const data = eventInput.parse(input);
	const reminderDates = data.reminderHoursBefore.map(
		(hours) => new Date(data.date.getTime() - hours * 60 * 60 * 1000),
	);
	if (reminderDates.some((date) => date <= new Date())) {
		throw new AppError('Every reminder must be scheduled in the future.', 400);
	}
	const event = await prisma.event.create({
		data: {
			title: data.title,
			description: data.description,
			date: data.date,
			location: data.location,
			priceKobo: Math.round(data.price * 100),
			capacity: data.capacity,
			creatorId,
		},
		include: eventInclude,
	});

	for (const scheduledFor of reminderDates) {
		const reminder = await prisma.reminder.create({
			data: { eventId: event.id, userId: creatorId, scheduledFor },
		});
		try {
			const jobId = await scheduleReminder({
				reminderId: reminder.id,
				email: event.creator.email,
				eventTitle: event.title,
				sendAt: scheduledFor,
			});
			await prisma.reminder.update({ where: { id: reminder.id }, data: { jobId } });
		} catch (error) {
			await prisma.reminder.update({
				where: { id: reminder.id },
				data: { status: ReminderStatus.FAILED },
			});
			console.error('Failed to schedule creator reminder:', error);
		}
	}
	await bumpEventCacheVersion();
	return presentEvent(event);
};

export const getAllEvents = async (input: unknown) => {
	const filters = eventFilters.parse(input);
	let version = '0';
	try {
		version = (await redisClient.get('events:version')) || '0';
		const key = `events:v${version}:${JSON.stringify(filters)}`;
		const cached = await redisClient.get(key);
		if (cached) return JSON.parse(cached);
	} catch (error) {
		console.warn('Redis event cache read failed:', error);
	}

	const where: Prisma.EventWhereInput = {
		...(filters.upcoming === 'true' ? { date: { gte: new Date() } } : {}),
		...(filters.search
			? {
				OR: [
					{ title: { contains: filters.search, mode: 'insensitive' } },
					{ location: { contains: filters.search, mode: 'insensitive' } },
				],
			}
			: {}),
	};

	const [events, total] = await prisma.$transaction([
		prisma.event.findMany({
			where,
			include: eventInclude,
			orderBy: { date: 'asc' },
			skip: (filters.page - 1) * filters.limit,
			take: filters.limit,
		}),
		prisma.event.count({ where }),
	]);
	const result = {
		items: events.map(presentEvent),
		pagination: {
			page: filters.page,
			limit: filters.limit,
			total,
			pages: Math.ceil(total / filters.limit),
		},
	};

	try {
		const key = `events:v${version}:${JSON.stringify(filters)}`;
		await redisClient.setex(key, CACHE_SECONDS, JSON.stringify(result));
	} catch (error) {
		console.warn('Redis event cache write failed:', error);
	}
	return result;
};

export const getEventById = async (eventId: string) => {
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		include: eventInclude,
	});
	if (!event) throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
	return presentEvent(event);
};

export const getCreatorEvents = async (creatorId: string) => {
	const events = await prisma.event.findMany({
		where: { creatorId },
		include: eventInclude,
		orderBy: { date: 'desc' },
	});
	return events.map(presentEvent);
};

export const getEventAttendees = async (eventId: string, creatorId: string) => {
	const event = await prisma.event.findFirst({
		where: { id: eventId, creatorId },
		select: { id: true, title: true },
	});
	if (!event) {
		throw new AppError('Event not found or not owned by you.', 404);
	}

	const tickets = await prisma.ticket.findMany({
		where: { eventId },
		select: {
			id: true,
			createdAt: true,
			scannedAt: true,
			eventee: { select: { id: true, name: true, email: true } },
		},
		orderBy: { createdAt: 'desc' },
	});
	return { event, attendees: tickets };
};

export const getShareLinks = async (eventId: string) => {
	const event = await getEventById(eventId);
	const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
		/\/$/,
		'',
	);
	const eventUrl = `${baseUrl}/events/${event.id}`;
	const text = `Check out ${event.title} on Eventful`;
	return {
		whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${eventUrl}`)}`,
		twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(eventUrl)}`,
		facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
		linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
		copyUrl: eventUrl,
	};
};

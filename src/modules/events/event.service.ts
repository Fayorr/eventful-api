import Event, { IEvent } from './event.model';
import redisClient from '../../config/redis';

const CACHE_EXPIRATION = 3600; // Cache for 1 hour

export const createEvent = async (data: Partial<IEvent>, creatorId: string) => {
	const event = await Event.create({ ...data, creator: creatorId });

	// Clear the cache whenever a new event is added
	try {
		await redisClient.del('events:all');
	} catch (cacheError) {
		console.warn('Redis cache clear error:', cacheError);
		// Continue without clearing cache if Redis fails
	}

	return event;
};

export const getAllEvents = async () => {
	// 1. Check Cache
	try {
		const cachedEvents = await redisClient.get('events:all');
		if (cachedEvents) {
			return JSON.parse(cachedEvents);
		}
	} catch (cacheError) {
		console.warn('Redis cache error:', cacheError);
		// Continue without cache if Redis fails
	}

	// 2. If Cache Miss, Hit Database
	const events = await Event.find()
		.populate('creator', 'name email')
		.sort({ date: 1 });

	// 3. Set Cache for future requests
	try {
		await redisClient.setEx(
			'events:all',
			CACHE_EXPIRATION,
			JSON.stringify(events),
		);
	} catch (cacheError) {
		console.warn('Redis cache set error:', cacheError);
		// Continue without caching if Redis fails
	}

	return events;
};

export const getEventById = async (eventId: string) => {
	const cacheKey = `event:${eventId}`;

	try {
		const cachedEvent = await redisClient.get(cacheKey);
		if (cachedEvent) {
			return JSON.parse(cachedEvent);
		}
	} catch (cacheError) {
		console.warn('Redis cache error:', cacheError);
		// Continue without cache if Redis fails
	}

	const event = await Event.findById(eventId).populate('creator', 'name email');
	if (!event) throw new Error('Event not found');

	try {
		await redisClient.setEx(cacheKey, CACHE_EXPIRATION, JSON.stringify(event));
	} catch (cacheError) {
		console.warn('Redis cache set error:', cacheError);
		// Continue without caching if Redis fails
	}

	return event;
};

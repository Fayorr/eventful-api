import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../../config/redis';

const sendRedisCommand = redisClient.call.bind(redisClient) as unknown as (
	...args: string[]
) => Promise<any>;

const store = (prefix: string) =>
	process.env.NODE_ENV === 'test'
		? undefined
		: new RedisStore({
				prefix,
				sendCommand: sendRedisCommand,
			});

export const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 300,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	store: store('eventful:rate:global:'),
	skip: (req) => req.path === '/health',
	message: {
		status: 'error',
		message: 'Too many requests; please try again later.',
	},
});

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	store: store('eventful:rate:auth:'),
	message: {
		status: 'error',
		message: 'Too many authentication attempts; please try again later.',
	},
});

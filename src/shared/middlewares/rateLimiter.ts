import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../../config/redis';

// Global rate limiter: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
	message: {
		status: 'error',
		message:
			'Too many requests from this IP, please try again after 15 minutes',
	},
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 5, // 5 attempts per minute
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
	message: {
		status: 'error',
		message: 'Too many login attempts, please try again after a minute',
	},
});

import rateLimit from 'express-rate-limit';

// Global rate limiter: 15 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'error',
		message:
			'Too many requests from this IP, please try again after 15 minutes',
	},
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'error',
		message: 'Too many login attempts, please try again after a minute',
	},
});

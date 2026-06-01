import rateLimit from 'express-rate-limit';

// Global rate limiter: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => {
		// Skip rate limiting for health check
		return req.path === '/health';
	},
	message: {
		status: 'error',
		message:
			'Too many requests from this IP, please try again after 15 minutes',
	},
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'error',
		message: 'Too many login attempts, please try again after a minute',
	},
});

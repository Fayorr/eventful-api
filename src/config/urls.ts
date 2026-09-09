const stripTrailingSlash = (url: string) => url.replace(/\/$/, '');

export const FRONTEND_URL = stripTrailingSlash(
	process.env.FRONTEND_URL || 'https://eventfulapp-api.vercel.app',
);

export const BACKEND_URL = stripTrailingSlash(
	process.env.BACKEND_URL || 'https://eventful-api.hostless.app',
);

export const CORS_ORIGINS = Array.from(
	new Set([
		FRONTEND_URL,
		...(process.env.CORS_ORIGINS || '')
			.split(',')
			.map((origin) => stripTrailingSlash(origin.trim()))
			.filter(Boolean),
		...(process.env.NODE_ENV === 'production'
			? []
			: ['http://localhost:5173']),
	]),
);

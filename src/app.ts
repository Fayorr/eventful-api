import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { errorHandler } from './shared/middlewares/errorHandler';
import { globalLimiter } from './shared/middlewares/rateLimiter';
import authRoutes from './modules/auth/auth.route';
import eventRoutes from './modules/events/event.route';
import ticketRoutes from './modules/tickets/ticket.route';
import paymentRoutes from './modules/payments/payment.route';
import analyticsRoutes from './modules/analytics/analytics.route';

const app: Application = express();

// Trust proxy for rate limiting and X-Forwarded-For headers in production
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);

// Security and Parsing Middlewares
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
	process.env.FRONTEND_URL ||
		'https://eventfulapp-api.vercel.app' ||
		'http://localhost:5173',
];

console.log('✅ CORS allowed origins:', allowedOrigins);

app.use(
	cors({
		origin: (origin, callback) => {
			console.log('📍 CORS request from origin:', origin);
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				console.warn('❌ CORS blocked origin:', origin);
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(globalLimiter);
// Health Check Route
app.get('/health', (req: Request, res: Response) => {
	res
		.status(200)
		.json({ status: 'success', message: 'Eventful API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 404 Handler - Debug endpoint
app.use((req: Request, res: Response) => {
	console.log(`❌ 404 - ${req.method} ${req.path}`);
	res.status(404).json({
		status: 'error',
		message: `Endpoint not found: ${req.method} ${req.path}`,
		availableEndpoints: [
			'GET /health',
			'POST /api/v1/auth/login',
			'POST /api/v1/auth/register',
			'GET /api/v1/events',
			'POST /api/v1/events',
			'GET /api/v1/tickets',
		],
	});
});

app.use(errorHandler);

export default app;

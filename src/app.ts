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

// Security and Parsing Middlewares
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
	process.env.FRONTEND_URL ||
		'https://eventfulapp-api.vercel.app' ||
		'http://localhost:5173',
];

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
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

app.use(errorHandler);

export default app;

import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import analyticsRoutes from './modules/analytics/analytics.route';
import authRoutes from './modules/auth/auth.route';
import eventRoutes from './modules/events/event.route';
import paymentRoutes from './modules/payments/payment.route';
import ticketRoutes from './modules/tickets/ticket.route';
import { errorHandler } from './shared/middlewares/errorHandler';
import { globalLimiter } from './shared/middlewares/rateLimiter';

const app: Application = express();
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0);
app.disable('x-powered-by');
app.use(helmet());

const allowedOrigins = (
	process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173'
)
	.split(',')
	.map((origin) => origin.trim().replace(/\/$/, ''));
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
				callback(null, true);
				return;
			}
			callback(new Error('Origin is not allowed by CORS'));
		},
		credentials: true,
	}),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalLimiter);

const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
	res.status(200).json({ status: 'success', service: 'eventful-api', version: 2 });
});

app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/events', eventRoutes);
app.use('/api/v2/tickets', ticketRoutes);
app.use('/api/v2/payments', paymentRoutes);
app.use('/api/v2/analytics', analyticsRoutes);

app.use((req, res) => {
	res.status(404).json({
		status: 'error',
		code: 'ROUTE_NOT_FOUND',
		message: `Endpoint not found: ${req.method} ${req.path}`,
	});
});
app.use(errorHandler);

export default app;

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// We will create these middlewares shortly
// import { errorHandler } from './shared/middlewares/errorHandler';
// import { globalLimiter } from './shared/middlewares/rateLimiter';

const app: Application = express();

// Security and Parsing Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
// const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Apply global rate limiting (to be imported)
// app.use(globalLimiter);

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
	res
		.status(200)
		.json({ status: 'success', message: 'Eventful API is running' });
});

// Mount Routes (To be implemented)
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/events', eventRoutes);
// app.use('/api/v1/tickets', ticketRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/analytics', analyticsRoutes);

// Global Error Handler (To be implemented)
// app.use(errorHandler);

export default app;

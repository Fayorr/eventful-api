import 'dotenv/config';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';

const port = Number(process.env.PORT || 5001);

const startServer = async () => {
	await Promise.all([connectDatabase(), connectRedis()]);
	const server = app.listen(port, () => {
		console.log(`🚀 Eventful API v2 running on port ${port}`);
	});

	const shutdown = async (signal: string) => {
		console.log(`${signal} received; shutting down`);
		server.close(async () => {
			await Promise.all([disconnectDatabase(), disconnectRedis()]);
			process.exit(0);
		});
	};

	process.on('SIGTERM', () => void shutdown('SIGTERM'));
	process.on('SIGINT', () => void shutdown('SIGINT'));
};

startServer().catch((error) => {
	console.error('❌ Failed to start Eventful API:', error);
	process.exit(1);
});

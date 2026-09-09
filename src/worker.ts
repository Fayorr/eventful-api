import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { reminderWorker } from './modules/notifications/worker.service';

const start = async () => {
	await connectDatabase();
	console.log('✅ Event reminder worker started');
};

const shutdown = async (signal: string) => {
	console.log(`${signal} received; shutting down reminder worker`);
	await reminderWorker.close();
	await disconnectDatabase();
	process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();

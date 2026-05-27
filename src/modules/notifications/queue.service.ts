// src/modules/notifications/queue.service.ts
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

// Parse Redis URL for BullMQ connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);
const redisHost = url.hostname || 'localhost';
const redisPort = parseInt(url.port || '6379', 10);
const redisPassword = url.password || undefined;

export const reminderQueue = new Queue('event-reminders', {
	connection: {
		host: redisHost,
		port: redisPort,
		password: redisPassword,
	},
});

// Helper function to schedule a reminder
export const scheduleReminder = async (
	email: string,
	eventTitle: string,
	sendAtDate: Date,
) => {
	const delay = sendAtDate.getTime() - Date.now(); // Calculate milliseconds from now

	if (delay > 0) {
		await reminderQueue.add(
			'send-email',
			{ email, eventTitle }, // The payload the worker will need
			{ delay }, // BullMQ will wait this long before processing
		);
	}
};

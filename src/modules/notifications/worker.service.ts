// src/modules/notifications/worker.service.ts
import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { createBullMQConnection } from '../../config/redis';
import { sendEventReminderEmail } from './email.service';

dotenv.config();

// Parse Redis URL for BullMQ connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);
const redisHost = url.hostname || 'localhost';
const redisPort = parseInt(url.port || '6379', 10);
const redisPassword = url.password || undefined;

export const reminderWorker = new Worker(
	'event-reminders',
	async (job) => {
		const { email, eventTitle } = job.data;

		console.log(`[BullMQ Worker] Processing reminder for: ${email}`);

		// Fire the email!
		await sendEventReminderEmail(email, eventTitle);
	},
	{
		connection: createBullMQConnection(),
	},
);

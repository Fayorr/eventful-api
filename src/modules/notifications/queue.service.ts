// src/modules/notifications/queue.service.ts
import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import { createBullMQConnection } from '../../config/redis';

dotenv.config();

export const reminderQueue = new Queue('event-reminders', {
	connection: createBullMQConnection(), //  dedicated connection
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

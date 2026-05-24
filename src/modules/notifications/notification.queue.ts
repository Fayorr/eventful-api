import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// BullMQ requires an ioredis connection
const connection = new IORedis(
	process.env.REDIS_URL || 'redis://localhost:6379',
);

export const reminderQueue = new Queue('event-reminders', { connection });

/**
 * Helper to schedule a reminder
 * @param type 'creator_reminder' | 'eventee_reminder'
 * @param eventId The event ID
 * @param userId The user to notify
 * @param triggerDate When the notification should fire
 */
export const scheduleReminder = async (
	type: string,
	eventId: string,
	userId: string,
	triggerDate: Date,
) => {
	const delay = triggerDate.getTime() - Date.now();

	// Don't schedule if the time has already passed
	if (delay <= 0) return;

	await reminderQueue.add(
		type,
		{ eventId, userId },
		{ delay, jobId: `${type}-${eventId}-${userId}` }, // Unique Job ID prevents duplicates
	);
};

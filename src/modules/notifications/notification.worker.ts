import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import User from '../auth/user.model';
import Event from '../events/event.model';
import dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis(
	process.env.REDIS_URL || 'redis://localhost:6379',
);

const processReminder = async (job: Job) => {
	const { eventId, userId } = job.data;

	const user = await User.findById(userId);
	const event = await Event.findById(eventId);

	if (!user || !event) return;

	if (job.name === 'creator_reminder') {
		console.log(
			`📧 [EMAIL MOCK] To ${user.email}: Your event "${event.title}" is coming up soon!`,
		);
	} else if (job.name === 'eventee_reminder') {
		console.log(
			`📧 [EMAIL MOCK] To ${user.email}: Reminder! You have tickets for "${event.title}".`,
		);
	}
};

export const reminderWorker = new Worker('event-reminders', processReminder, {
	connection,
});

reminderWorker.on('completed', (job) => {
	console.log(`✅ Reminder Job ${job.id} has completed!`);
});

reminderWorker.on('failed', (job, err) => {
	console.error(`❌ Reminder Job ${job?.id} has failed: ${err.message}`);
});

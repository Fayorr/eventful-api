import { Queue } from 'bullmq';
import { createBullMQConnection } from '../../config/redis';

export const reminderQueue = new Queue('event-reminders', {
	connection: createBullMQConnection(),
});

export const scheduleReminder = async (input: {
	reminderId: string;
	email: string;
	eventTitle: string;
	sendAt: Date;
}) => {
	const delay = input.sendAt.getTime() - Date.now();
	if (delay <= 0) throw new Error('Reminder time must be in the future');
	const jobId = `reminder-${input.reminderId}`;
	await reminderQueue.add(
		'send-email',
		{
			reminderId: input.reminderId,
			email: input.email,
			eventTitle: input.eventTitle,
		},
		{
			delay,
			jobId,
			attempts: 5,
			backoff: { type: 'exponential', delay: 30_000 },
			removeOnComplete: 500,
			removeOnFail: 1_000,
		},
	);
	return jobId;
};

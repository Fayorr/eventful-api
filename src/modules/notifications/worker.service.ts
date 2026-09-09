import { ReminderStatus } from '@prisma/client';
import { Worker } from 'bullmq';
import prisma from '../../config/prisma';
import { createBullMQConnection } from '../../config/redis';
import { sendEventReminderEmail } from './email.service';

export const reminderWorker = new Worker(
	'event-reminders',
	async (job) => {
		const { reminderId, email, eventTitle } = job.data as {
			reminderId: string;
			email: string;
			eventTitle: string;
		};
		await sendEventReminderEmail(email, eventTitle);
		await prisma.reminder.update({
			where: { id: reminderId },
			data: { status: ReminderStatus.SENT, sentAt: new Date() },
		});
	},
	{ connection: createBullMQConnection(), concurrency: 10 },
);

reminderWorker.on('failed', async (job) => {
	const reminderId = job?.data?.reminderId as string | undefined;
	if (
		reminderId &&
		job &&
		job.attemptsMade >= (job.opts.attempts ?? 1)
	) {
		await prisma.reminder
			.update({
				where: { id: reminderId },
				data: { status: ReminderStatus.FAILED },
			})
			.catch((error) => console.error('Failed to mark reminder failed:', error));
	}
});

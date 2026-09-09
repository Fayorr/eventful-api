import { Resend } from 'resend';

const escapeHtml = (value: string) =>
	value.replace(
		/[&<>'"]/g,
		(character) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				"'": '&#39;',
				'"': '&quot;',
			})[character]!,
	);

export const sendEventReminderEmail = async (
	email: string,
	eventTitle: string,
) => {
	if (!process.env.RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY is not configured');
	}
	const resend = new Resend(process.env.RESEND_API_KEY);
	const safeTitle = escapeHtml(eventTitle);
	const { data, error } = await resend.emails.send({
		from: process.env.EMAIL_FROM || 'Eventful <onboarding@fayokunmiosho.com>',
		to: email,
		subject: `Upcoming Event Reminder: ${eventTitle}`,
		html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #10b981;">Eventful Reminder</h2>
        <p>Your event <strong>${safeTitle}</strong> is coming up soon.</p>
        <p>Please have your QR ticket ready at the venue.</p>
      </div>
    `,
	});
	if (error) throw new Error(error.message);
	return data;
};

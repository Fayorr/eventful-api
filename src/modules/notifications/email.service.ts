import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEventReminderEmail = async (
	email: string,
	eventTitle: string,
) => {
	try {
		const data = await resend.emails.send({
			from: 'Eventful <onboarding@resend.dev>', // In production, change this to your verified domain
			to: email,
			subject: `Upcoming Event Reminder: ${eventTitle}`,
			html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #10b981;">Eventful Reminder</h2>
          <p>Hi there,</p>
          <p>This is a quick reminder that your event <strong>${eventTitle}</strong> is happening soon!</p>
          <p>Please have your QR code ticket ready for scanning at the venue.</p>
          <br/>
          <p>Enjoy the event,<br/>The Eventful Team</p>
        </div>
      `,
		});
		console.log(`[Resend] Email sent successfully to ${email}`);
		return data;
	} catch (error) {
		console.error(`[Resend] Failed to send email:`, error);
		throw error;
	}
};

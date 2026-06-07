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
			from: 'Eventful <onboarding@fayokunmiosho.com>',
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
// Add this below your existing event reminder email function
export const sendVerificationEmail = async (
	email: string,
	name: string,
	token: string,
) => {
	const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
	const verifyLink = `${FRONTEND_URL}/verify-email/${token}`;

	try {
		// 1. Capture both data and error from Resend
		const { data, error } = await resend.emails.send({
			from: 'Eventful <onboarding@fayokunmiosho.com>',
			to: email,
			subject: 'Welcome to Eventful! Please verify your email',
			html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Hi ${name}, welcome to Eventful!</h2>
                    <p>We're excited to have you. Please verify your email address by clicking the button below:</p>
                    <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">
                        Verify My Account
                    </a>
                </div>
            `,
		});

		// 3. Manually throw if Resend returns an error object
		if (error) {
			console.error('[Resend API Error]:', error);
			throw new Error(error.message);
		}

		console.log(`[Resend] Verification email sent to ${email}`);
	} catch (error) {
		console.error(`[Resend] Failed to send verification email:`, error);
		throw error;
	}
};
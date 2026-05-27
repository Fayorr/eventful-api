import Ticket from './ticket.model';
import Event from '../events/event.model';
import { paystack } from '../../config/paystack';
import { generateQRCode } from '../../shared/utils/qrGenerator';
import mongoose from 'mongoose';

export const initializeTicketPurchase = async (eventId: string, user: any) => {
	const event = await Event.findById(eventId);
	if (!event) throw new Error('Event not found');

	if (event.ticketsSold >= event.capacity) {
		throw new Error('This event is sold out');
	}

	// If event is free, skip Paystack and generate ticket directly
	if (event.price === 0) {
		return await generateTicket(eventId, user.id, `FREE_${Date.now()}`);
	}

	// 👈 2. Fetch the full user from the database to guarantee we have their email
	const User = mongoose.model('User');
	const fullUser = await User.findById(user.id);

	if (!fullUser || !fullUser.email) {
		throw new Error('User email is required for payment');
	}

	// Define where Paystack should redirect the user after paying
	const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
	const callbackUrl = `${FRONTEND_URL}/payment/verify`;

	// Initialize Paystack payment for paid events
	const paymentData = await paystack.initializePayment(
		fullUser.email,
		event.price,
		{
			eventId,
			userId: user.id,
		},
		callbackUrl,
	);

	return {
		authorization_url: paymentData.authorization_url,
		reference: paymentData.reference,
	};
};;;

export const verifyAndGenerateTicket = async (reference: string) => {
	// 1. Check if ticket already exists for this reference
	const existingTicket = await Ticket.findOne({ paymentReference: reference });
	if (existingTicket) return existingTicket;

	// 2. Verify payment with Paystack
	const payment = await paystack.verifyPayment(reference);

	if (payment.status !== 'success') {
		throw new Error('Payment was not successful');
	}

	const { eventId, userId } = payment.metadata;

	// 3. Generate Ticket
	return await generateTicket(eventId, userId, reference);
};

// Helper function to create the ticket and update event capacity
const generateTicket = async (
	eventId: string,
	userId: string,
	reference: string,
) => {
	// Generate a unique string for the QR code payload
	const qrPayload = JSON.stringify({ eventId, userId, reference });
	const qrCodeUrl = await generateQRCode(qrPayload);

	const ticket = await Ticket.create({
		event: eventId,
		eventee: userId,
		paymentReference: reference,
		qrCodeUrl,
	});

	// Increment tickets sold on the event
	await Event.findByIdAndUpdate(eventId, { $inc: { ticketsSold: 1 } });

	return ticket;
};

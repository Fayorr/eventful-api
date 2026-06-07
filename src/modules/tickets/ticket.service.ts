import Ticket from './ticket.model';
import Event from '../events/event.model';
import { paystack } from '../../config/paystack';
import { generateQRCode } from '../../shared/utils/qrGenerator';
import mongoose from 'mongoose';
import { scheduleReminder } from '../notifications/queue.service';

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
	const FRONTEND_URL =
		process.env.FRONTEND_URL ||
		'https://eventfulapp-api.vercel.app' ||
		'http://localhost:5173';
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
};

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

export const markTicketAsScanned = async (
	reference: string,
	creatorId: string,
) => {
	// Find the ticket and populate the event to check ownership
	const ticket = await Ticket.findOne({ paymentReference: reference }).populate(
		'event',
	);

	if (!ticket) throw new Error('Ticket not found');
	if (ticket.isScanned) throw new Error('Ticket has already been scanned!');

	// Ensure the person scanning is the actual creator of the event
	const event: any = ticket.event;
	if (event.creator.toString() !== creatorId) {
		throw new Error('Unauthorized: You are not the creator of this event');
	}

	// Mark as scanned
	ticket.isScanned = true;
	await ticket.save();

	return {
		eventTitle: event.title,
		ticketId: ticket._id,
	};
};

// Helper function to create the ticket and update event capacity
const generateTicket = async (
	eventId: string,
	userId: string,
	reference: string,
) => {
	const FRONTEND_URL =
		process.env.FRONTEND_URL ||
		'https://eventfulapp-api.vercel.app' ||
		'http://localhost:5173';
	const qrPayload = `${FRONTEND_URL}/scan/${reference}`;
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
export const setPersonalReminder = async (
	ticketId: string,
	userId: string,
	delayInHours: number,
) => {
	const ticket = await Ticket.findOne({
		_id: ticketId,
		eventee: userId,
	}).populate('event');
	if (!ticket) throw new Error('Ticket not found or unauthorized');

	const event: any = ticket.event;
	const eventDate = new Date(event.date);

	// Calculate the exact date/time the email should be sent
	const reminderTime = new Date(
		eventDate.getTime() - delayInHours * 60 * 60 * 1000,
	);

	if (reminderTime.getTime() < Date.now()) {
		throw new Error('This reminder time has already passed!');
	}

	// Fetch the user to get their email
	const User = mongoose.model('User');
	const user = await User.findById(userId);

	// Add it to the BullMQ Queue
	await scheduleReminder(user!.email, event.title, reminderTime);

	return { scheduledFor: reminderTime };
};

export const getMyTickets = async (userId: string) => {
	const tickets = await Ticket.find({ eventee: userId })
		.populate('event', 'title description date location price')
		.sort({ createdAt: -1 }); // Newest first

	return tickets;
};
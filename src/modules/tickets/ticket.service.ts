import crypto from 'crypto';
import { PaymentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../config/prisma';
import { paystack, PaystackVerification } from '../../config/paystack';
import { CORS_ORIGINS, FRONTEND_URL } from '../../config/urls';
import { AppError } from '../../shared/errors/AppError';
import { generateQRCode } from '../../shared/utils/qrGenerator';
import { scheduleReminder } from '../notifications/queue.service';
import { presentEvent } from '../events/event.service';

const uuid = z.uuid();
const localCallbackOrigins = new Set([
	'http://localhost:5173',
	'http://127.0.0.1:5173',
]);

const resolvePaymentCallbackUrl = (requestedCallbackUrl?: unknown) => {
	if (requestedCallbackUrl === undefined) {
		return `${FRONTEND_URL}/payment/verify`;
	}
	if (typeof requestedCallbackUrl !== 'string') {
		throw new AppError(
			'Invalid payment return URL.',
			400,
			'PAYMENT_CALLBACK_INVALID',
		);
	}

	let origin: string;
	try {
		origin = new URL(requestedCallbackUrl).origin.replace(/\/$/, '');
	} catch {
		throw new AppError(
			'Invalid payment return URL.',
			400,
			'PAYMENT_CALLBACK_INVALID',
		);
	}

	if (!CORS_ORIGINS.includes(origin) && !localCallbackOrigins.has(origin)) {
		throw new AppError(
			'Payment return URL is not allowed.',
			400,
			'PAYMENT_CALLBACK_NOT_ALLOWED',
		);
	}

	return `${origin}/payment/verify`;
};

const publicTicket = <T extends { qrTokenHash: string }>(ticket: T) => {
	const { qrTokenHash: _secret, ...safeTicket } = ticket;
	return safeTicket;
};

const createQr = async () => {
	const token = crypto.randomBytes(32).toString('base64url');
	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const qrCodeUrl = await generateQRCode(`${FRONTEND_URL}/scan/${token}`);
	return { tokenHash, qrCodeUrl };
};

const issueTicket = async (
	eventId: string,
	eventeeId: string,
	paymentId?: string,
	providerData?: PaystackVerification,
) => {
	const existing = await prisma.ticket.findUnique({
		where: { eventId_eventeeId: { eventId, eventeeId } },
		include: { event: true },
	});
	if (existing) return publicTicket(existing);

	const qr = await createQr();
	return prisma.$transaction(
		async (tx) => {
			if (paymentId) {
				const existingPaidTicket = await tx.ticket.findUnique({
					where: { paymentId },
					include: { event: true },
				});
				if (existingPaidTicket) return publicTicket(existingPaidTicket);
			}

			const inventory = await tx.event.updateMany({
				where: { id: eventId, ticketsSold: { lt: prisma.event.fields.capacity } },
				data: { ticketsSold: { increment: 1 } },
			});
			if (inventory.count !== 1) {
				throw new AppError('This event is sold out.', 409, 'EVENT_SOLD_OUT');
			}

			const ticket = await tx.ticket.create({
				data: {
					eventId,
					eventeeId,
					paymentId,
					qrTokenHash: qr.tokenHash,
					qrCodeUrl: qr.qrCodeUrl,
				},
				include: { event: true },
			});

			if (paymentId) {
				await tx.payment.update({
					where: { id: paymentId },
					data: {
						status: PaymentStatus.PAID,
						paidAt: providerData?.paid_at
							? new Date(providerData.paid_at)
							: new Date(),
						providerData: providerData as unknown as Prisma.InputJsonValue,
					},
				});
			}

			return publicTicket(ticket);
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
};

export const initializeTicketPurchase = async (
	eventIdInput: string,
	user: { id: string; email: string },
	requestedCallbackUrl?: unknown,
) => {
	const eventId = uuid.parse(eventIdInput);
	const event = await prisma.event.findUnique({ where: { id: eventId } });
	if (!event) throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
	if (event.date <= new Date()) throw new AppError('This event has ended.', 409);
	if (event.ticketsSold >= event.capacity) {
		throw new AppError('This event is sold out.', 409, 'EVENT_SOLD_OUT');
	}
	const existingTicket = await prisma.ticket.findUnique({
		where: { eventId_eventeeId: { eventId, eventeeId: user.id } },
	});
	if (existingTicket) {
		throw new AppError('You already have a ticket for this event.', 409);
	}

	if (event.priceKobo === 0) {
		return { kind: 'ticket' as const, ticket: await issueTicket(eventId, user.id) };
	}

	const callbackUrl = resolvePaymentCallbackUrl(requestedCallbackUrl);
	const reference = `EVT_${crypto.randomUUID().replace(/-/g, '')}`;
	const payment = await prisma.payment.create({
		data: {
			reference,
			amountKobo: event.priceKobo,
			eventId,
			eventeeId: user.id,
		},
	});
	try {
		const initialized = await paystack.initializePayment(
			user.email,
			event.priceKobo,
			reference,
			{ paymentId: payment.id, eventId, userId: user.id },
			callbackUrl,
		);
		return {
			kind: 'payment' as const,
			authorizationUrl: initialized.authorization_url,
			reference: initialized.reference,
		};
	} catch (error) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.FAILED },
		});
		throw error;
	}
};

export const verifyAndGenerateTicket = async (
	reference: string,
	eventeeId: string,
) => {
	const paymentRecord = await prisma.payment.findUnique({ where: { reference } });
	if (!paymentRecord || paymentRecord.eventeeId !== eventeeId) {
		throw new AppError('Payment not found.', 404, 'PAYMENT_NOT_FOUND');
	}
	const existing = await prisma.ticket.findUnique({
		where: { paymentId: paymentRecord.id },
	});
	if (existing) return publicTicket(existing);

	const verified = await paystack.verifyPayment(reference);
	const valid =
		verified.status === 'success' &&
		verified.reference === paymentRecord.reference &&
		verified.amount === paymentRecord.amountKobo &&
		verified.currency?.toUpperCase() === paymentRecord.currency;
	if (!valid) {
		throw new AppError('Payment verification failed.', 400, 'PAYMENT_INVALID');
	}

	return issueTicket(
		paymentRecord.eventId,
		paymentRecord.eventeeId,
		paymentRecord.id,
		verified,
	);
};

export const markTicketAsScanned = async (token: string, creatorId: string) => {
	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	return prisma.$transaction(async (tx) => {
		const ticket = await tx.ticket.findUnique({
			where: { qrTokenHash: tokenHash },
			include: { event: true, eventee: { select: { id: true, name: true } } },
		});
		if (!ticket) throw new AppError('Ticket not found.', 404, 'TICKET_NOT_FOUND');
		if (ticket.event.creatorId !== creatorId) {
			throw new AppError('You do not own this event.', 403);
		}
		if (ticket.scannedAt) {
			throw new AppError('Ticket has already been scanned.', 409, 'ALREADY_SCANNED');
		}

		const updated = await tx.ticket.updateMany({
			where: { id: ticket.id, scannedAt: null },
			data: { scannedAt: new Date() },
		});
		if (updated.count !== 1) {
			throw new AppError('Ticket has already been scanned.', 409, 'ALREADY_SCANNED');
		}
		return {
			ticketId: ticket.id,
			eventTitle: ticket.event.title,
			eventee: ticket.eventee,
			scannedAt: new Date(),
		};
	});
};

export const setPersonalReminder = async (
	ticketIdInput: string,
	userId: string,
	hoursBeforeInput: unknown,
) => {
	const ticketId = uuid.parse(ticketIdInput);
	const hoursBefore = z.coerce.number().positive().max(8760).parse(hoursBeforeInput);
	const ticket = await prisma.ticket.findFirst({
		where: { id: ticketId, eventeeId: userId },
		include: { event: true, eventee: true },
	});
	if (!ticket) throw new AppError('Ticket not found.', 404, 'TICKET_NOT_FOUND');
	const scheduledFor = new Date(
		ticket.event.date.getTime() - hoursBefore * 60 * 60 * 1000,
	);
	if (scheduledFor <= new Date()) {
		throw new AppError('That reminder time has already passed.', 400);
	}

	const reminder = await prisma.reminder.create({
		data: { eventId: ticket.eventId, ticketId, userId, scheduledFor },
	});
	const jobId = await scheduleReminder({
		reminderId: reminder.id,
		email: ticket.eventee.email,
		eventTitle: ticket.event.title,
		sendAt: scheduledFor,
	});
	await prisma.reminder.update({ where: { id: reminder.id }, data: { jobId } });
	return { id: reminder.id, scheduledFor, hoursBefore };
};

export const getMyTickets = async (userId: string) => {
	const tickets = await prisma.ticket.findMany({
		where: { eventeeId: userId },
		include: { event: true, payment: { select: { status: true, reference: true } } },
		orderBy: { createdAt: 'desc' },
	});
	return tickets.map((ticket) => {
		const safe = publicTicket(ticket);
		return { ...safe, event: presentEvent(safe.event) };
	});
};

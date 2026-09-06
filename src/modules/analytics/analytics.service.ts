import { PaymentStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import { AppError } from '../../shared/errors/AppError';

export const getCreatorAnalytics = async (creatorId: string) => {
	const eventFilter = { event: { creatorId } };
	const [totalEvents, totalTicketsSold, totalAttendees, revenue] =
		await prisma.$transaction([
			prisma.event.count({ where: { creatorId } }),
			prisma.ticket.count({ where: eventFilter }),
			prisma.ticket.count({ where: { ...eventFilter, scannedAt: { not: null } } }),
			prisma.payment.aggregate({
				where: { ...eventFilter, status: PaymentStatus.PAID },
				_sum: { amountKobo: true },
			}),
		]);
	const totalRevenueKobo = revenue._sum.amountKobo ?? 0;
	return {
		totalEvents,
		totalTicketsSold,
		totalAttendees,
		attendanceRate:
			totalTicketsSold === 0 ? 0 : totalAttendees / totalTicketsSold,
		totalRevenueKobo,
		totalRevenue: totalRevenueKobo / 100,
		currency: 'NGN',
	};
};

export const getEventSpecificAnalytics = async (
	eventId: string,
	creatorId: string,
) => {
	const event = await prisma.event.findFirst({
		where: { id: eventId, creatorId },
		select: { id: true, title: true, capacity: true },
	});
	if (!event) throw new AppError('Event not found or not owned by you.', 404);

	const [totalTicketsSold, totalAttendees, revenue] = await prisma.$transaction([
		prisma.ticket.count({ where: { eventId } }),
		prisma.ticket.count({ where: { eventId, scannedAt: { not: null } } }),
		prisma.payment.aggregate({
			where: { eventId, status: PaymentStatus.PAID },
			_sum: { amountKobo: true },
		}),
	]);
	const totalRevenueKobo = revenue._sum.amountKobo ?? 0;
	return {
		event,
		totalTicketsSold,
		totalAttendees,
		attendanceRate:
			totalTicketsSold === 0 ? 0 : totalAttendees / totalTicketsSold,
		capacityUsed: event.capacity === 0 ? 0 : totalTicketsSold / event.capacity,
		totalRevenueKobo,
		totalRevenue: totalRevenueKobo / 100,
		currency: 'NGN',
	};
};

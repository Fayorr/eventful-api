import { PaymentStatus } from '@prisma/client';
import prisma from '../../config/prisma';

export const getCreatorPaymentDetails = async (creatorId: string) => {
	const transactions = await prisma.payment.findMany({
		where: { event: { creatorId }, status: PaymentStatus.PAID },
		include: {
			event: { select: { id: true, title: true, date: true } },
			eventee: { select: { id: true, name: true, email: true } },
			ticket: { select: { id: true, scannedAt: true } },
		},
		orderBy: { paidAt: 'desc' },
	});

	const totalRevenueKobo = transactions.reduce(
		(sum, payment) => sum + payment.amountKobo,
		0,
	);
	return {
		currency: 'NGN',
		totalRevenueKobo,
		totalRevenue: totalRevenueKobo / 100,
		transactionCount: transactions.length,
		transactions: transactions.map(({ amountKobo, providerData: _data, ...item }) => ({
			...item,
			amountKobo,
			amount: amountKobo / 100,
		})),
	};
};

const prisma = {
	event: { findUnique: jest.fn(), fields: { capacity: 'capacity' } },
	ticket: { findUnique: jest.fn() },
	payment: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
	reminder: { create: jest.fn(), update: jest.fn() },
	$transaction: jest.fn(),
};
const initializePayment = jest.fn();
const verifyPayment = jest.fn();

jest.mock('../src/config/prisma', () => ({ __esModule: true, default: prisma }));
jest.mock('../src/config/paystack', () => ({
	paystack: { initializePayment, verifyPayment },
}));
jest.mock('../src/shared/utils/qrGenerator', () => ({
	generateQRCode: jest.fn().mockResolvedValue('https://images.test/qr.png'),
}));
jest.mock('../src/modules/notifications/queue.service', () => ({
	scheduleReminder: jest.fn(),
}));
jest.mock('../src/config/redis', () => ({
	__esModule: true,
	default: { get: jest.fn(), setex: jest.fn(), incr: jest.fn() },
}));

import {
	initializeTicketPurchase,
	verifyAndGenerateTicket,
} from '../src/modules/tickets/ticket.service';

describe('ticket payment safety', () => {
	beforeEach(() => jest.clearAllMocks());

	it('sends Paystack the exact integer-kobo amount', async () => {
		prisma.event.findUnique.mockResolvedValue({
			id: '2f10c346-d889-441b-a7d8-0cfad56f2054',
			date: new Date(Date.now() + 86_400_000),
			priceKobo: 250000,
			ticketsSold: 0,
			capacity: 20,
		});
		prisma.ticket.findUnique.mockResolvedValue(null);
		prisma.payment.create.mockResolvedValue({ id: 'payment-id' });
		initializePayment.mockResolvedValue({
			authorization_url: 'https://paystack.test',
			reference: 'EVT_reference',
		});

		await initializeTicketPurchase(
			'2f10c346-d889-441b-a7d8-0cfad56f2054',
			{ id: 'user-id', email: 'user@test.com' },
		);
		expect(initializePayment.mock.calls[0][1]).toBe(250000);
	});

	it('rejects a successful-looking payment with the wrong amount', async () => {
		prisma.payment.findUnique.mockResolvedValue({
			id: 'payment-id',
			reference: 'EVT_reference',
			eventId: 'event-id',
			eventeeId: 'user-id',
			amountKobo: 250000,
			currency: 'NGN',
		});
		prisma.ticket.findUnique.mockResolvedValue(null);
		verifyPayment.mockResolvedValue({
			status: 'success',
			reference: 'EVT_reference',
			amount: 100,
			currency: 'NGN',
		});

		await expect(
			verifyAndGenerateTicket('EVT_reference', 'user-id'),
		).rejects.toMatchObject({ code: 'PAYMENT_INVALID' });
	});
});

const event = { count: jest.fn() };
const ticket = { count: jest.fn() };
const payment = { aggregate: jest.fn() };
const transaction = jest.fn((operations: Promise<unknown>[]) => Promise.all(operations));

jest.mock('../src/config/prisma', () => ({
	__esModule: true,
	default: { event, ticket, payment, $transaction: transaction },
}));

import { getCreatorAnalytics } from '../src/modules/analytics/analytics.service';

it('reports ticket, attendance, revenue, and conversion analytics', async () => {
	event.count.mockResolvedValue(3);
	ticket.count.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
	payment.aggregate.mockResolvedValue({ _sum: { amountKobo: 500000 } });
	const result = await getCreatorAnalytics('creator-id');
	expect(result).toMatchObject({
		totalEvents: 3,
		totalTicketsSold: 10,
		totalAttendees: 7,
		attendanceRate: 0.7,
		totalRevenue: 5000,
	});
});

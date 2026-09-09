const payment = { findMany: jest.fn() };
jest.mock('../src/config/prisma', () => ({
	__esModule: true,
	default: { payment },
}));

import { getCreatorPaymentDetails } from '../src/modules/payments/payment.service';

it('calculates a creator ledger from paid payment records', async () => {
	payment.findMany.mockResolvedValue([
		{ amountKobo: 100000, providerData: {}, id: '1' },
		{ amountKobo: 250050, providerData: {}, id: '2' },
	]);
	const ledger = await getCreatorPaymentDetails('creator-id');
	expect(ledger.totalRevenueKobo).toBe(350050);
	expect(ledger.totalRevenue).toBe(3500.5);
	expect(ledger.transactionCount).toBe(2);
});

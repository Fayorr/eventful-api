const event = { create: jest.fn(), findUnique: jest.fn() };
const redis = { incr: jest.fn(), get: jest.fn(), setex: jest.fn() };

jest.mock('../src/config/prisma', () => ({
	__esModule: true,
	default: { event },
}));
jest.mock('../src/config/redis', () => ({ __esModule: true, default: redis }));
jest.mock('../src/modules/notifications/queue.service', () => ({
	scheduleReminder: jest.fn(),
}));

import { createEvent, getShareLinks } from '../src/modules/events/event.service';

describe('event service', () => {
	beforeEach(() => jest.clearAllMocks());

	it('stores prices as integer kobo', async () => {
		event.create.mockImplementation(async ({ data }: any) => ({
			id: 'event-id',
			...data,
			ticketsSold: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
			creator: { id: data.creatorId, name: 'Creator', email: 'c@test.com' },
		}));
		const result = await createEvent(
			{
				title: 'Lagos Tech Meetup',
				description: 'A practical backend engineering meetup.',
				date: new Date(Date.now() + 86_400_000),
				location: 'Lagos',
				price: 1250.5,
				capacity: 100,
			},
			'creator-id',
		);
		expect(event.create.mock.calls[0][0].data.priceKobo).toBe(125050);
		expect(result.price).toBe(1250.5);
	});

	it('builds share links to the public event page', async () => {
		event.findUnique.mockResolvedValue({
			id: 'event-id',
			title: 'Eventful Live',
			priceKobo: 0,
			creator: {},
		});
		const links = await getShareLinks('event-id');
		expect(links.copyUrl).toContain('/events/event-id');
		expect(links.whatsapp).toContain('Eventful');
	});
});

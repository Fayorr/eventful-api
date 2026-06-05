import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Event from '../src/modules/events/event.model';
import User from '../src/modules/auth/user.model';
import Ticket from '../src/modules/tickets/ticket.model';
import dotenv from 'dotenv';

// 1. Mock External Services
jest.mock('../src/config/paystack', () => ({
	paystack: {
		initializePayment: jest.fn().mockResolvedValue({
			authorization_url: 'https://mock-paystack.com/checkout',
			reference: 'mock-ref-123',
		}),
		verifyPayment: jest.fn().mockResolvedValue({
			status: 'success',
			metadata: { eventId: 'mock_event_id', userId: 'mock_user_id' },
		}),
	},
}));

jest.mock('../src/shared/utils/qrGenerator', () => ({
	generateQRCode: jest
		.fn()
		.mockResolvedValue('https://mock-cloudinary.com/qr.png'),
}));

jest.mock('../src/modules/notifications/queue.service', () => ({
	scheduleReminder: jest.fn().mockResolvedValue(true),
}));

dotenv.config();

let creatorToken: string;
let creatorId: string;
let attendeeToken: string;
let attendeeId: string;
let paidEventId: string;
let freeEventId: string;
let ticketId: string;

beforeAll(async () => {
	const workerId = process.env.JEST_WORKER_ID || '3';
	await mongoose.connect(
		process.env.TEST_MONGO_URI ||
			`mongodb://localhost:27017/eventful_test_tickets_${workerId}`,
	);

	// Setup Creator
	const creatorRes = await request(app).post('/api/v1/auth/register').send({
		name: 'Creator',
		email: 'c@test.com',
		password: 'pass',
		role: 'creator',
	});
	creatorToken = creatorRes.body.data.token;
	creatorId = creatorRes.body.data.user.id;

	// Setup Attendee
	const attendeeRes = await request(app).post('/api/v1/auth/register').send({
		name: 'Attendee',
		email: 'a@test.com',
		password: 'pass',
		role: 'attendee',
	});
	attendeeToken = attendeeRes.body.data.token;
	attendeeId = attendeeRes.body.data.user.id;

	// Create a Paid Event
	const paidEventRes = await request(app)
		.post('/api/v1/events')
		.set('Authorization', `Bearer ${creatorToken}`)
		.send({
			title: 'Paid Event',
			description: '$$$',
			date: '2026-10-10T10:00:00Z',
			location: 'Virtual',
			price: 1000,
			capacity: 50,
		});
	paidEventId = paidEventRes.body.data._id;

	// Create a Free Event
	const freeEventRes = await request(app)
		.post('/api/v1/events')
		.set('Authorization', `Bearer ${creatorToken}`)
		.send({
			title: 'Free Event',
			description: 'Free',
			date: '2026-10-11T10:00:00Z',
			location: 'Virtual',
			price: 0,
			capacity: 50,
		});
	freeEventId = freeEventRes.body.data._id;
}, 60000);

afterAll(async () => {
	await Event.deleteMany({});
	await User.deleteMany({});
	await Ticket.deleteMany({});
	await mongoose.connection.close();
}, 60000);

describe('Ticket & Checkout Endpoints', () => {
	it('should initialize Paystack for a paid event', async () => {
		const res = await request(app)
			.post(`/api/v1/tickets/buy/${paidEventId}`)
			.set('Authorization', `Bearer ${attendeeToken}`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.data).toHaveProperty('authorization_url');
		expect(res.body.data.reference).toBe('mock-ref-123');
	});

	it('should generate ticket directly for a free event', async () => {
		const res = await request(app)
			.post(`/api/v1/tickets/buy/${freeEventId}`)
			.set('Authorization', `Bearer ${attendeeToken}`);

		expect(res.statusCode).toEqual(200);
		// Because it's free, the service returns the ticket object directly
		expect(res.body.data).toHaveProperty('qrCodeUrl');
		ticketId = res.body.data._id;
	});

	it('should allow the creator to scan and validate a ticket', async () => {
		// Find the reference of the free ticket we just bought
		const ticket = await Ticket.findById(ticketId);

		const res = await request(app)
			.post(`/api/v1/tickets/scan/${ticket?.paymentReference}`)
			.set('Authorization', `Bearer ${creatorToken}`); // Must be scanned by creator

		expect(res.statusCode).toEqual(200);
		expect(res.body.message).toContain('Ticket verified');
	});

	it('should reject scan if already scanned', async () => {
		const ticket = await Ticket.findById(ticketId);
		const res = await request(app)
			.post(`/api/v1/tickets/scan/${ticket?.paymentReference}`)
			.set('Authorization', `Bearer ${creatorToken}`);

		expect(res.statusCode).toEqual(400);
		expect(res.body.message).toBe('Ticket has already been scanned!');
	});

	it('should allow attendee to set a personal reminder', async () => {
		const res = await request(app)
			.post(`/api/v1/tickets/${ticketId}/reminder`)
			.set('Authorization', `Bearer ${attendeeToken}`)
			.send({ delayInHours: 24 });

		expect(res.statusCode).toEqual(200);
		expect(res.body.status).toBe('success');
	});
});

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Event from '../src/modules/events/event.model';
import User from '../src/modules/auth/user.model';
import redisClient from '../src/config/redis';
import dotenv from 'dotenv';

dotenv.config();

let creatorToken: string;
let eventId: string;

beforeAll(async () => {
	const workerId = process.env.JEST_WORKER_ID || '2';
	await mongoose.connect(
		process.env.TEST_MONGO_URI ||
			`mongodb://localhost:27017/eventful_test_events_${workerId}`,
	);

	if (redisClient.status !== 'ready') {
		await redisClient.connect();
	}

	const creatorRes = await request(app).post('/api/v1/auth/register').send({
		name: 'Event Creator',
		email: 'creator_events@test.com',
		password: 'password123',
		role: 'creator',
	});
	creatorToken = creatorRes.body.data.token;
}, 60000);

afterAll(async () => {
	await Event.deleteMany({});
	await User.deleteMany({});
	await mongoose.connection.close();
	if (redisClient.status === 'ready') await redisClient.quit();
}, 60000);

describe('Event Endpoints', () => {
	it('should create an event if authenticated as a creator', async () => {
		const res = await request(app)
			.post('/api/v1/events')
			.set('Authorization', `Bearer ${creatorToken}`)
			.send({
				title: 'Backend Meetup',
				description: 'Tech talks.',
				date: '2026-08-15T10:00:00Z',
				location: 'Lagos',
				price: 5000,
				capacity: 150,
			});

		expect(res.statusCode).toEqual(201);
		expect(res.body.status).toBe('success');
		eventId = res.body.data._id; // Save for next tests
	});

	it('should fetch all events successfully', async () => {
		const res = await request(app).get('/api/v1/events');
		expect(res.statusCode).toEqual(200);
		expect(res.body.data.length).toBeGreaterThan(0);
	});

	it('should fetch a single event by ID', async () => {
		const res = await request(app).get(`/api/v1/events/${eventId}`);
		expect(res.statusCode).toEqual(200);
		expect(res.body.data.title).toBe('Backend Meetup');
	});

	it('should generate share links for an event', async () => {
		const res = await request(app).get(`/api/v1/events/${eventId}/share`);
		expect(res.statusCode).toEqual(200);
		expect(res.body.data).toHaveProperty('whatsapp');
		expect(res.body.data).toHaveProperty('twitter');
	});
});

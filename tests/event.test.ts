import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Event from '../src/modules/events/event.model';
import User from '../src/modules/auth/user.model';
import redisClient from '../src/config/redis';
import dotenv from 'dotenv';

dotenv.config();

let creatorToken: string;
let creatorId: string;

// Setup: Connect to Test DB, initialize Redis, and create a mock creator
beforeAll(async () => {
	await mongoose.connect(
		process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/eventful_test',
	);

	if (!redisClient.isOpen) {
		await redisClient.connect();
	}

	// Register a user to get a valid token for protected routes
	const res = await (request(app) as any).post('/api/v1/auth/register').send({
		name: 'Event Creator',
		email: 'creator_events@test.com',
		password: 'password123',
		role: 'creator',
	});

	creatorToken = res.body.data.token;
	creatorId = res.body.data.user.id;
});

// Teardown: Clean up the database and close connections
afterAll(async () => {
	await Event.deleteMany({});
	await User.deleteMany({});
	await mongoose.connection.close();

	if (redisClient.isOpen) {
		await redisClient.quit();
	}
});

describe('Event Endpoints', () => {
	it('should create an event if authenticated as a creator', async () => {
		const res = await (request(app) as any)
			.post('/api/v1/events')
			.set('Authorization', `Bearer ${creatorToken}`)
			.send({
				title: 'Backend Developers Meetup 2026',
				description: 'Networking and tech talks for software engineers.',
				date: '2026-08-15T10:00:00Z',
				location: 'Lagos',
				price: 0,
				capacity: 150,
			});

		expect(res.statusCode).toEqual(201);
		expect(res.body.status).toBe('success');
		expect(res.body.data.title).toBe('Backend Developers Meetup 2026');
		expect(res.body.data.location).toBe('Lagos');
	});

	it('should fail to create an event without authentication', async () => {
		const res = await (request(app) as any).post('/api/v1/events').send({
			title: 'Ghost Event',
			description: 'No token provided.',
			date: '2026-09-01T10:00:00Z',
			location: 'Virtual',
			price: 5000,
			capacity: 100,
		});

		expect(res.statusCode).toEqual(401);
		expect(res.body.status).toBe('error');
	});

	it('should fetch all events successfully', async () => {
		const res = await (request(app) as any).get('/api/v1/events');

		expect(res.statusCode).toEqual(200);
		expect(res.body.status).toBe('success');
		expect(Array.isArray(res.body.data)).toBeTruthy();
		expect(res.body.data.length).toBeGreaterThan(0);
	});
});

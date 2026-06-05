import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import Event from '../src/modules/events/event.model';
import User from '../src/modules/auth/user.model';
import dotenv from 'dotenv';

dotenv.config();

let creatorToken: string;
let eventId: string;

beforeAll(async () => {
	const workerId = process.env.JEST_WORKER_ID || '4';
	await mongoose.connect(
		process.env.TEST_MONGO_URI ||
			`mongodb://localhost:27017/eventful_test_analytics_${workerId}`,
	);

	const creatorRes = await request(app).post('/api/v1/auth/register').send({
		name: 'Creator',
		email: 'an@test.com',
		password: 'pass',
		role: 'creator',
	});
	creatorToken = creatorRes.body.data.token;

	const eventRes = await request(app)
		.post('/api/v1/events')
		.set('Authorization', `Bearer ${creatorToken}`)
		.send({
			title: 'Stats Event',
			description: 'Stats',
			date: '2026-10-10T10:00:00Z',
			location: 'Virtual',
			price: 1000,
			capacity: 50,
		});
	eventId = eventRes.body.data._id;
}, 60000);

afterAll(async () => {
	await Event.deleteMany({});
	await User.deleteMany({});
	await mongoose.connection.close();
}, 60000);

describe('Analytics Endpoints', () => {
	it('should get global analytics for creator', async () => {
		const res = await request(app)
			.get('/api/v1/analytics/global')
			.set('Authorization', `Bearer ${creatorToken}`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.data).toBeDefined();
	});

	it('should get specific event analytics', async () => {
		const res = await request(app)
			.get(`/api/v1/analytics/event/${eventId}`)
			.set('Authorization', `Bearer ${creatorToken}`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.data).toBeDefined();
	});
});

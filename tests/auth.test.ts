import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import User from '../src/modules/auth/user.model';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
	// FIX: Append JEST_WORKER_ID so parallel tests don't overwrite the same database
	const workerId = process.env.JEST_WORKER_ID || '1';
	await mongoose.connect(
		process.env.TEST_MONGO_URI ||
			`mongodb://localhost:27017/eventful_test_auth_${workerId}`,
	);
}, 60000);

afterAll(async () => {
	await User.deleteMany({});
	await mongoose.connection.close();
}, 60000);

describe('Auth Endpoints', () => {
	it('should register a new user successfully', async () => {
		const res = await request(app).post('/api/v1/auth/register').send({
			name: 'Test Creator',
			email: 'creator@test.com',
			password: 'password123',
			role: 'creator',
		});
		expect(res.statusCode).toEqual(201);
		expect(res.body.status).toBe('success');
		expect(res.body.data).toHaveProperty('token');
	});

	it('should login successfully with valid credentials', async () => {
		const res = await request(app).post('/api/v1/auth/login').send({
			email: 'creator@test.com',
			password: 'password123',
		});
		expect(res.statusCode).toEqual(200);
		expect(res.body.status).toBe('success');
		expect(res.body.data).toHaveProperty('token');
	});

	it('should not login with incorrect password', async () => {
		const res = await request(app).post('/api/v1/auth/login').send({
			email: 'creator@test.com',
			password: 'wrongpassword',
		});
		expect(res.statusCode).toEqual(401);
	});
});

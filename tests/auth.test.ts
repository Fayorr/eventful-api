import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import User from '../src/modules/auth/user.model';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
	// Connect to a test database instead of production
	await mongoose.connect(
		process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/eventful_test',
	);
});

afterAll(async () => {
	await User.deleteMany({});
	await mongoose.connection.close();
});

describe('Auth Endpoints', () => {
	it('should register a new user successfully', async () => {
		const res = await (request(app) as any).post('/api/v1/auth/register').send({
			name: 'Test Creator',
			email: 'creator@test.com',
			password: 'password123',
			role: 'creator',
		});

		expect(res.statusCode).toEqual(201);
		expect(res.body.status).toBe('success');
		expect(res.body.data).toHaveProperty('token');
		expect(res.body.data.user.email).toBe('creator@test.com');
	});

	it('should not register a user with an existing email', async () => {
		const res = await (request(app) as any).post('/api/v1/auth/register').send({
			name: 'Duplicate',
			email: 'creator@test.com',
			password: 'password123',
		});

		expect(res.statusCode).toEqual(400);
		expect(res.body.message).toBe('Email is already registered');
	});
});

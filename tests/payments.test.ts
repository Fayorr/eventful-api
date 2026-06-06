import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import User from '../src/modules/auth/user.model';
import dotenv from 'dotenv';

dotenv.config();
let creatorToken: string;

beforeAll(async () => {
	const workerId = process.env.JEST_WORKER_ID || '5';
	await mongoose.connect(
		process.env.TEST_MONGO_URI ||
			`mongodb://localhost:27017/eventful_test_payments_${workerId}`,
	);

	const creatorRes = await request(app)
		.post('/api/v1/auth/register')
		.send({
			name: 'Finance Creator',
			email: `finance_creator_${workerId}@test.com`,
			password: 'pass',
			role: 'creator',
		});
	creatorToken = creatorRes.body.data.token;
}, 30000);

afterAll(async () => {
	await User.deleteMany({});
	await mongoose.connection.close();
});

describe('Payments Ledger Endpoints', () => {
	it('should retrieve payment history for creator', async () => {
		const res = await request(app)
			.get('/api/v1/payments/history')
			.set('Authorization', `Bearer ${creatorToken}`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.status).toBe('success');
		expect(res.body.data).toHaveProperty('totalRevenue');
		expect(res.body.data).toHaveProperty('transactions');
	});
});
//     throw new Error('Function not implemented.');
// }

// function expect(statusCode: number) {
//     throw new Error('Function not implemented.');
// }

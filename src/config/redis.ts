import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// 1. Create a strict, shared options object
const redisOptions = {
	maxRetriesPerRequest: null, // Absolutely required by BullMQ
	enableReadyCheck: false,
	keepAlive: 10000,
	// CRITICAL FOR UPSTASH: Prevents the ECONNRESET TLS drop
	tls: REDIS_URL.startsWith('rediss://')
		? { rejectUnauthorized: false }
		: undefined,
};

// 2. The main client for standard caching (your event.service.ts)
const redisClient = new Redis(REDIS_URL, redisOptions);

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () =>
	console.log('✅ Main Redis connected successfully'),
);

// 3. EXPORT A DEDICATED BUILDER FOR BULLMQ
// BullMQ needs its own isolated connections so it doesn't overwrite options
export const createBullMQConnection = () => {
	return new Redis(REDIS_URL, redisOptions);
};

export const connectRedis = async () => {
	try {
		await redisClient.ping();
		console.log('✅ Redis connection verified');
	} catch (error) {
		console.error('❌ Redis connection failed:', error);
		throw error;
	}
};

export default redisClient;

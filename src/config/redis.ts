import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = new Redis(
	process.env.REDIS_URL || 'redis://127.0.0.1:6379',
	{
		// 1. CRITICAL FOR BULLMQ: Prevents the 20-retry crash
		maxRetriesPerRequest: null,

		// 2. Tells Redis to send a heartbeat so Upstash doesn't drop the connection for being "idle"
		keepAlive: 10000,

		// 3. If the connection does drop, this tells it exactly how to reconnect
		retryStrategy(times) {
			const delay = Math.min(times * 50, 2000);
			return delay;
		},
	},
);

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis connected successfully'));
redisClient.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

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

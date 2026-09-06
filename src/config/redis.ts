import { Redis, RedisOptions } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const sharedOptions: RedisOptions = {
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
	keepAlive: 10_000,
	lazyConnect: true,
};

const redisClient = new Redis(redisUrl, sharedOptions);

redisClient.on('error', (error) =>
	console.error('❌ Redis client error:', error.message),
);

export const createBullMQConnection = () =>
	new Redis(redisUrl, { ...sharedOptions, lazyConnect: false });

export const connectRedis = async () => {
	if (redisClient.status === 'wait') await redisClient.connect();
	await redisClient.ping();
	console.log('✅ Redis connected');
};

export const disconnectRedis = () => redisClient.quit();

export default redisClient;

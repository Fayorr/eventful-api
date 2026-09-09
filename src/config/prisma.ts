import { PrismaClient } from '@prisma/client';

declare global {
	// eslint-disable-next-line no-var
	var eventfulPrisma: PrismaClient | undefined;
}

const prisma = global.eventfulPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
	global.eventfulPrisma = prisma;
}

export const connectDatabase = async () => {
	await prisma.$connect();
	await prisma.$queryRaw`SELECT 1`;
	console.log('✅ PostgreSQL connected');
};

export const disconnectDatabase = () => prisma.$disconnect();

export default prisma;

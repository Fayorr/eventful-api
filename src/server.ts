import dotenv from 'dotenv';
import connectDB from './config/db';
import { connectRedis } from './config/redis';

dotenv.config();

const PORT = process.env.PORT || 5001;

const startServer = async () => {
	try {
		// 1. Connect to Infrastructure FIRST
		await connectDB();
		await connectRedis();

		// 2. Import the Express app ONLY AFTER Redis is fully connected.
		// We use 'require' here to dynamically load it at runtime instead of at the top of the file.
		const app = require('./app').default;

		// 3. Start listening for traffic
		app.listen(PORT, () => {
			console.log(`🚀 Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error('❌ Error starting server:', error);
		process.exit(1);
	}
};

startServer();

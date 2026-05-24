import app from './app';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eventful';

const startServer = async () => {
	try {
		// Connect to Database
		await mongoose.connect(MONGO_URI);
		console.log('✅ Database connected successfully');

		// Initialize Redis connection here later

		app.listen(PORT, () => {
			console.log(`🚀 Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error('❌ Error starting server:', error);
		process.exit(1);
	}
};

startServer();

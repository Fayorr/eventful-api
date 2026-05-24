import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
	try {
		const MONGO_URI =
			process.env.MONGO_URI || 'mongodb://localhost:27017/eventful';
		const conn = await mongoose.connect(MONGO_URI);
		console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
	} catch (error: any) {
		console.error(`❌ Error connecting to MongoDB: ${error.message}`);
		// Exit process with failure
		process.exit(1);
	}
};

export default connectDB;

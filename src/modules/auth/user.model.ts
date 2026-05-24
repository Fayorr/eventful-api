import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
	name: string;
	email: string;
	password?: string;
	role: 'creator' | 'eventee';
	createdAt: Date;
	updatedAt: Date;
}

const UserSchema: Schema = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true, lowercase: true },
		password: { type: String, required: true, select: false },
		role: { type: String, enum: ['creator', 'eventee'], default: 'eventee' },
	},
	{ timestamps: true },
);

export default mongoose.model<IUser>('User', UserSchema);

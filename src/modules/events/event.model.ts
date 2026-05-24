import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
	title: string;
	description: string;
	date: Date;
	location: string;
	price: number; // 0 for free events
	capacity: number;
	ticketsSold: number;
	creator: mongoose.Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const EventSchema: Schema = new Schema(
	{
		title: { type: String, required: true },
		description: { type: String, required: true },
		date: { type: Date, required: true },
		location: { type: String, required: true },
		price: { type: Number, required: true, default: 0 },
		capacity: { type: Number, required: true },
		ticketsSold: { type: Number, default: 0 },
		creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	},
	{ timestamps: true },
);

export default mongoose.model<IEvent>('Event', EventSchema);

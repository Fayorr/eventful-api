import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
	event: mongoose.Types.ObjectId;
	eventee: mongoose.Types.ObjectId;
	paymentReference: string;
	qrCodeUrl: string;
	isScanned: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const TicketSchema: Schema = new Schema(
	{
		event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
		eventee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		paymentReference: { type: String, required: true, unique: true },
		qrCodeUrl: { type: String, required: true },
		isScanned: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export default mongoose.model<ITicket>('Ticket', TicketSchema);

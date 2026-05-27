import Ticket from '../tickets/ticket.model';
import Event from '../events/event.model';

export const getCreatorPaymentDetails = async (creatorId: string) => {
	// 1. Find all events created by this user
	const events = await Event.find({ creator: creatorId }).select('_id');
	const eventIds = events.map((e) => e._id);

	if (eventIds.length === 0) {
		return { totalRevenue: 0, transactions: [] };
	}

	// 2. Find all tickets (payments) tied to these events
	const payments = await Ticket.find({ event: { $in: eventIds } })
		.populate('event', 'title price date')
		.populate('eventee', 'name email')
		.select('paymentReference isScanned createdAt')
		.sort({ createdAt: -1 }); // Newest payments first

	// 3. Calculate total revenue across all events
	const totalRevenue = payments.reduce((sum, ticket: any) => {
		return sum + (ticket.event.price || 0);
	}, 0);

	return {
		totalRevenue,
		transactionCount: payments.length,
		transactions: payments,
	};
};

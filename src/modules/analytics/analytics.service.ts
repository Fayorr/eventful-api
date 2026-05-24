import mongoose from 'mongoose';
import Ticket from '../tickets/ticket.model';
import Event from '../events/event.model';

export const getCreatorAnalytics = async (creatorId: string) => {
	const objectId = new mongoose.Types.ObjectId(creatorId);

	// 1. Get all events created by this user to filter tickets
	const creatorEvents = await Event.find({ creator: objectId }).select('_id');
	const eventIds = creatorEvents.map((e) => e._id);

	// 2. Aggregate all-time stats
	const allTimeStats = await Ticket.aggregate([
		{ $match: { event: { $in: eventIds } } },
		{
			$group: {
				_id: null,
				totalTicketsSold: { $sum: 1 },
				totalAttendees: { $sum: { $cond: ['$isScanned', 1, 0] } }, // Count only if isScanned is true
			},
		},
	]);

	return allTimeStats.length > 0
		? {
				totalTicketsSold: allTimeStats[0].totalTicketsSold,
				totalAttendees: allTimeStats[0].totalAttendees,
			}
		: { totalTicketsSold: 0, totalAttendees: 0 };
};

export const getEventSpecificAnalytics = async (
	eventId: string,
	creatorId: string,
) => {
	// Ensure the event belongs to the creator requesting the analytics
	const event = await Event.findOne({ _id: eventId, creator: creatorId });
	if (!event) throw new Error('Event not found or unauthorized');

	const stats = await Ticket.aggregate([
		{ $match: { event: new mongoose.Types.ObjectId(eventId) } },
		{
			$group: {
				_id: '$event',
				totalTicketsSold: { $sum: 1 },
				totalAttendees: { $sum: { $cond: ['$isScanned', 1, 0] } },
			},
		},
	]);

	return stats.length > 0
		? {
				event: event.title,
				totalTicketsSold: stats[0].totalTicketsSold,
				totalAttendees: stats[0].totalAttendees,
			}
		: { event: event.title, totalTicketsSold: 0, totalAttendees: 0 };
};

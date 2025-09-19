// In your event refund API file (e.g., app/api/refunds/event/[eventId]/route.js)

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { requireAdmin } from '@/lib/auth'; // Using the simplified auth helper

export async function POST(request, { params }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { eventId } = params;
        
        // Admin Authentication (using your standard helper is cleaner)
        await requireAdmin();

        const event = await Event.findById(eventId).session(session);
        if (!event) {
            throw new Error('Event not found.');
        }

        // --- FIX #1: Look for 'valid' tickets for consistency ---
        const ticketsToRefund = await Ticket.find({ eventId: eventId, status: 'valid' }).session(session);

        if (ticketsToRefund.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return NextResponse.json({ message: 'No valid tickets found for this event to refund.' }, { status: 404 });
        }

        // Update all valid tickets to 'refunded'
        await Ticket.updateMany(
            { _id: { $in: ticketsToRefund.map(t => t._id) } },
            { $set: { status: 'refunded' } },
            { session }
        );

        // --- FIX #2: Correctly decrement the ticketsSold count ---
        // Instead of setting to 0, we subtract the number of tickets we just refunded.
        await Event.updateOne(
            { _id: eventId },
            { $inc: { ticketsSold: -ticketsToRefund.length } },
            { session }
        );

        await session.commitTransaction();
        
        return NextResponse.json({ message: `Successfully refunded ${ticketsToRefund.length} tickets for the event "${event.eventName}".` }, { status: 200 });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Error processing event refund:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Failed to process event refund.";
        
        if (errorMessage.includes('Authentication') || errorMessage.includes('Forbidden')) {
            return NextResponse.json({ message: errorMessage }, { status: 403 });
        }

        return NextResponse.json({ message: errorMessage }, { status: 500 });
    } finally {
        session.endSession();
    }
}

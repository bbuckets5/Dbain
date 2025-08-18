import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/auth';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';

export async function POST(request, { params }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Authenticate the user as an admin using our standard helper
        await requireAdmin();

        const { ticketId } = params;

        // 2. Find the ticket within the transaction session
        const ticket = await Ticket.findById(ticketId).session(session);

        if (!ticket) {
            throw new Error('Ticket not found.');
        }

        // 3. Check if the ticket has already been refunded
        if (ticket.status === 'refunded') {
            // Use a 409 Conflict status code for this case
            return NextResponse.json({ message: 'This ticket has already been refunded.' }, { status: 409 });
        }

        // 4. Update the ticket status and decrement the event's ticketsSold count
        ticket.status = 'refunded';
        await ticket.save({ session });

        await Event.findByIdAndUpdate(
            ticket.eventId,
            { $inc: { ticketsSold: -1 } }, // Safely decrement the count by 1
            { session }
        );

        // 5. If all operations succeed, commit the transaction
        await session.commitTransaction();
        
        return NextResponse.json({ message: 'Ticket successfully refunded.', ticket }, { status: 200 });

    } catch (error) {
        // If any error occurs, abort the entire transaction
        await session.abortTransaction();
        console.error("Error processing single ticket refund:", error);

        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        
        return NextResponse.json({ message: error.message || "Failed to process refund." }, { status: 500 });
    } finally {
        // Always end the session
        session.endSession();
    }
}
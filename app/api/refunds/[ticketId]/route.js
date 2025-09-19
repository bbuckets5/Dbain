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
        await requireAdmin();
        const { ticketId } = params;

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return NextResponse.json({ message: 'Invalid Ticket ID format.' }, { status: 400 });
        }

        const ticket = await Ticket.findById(ticketId).session(session);

        if (!ticket) {
            return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
        }

        if (ticket.status === 'refunded') {
            return NextResponse.json({ message: 'This ticket has already been refunded.' }, { status: 400 });
        }
        
        // --- This is the critical check we added ---
        if (ticket.status === 'checked-in') {
            return NextResponse.json({ message: 'Cannot refund a ticket that has already been checked in.' }, { status: 400 });
        }
        // -------------------------------------------

        ticket.status = 'refunded';
        await ticket.save({ session });

        await Event.findByIdAndUpdate(
            ticket.eventId,
            { $inc: { ticketsSold: -1 } },
            { session }
        );

        await session.commitTransaction();
        
        return NextResponse.json({ message: 'Ticket successfully refunded.', ticket }, { status: 200 });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Error processing single ticket refund:", error);

        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        
        return NextResponse.json({ message: error.message || "Failed to process refund." }, { status: 500 });
    } finally {
        session.endSession();
    }
}

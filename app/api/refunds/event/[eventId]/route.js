import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
// --- FIX: 'cookies' is no longer needed ---
// import { cookies } from 'next/headers'; 

export async function POST(request, { params }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { eventId } = params;

        // --- Admin Authentication ---
        
        // --- FIX START: Get token from Authorization header instead of cookies ---
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Unauthorized: Missing or invalid token.');
        }
        const token = authHeader.split(' ')[1];
        // --- FIX END ---
        
        if (!token) {
            throw new Error('Unauthorized');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).lean();
        if (!user || user.role !== 'admin') {
            throw new Error('Forbidden: Admins only.');
        }
        // --- End Authentication ---

        const event = await Event.findById(eventId).session(session);
        if (!event) {
            throw new Error('Event not found.');
        }

        const activeTickets = await Ticket.find({ eventId: eventId, status: 'active' }).session(session);

        if (activeTickets.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return NextResponse.json({ message: 'No active tickets found for this event to refund.' }, { status: 404 });
        }

        await Ticket.updateMany(
            { _id: { $in: activeTickets.map(t => t._id) } },
            { $set: { status: 'refunded' } },
            { session }
        );

        event.ticketsSold = 0;
        await event.save({ session });

        await session.commitTransaction();
        
        return NextResponse.json({ message: `Successfully refunded ${activeTickets.length} tickets for the event "${event.eventName}".` }, { status: 200 });

    } catch (error) {
        // Use optional chaining for abortTransaction to prevent errors if the session is already closed
        await session.abortTransaction?.().catch(() => {});
        console.error("Error processing event refund:", error);
        // Ensure error.message is a string
        const errorMessage = error instanceof Error ? error.message : "Failed to process event refund.";
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    } finally {
        // Use optional chaining for endSession
        session.endSession?.().catch(() => {});
    }
}

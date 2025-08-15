import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/ticket';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { eventId } = params;

        // --- Admin Authentication ---
        // ++ FIX: Add 'await' before calling cookies() ++
        const cookieStore = await cookies();
        const token = cookieStore.get('authToken')?.value;
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
        await session.abortTransaction();
        console.error("Error processing event refund:", error);
        return NextResponse.json({ message: error.message || "Failed to process event refund." }, { status: 500 });
    } finally {
        session.endSession();
    }
}
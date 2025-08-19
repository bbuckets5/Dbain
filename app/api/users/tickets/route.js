import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import dbConnect from '@/lib/dbConnect';

export async function GET() {
    await dbConnect();

    try {
        // 1. Get the authenticated user.
        const user = await getAuthedUser();

        // 2. Query tickets by userId OR customerEmail.
        const tickets = await Ticket.find({
            $or: [
                { userId: user._id },
                { customerEmail: user.email.toLowerCase() }
            ]
        })
            .populate({
                path: 'eventId',
                model: Event,
                select: 'eventName eventDate eventTime flyerImagePath eventLocation'
            })
            .sort({ createdAt: -1 }) // newest first
            .lean();

        return NextResponse.json(tickets, { status: 200 });

    } catch (error) {
        console.error("Error fetching user tickets:", error.message);
        if (error.message.includes('Authentication')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 401 });
        }
        return NextResponse.json({ message: 'Server error fetching tickets.' }, { status: 500 });
    }
}

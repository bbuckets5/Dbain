import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event'; // Required for .populate() to work reliably
import dbConnect from '@/lib/dbConnect';

export async function GET(request) {
    await dbConnect();

    try {
        // 1. Get the authenticated user with our standard helper.
        const user = await getAuthedUser();

        // 2. Find all tickets associated with that user's ID.
        // Your database query here was already excellent, so we've kept it.
        const tickets = await Ticket.find({ userId: user._id })
            .populate({
                path: 'eventId',
                model: Event,
                select: 'eventName eventDate eventTime flyerImagePath' // Added flyer image
            })
            .sort({ purchaseDate: -1 }) // Show newest tickets first
            .lean(); // .lean() for faster read-only results

        return NextResponse.json(tickets, { status: 200 });

    } catch (error) {
        console.error("Error fetching user tickets:", error.message);
        if (error.message.includes('Authentication')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 401 });
        }
        
        return NextResponse.json({ message: 'Server error fetching tickets.' }, { status: 500 });
    }
}
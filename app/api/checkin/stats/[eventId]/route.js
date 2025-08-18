import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        // 1. Use our standard helper to ensure the user is a verified admin.
        await requireAdmin();

        const { eventId } = params;

        // 2. Check if the provided ID is in a valid format.
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        // 3. Find the event to get its name and total tickets sold.
        const event = await Event.findById(eventId).lean();
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // 4. Efficiently count only the tickets that are "checked-in" for this event.
        const checkedInCount = await Ticket.countDocuments({ 
            eventId: eventId, 
            status: 'checked-in' 
        });

        const stats = {
            eventName: event.eventName,
            totalTickets: event.ticketsSold,
            checkedInCount: checkedInCount,
        };
        
        return NextResponse.json(stats, { status: 200 });

    } catch (error) {
        console.error("Error fetching check-in stats:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error fetching stats.' }, { status: 500 });
    }
}

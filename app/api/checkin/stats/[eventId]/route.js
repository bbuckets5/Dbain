import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        await requireAdmin();

        // --- FIX: Await params for Next.js 15 ---
        const { eventId } = await params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        const event = await Event.findById(eventId).lean();
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

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

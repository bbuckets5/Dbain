import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        // --- FIX: Await params for Next.js 15 compatibility ---
        const { 'event-id': eventId } = await params;

        // 1. Check if the provided ID is in a valid format before querying the database.
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // 2. Find the event by its ID, but only if its status is 'approved'.
        // This combines the find and the status check into one efficient database call.
        const event = await Event.findOne({ 
            _id: eventId, 
            status: 'approved' 
        });

        // If no event is found (either it doesn't exist or isn't approved), return 404.
        if (!event) {
            return NextResponse.json({ message: 'Event not found or is not currently active.' }, { status: 404 });
        }

        return NextResponse.json(event, { status: 200 });

    } catch (error) {
        console.error("Error fetching single event:", error);
        return NextResponse.json({ message: 'Server error fetching event.' }, { status: 500 });
    }
}

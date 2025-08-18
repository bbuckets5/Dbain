import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export async function GET(request) {
    try {
        await dbConnect();

        // --- This is the corrected logic ---
        // Get the current date and set the time to the very beginning (midnight).
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const approvedEvents = await Event.find({ 
            status: 'approved',
            // Now we compare against the start of today, not the exact current time.
            eventDate: { $gte: startOfToday } 
        })
        .sort({ eventDate: 1 })
        .lean();

        return NextResponse.json(approvedEvents, { status: 200 });

    } catch (err) {
        console.error("Error fetching public events:", err);
        return NextResponse.json({ message: 'Failed to fetch events.' }, { status: 500 });
    }
}

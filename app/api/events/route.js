import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

export async function GET(request) {
    try {
        await dbConnect();

        // Fetch ALL approved events (past + future)
        const approvedEvents = await Event.find({ 
            status: 'approved'
        })
        .sort({ eventDate: 1 })
        .lean();

        return NextResponse.json(approvedEvents, { status: 200 });

    } catch (err) {
        console.error("Error fetching public events:", err);
        return NextResponse.json({ message: 'Failed to fetch events.' }, { status: 500 });
    }
}

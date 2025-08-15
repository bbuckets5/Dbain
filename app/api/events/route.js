// In app/api/events/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';        // 1. Import our dbConnect utility
import Event from '@/models/Event';            // 2. Import the correct Event model

export async function GET(request) {
    try {
        await dbConnect(); // 3. Use the dbConnect utility

        // 4. Use the correct Event model and keep your date filter
        const approvedEvents = await Event.find({ 
            status: 'approved',
            eventDate: { $gte: new Date() }
        })
        .sort({ eventDate: 1 })
        .lean(); // Add .lean() for better performance

        return NextResponse.json(approvedEvents, { status: 200 });

    } catch (err) {
        console.error("Error fetching public events:", err);
        return NextResponse.json({ message: 'Failed to fetch events.' }, { status: 500 });
    }
}
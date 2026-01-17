import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        // --- FIX: Bulletproof ID Extraction for Next.js 15 ---
        // 1. Await the params (Required for Next.js 15)
        const resolvedParams = await params;
        
        // 2. Try ALL possible parameter names to prevent "undefined" errors
        // This works regardless of if you named the folder [id], [eventId], or [event-id]
        const eventId = resolvedParams['event-id'] || resolvedParams['id'] || resolvedParams['eventId'];

        console.log("API Fetching Event ID:", eventId); // This helps debug in Vercel logs

        // 3. Validate the ID format
        if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid or missing Event ID.' }, { status: 400 });
        }

        // 4. Find the event
        const event = await Event.findOne({ 
            _id: eventId, 
            status: 'approved' 
        });

        if (!event) {
            return NextResponse.json({ message: 'Event not found or not active.' }, { status: 404 });
        }

        return NextResponse.json(event, { status: 200 });

    } catch (error) {
        console.error("Error fetching single event:", error);
        return NextResponse.json({ message: 'Server error fetching event.' }, { status: 500 });
    }
}

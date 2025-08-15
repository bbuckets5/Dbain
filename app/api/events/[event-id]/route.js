// In app/api/events/[event-id]/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    try {
        await dbConnect();

        const eventId = params['event-id'];

        // Find the document by its ID in the Event collection
        const event = await Event.findById(eventId);

        if (!event || event.status !== 'approved') {
            // Also check if the found event is actually an approved event
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        return NextResponse.json(event, { status: 200 });

    } catch (error) {
        console.error("Error fetching event:", error);
        return NextResponse.json({ message: 'Server error fetching event.' }, { status: 500 });
    }
}
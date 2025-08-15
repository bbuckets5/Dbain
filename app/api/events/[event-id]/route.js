// In app/api/events/[event-id]/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Submission from '@/models/submission'; // CORRECT MODEL: Use the Submission model

export async function GET(request, { params }) {
    try {
        const eventId = params['event-id'];

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.DB_CONNECTION_STRING);
        }

        // CORRECT QUERY: Find the document by its ID in the Submission collection
        const event = await Submission.findById(eventId);

        if (!event || event.status !== 'approved') {
            // Also check if the found submission is actually an approved event
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        return NextResponse.json(event, { status: 200 });

    } catch (error) {
        console.error("Error fetching event:", error);
        return NextResponse.json({ message: 'Server error fetching event.' }, { status: 500 });
    }
}
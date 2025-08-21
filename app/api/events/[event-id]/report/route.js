import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { requireAdmin } from '@/lib/auth';
import { getLocalEventDate } from '@/lib/dateUtils';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        await requireAdmin();
        // Correctly read 'event-id' from the params to match your folder name
        const eventId = params['event-id'];

        // Check if the provided ID is in a valid format before querying
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: `Invalid Event ID format: ${eventId}` }, { status: 400 });
        }

        // Find the main event details
        const event = await Event.findById(eventId).lean();
        if (!event) {
            return NextResponse.json({ message: "Event not found." }, { status: 404 });
        }

        // Find ALL tickets associated with this event to create the attendee list
        const attendees = await Ticket.find({ eventId: eventId }).lean();

        // Calculate the total revenue from all the tickets found
        const totalRevenue = attendees.reduce((sum, ticket) => {
            return sum + (Number(ticket.price) || 0);
        }, 0);
        
        // Format the date and time using our shared utility
        const { fullDate, time } = getLocalEventDate(event);

        // Bundle all the collected data into a single response object
        const reportData = {
            event: {
                eventName: event.eventName,
                eventLocation: event.eventLocation,
                ticketCount: event.ticketCount,
                formattedDate: fullDate,
                formattedTime: time,
            },
            attendees: attendees,
            totalRevenue: totalRevenue,
        };

        return NextResponse.json(reportData, { status: 200 });

    } catch (error) {
        console.error("Error generating event report:", error);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: "Server Error: Failed to generate report." }, { status: 500 });
    }
}
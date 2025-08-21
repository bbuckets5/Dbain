import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { requireAdmin } from '@/lib/auth';
import { getLocalEventDate } from '@/lib/dateUtils';
import mongoose from 'mongoose'; // <-- Add this import

export async function GET(request, { params }) {
    await dbConnect();

    try {
        await requireAdmin();
        const { eventId } = params;

        // --- DEBUGGING: Log the exact ID the server receives ---
        console.log("Report API received Event ID:", eventId);

        // --- FIX: Add a check to ensure the ID is a valid format ---
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: `Invalid Event ID format: ${eventId}` }, { status: 400 });
        }

        const event = await Event.findById(eventId).lean();
        if (!event) {
            return NextResponse.json({ message: "Event not found." }, { status: 404 });
        }

        const attendees = await Ticket.find({ eventId: eventId }).lean();

        const totalRevenue = attendees.reduce((sum, ticket) => {
            return sum + (Number(ticket.price) || 0);
        }, 0);
        
        const { fullDate, time } = getLocalEventDate(event);

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
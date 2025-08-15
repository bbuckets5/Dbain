// In app/api/checkin/stats/[eventId]/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        // --- Admin Authentication (corrected) ---
        const cookieStore = await cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminUser = await User.findById(decoded.userId).lean();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
        }
        // --- End Authentication ---
        
        // Correctly get the eventId from the params object
        const { eventId } = params;

        const event = await Event.findById(eventId);
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // Count checked-in tickets for this event
        const ticketsCheckedIn = await Ticket.countDocuments({ eventId: eventId, status: 'checked-in' });

        const stats = {
            eventName: event.eventName,
            totalTickets: event.ticketsSold,
            checkedInCount: ticketsCheckedIn,
        };
        
        return NextResponse.json(stats, { status: 200 });

    } catch (error) {
        console.error("Error fetching check-in stats:", error);
        return NextResponse.json({ message: 'Server error fetching stats.' }, { status: 500 });
    }
}
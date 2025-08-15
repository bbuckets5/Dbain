// In app/api/checkin/stats/[eventId]/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function GET(request, { params }) {
    try {
        await dbConnect();

        // Admin Authentication
        const token = request.cookies.get('authToken')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminUser = await User.findById(decoded.userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
        }

        // --- THIS IS THE FIX ---
        // Await the params object before getting the eventId from it.
        const { eventId } = await params;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // Count checked-in tickets for this event
        const checkedInCount = await Ticket.countDocuments({ eventId: eventId, isCheckedIn: true });

        const stats = {
            eventName: event.eventName,
            totalTickets: event.ticketsSold,
            checkedInCount: checkedInCount,
        };
        
        return NextResponse.json(stats, { status: 200 });

    } catch (error) {
        console.error("Error fetching check-in stats:", error);
        return NextResponse.json({ message: 'Server error fetching stats.' }, { status: 500 });
    }
}
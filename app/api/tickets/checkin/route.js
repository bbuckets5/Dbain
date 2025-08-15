// In app/api/tickets/checkin/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Ticket from '@/models/Ticket';
// Add authentication logic if needed

export async function POST(request) {
    try {
        const { ticketId, eventId } = await request.json();

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.DB_CONNECTION_STRING);
        }

        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
        }
        if (ticket.eventId.toString() !== eventId) {
            return NextResponse.json({ message: 'Ticket is for a different event.' }, { status: 400 });
        }
        if (ticket.status === 'checked-in') {
            return NextResponse.json({ message: 'Ticket has already been checked in.' }, { status: 409 }); // 409 Conflict
        }
        if (ticket.status === 'refunded') {
            return NextResponse.json({ message: 'This ticket has been refunded.' }, { status: 400 });
        }

        ticket.status = 'checked-in';
        await ticket.save();

        return NextResponse.json({ message: 'Check-in Successful!' }, { status: 200 });

    } catch (error) {
        console.error("Error during check-in:", error);
        return NextResponse.json({ message: 'Server error during check-in.' }, { status: 500 });
    }
}
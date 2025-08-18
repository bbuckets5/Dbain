import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import { requireAdmin } from '@/lib/auth';

export async function POST(request) {
    await dbConnect();

    try {
        // 1. Use our standard helper to get the verified admin/staff member.
        const adminUser = await requireAdmin();

        const { ticketId, eventId } = await request.json();

        // 2. Validate the incoming IDs.
        if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Ticket or Event ID format.' }, { status: 400 });
        }

        const ticket = await Ticket.findById(ticketId);

        // 3. Run all the necessary checks on the ticket.
        if (!ticket) {
            return NextResponse.json({ message: 'Invalid Ticket: Not found.' }, { status: 404 });
        }
        if (ticket.eventId.toString() !== eventId) {
            return NextResponse.json({ message: 'Ticket Mismatch: This ticket is for a different event.' }, { status: 400 });
        }
        if (ticket.status === 'checked-in') {
            return NextResponse.json({ message: 'Already Redeemed: This ticket has been checked in.' }, { status: 409 }); // 409 Conflict
        }
        if (ticket.status === 'refunded') {
            return NextResponse.json({ message: 'Invalid: This ticket has been refunded.' }, { status: 400 });
        }

        // 4. Update the ticket with the new status and record-keeping details.
        ticket.status = 'checked-in';
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = adminUser._id; // Record which staff member scanned the ticket
        await ticket.save();

        return NextResponse.json({ message: 'Access Granted: Check-in Successful!' }, { status: 200 });

    } catch (error) {
        console.error("Error during check-in:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error during check-in.' }, { status: 500 });
    }
}

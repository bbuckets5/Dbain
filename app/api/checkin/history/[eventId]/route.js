import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import User from '@/models/User'; // Needed for populating the admin's name
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        // 1. Ensure the user is a verified admin/staff member.
        await requireAdmin();

        const { eventId } = params;

        // 2. Check if the provided Event ID is in a valid format.
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        // 3. Find the most recent check-ins for this event.
        const recentCheckIns = await Ticket.find({ 
            eventId: eventId, 
            status: 'checked-in' 
        })
        .sort({ checkedInAt: -1 }) // Sort by check-in time, newest first
        .limit(50) // Limit to the 50 most recent check-ins for performance
        .populate({
            path: 'checkedInBy',   // Find the User document for the staff member
            model: User,
            select: 'firstName lastName' // Only get their first and last name
        })
        .lean();

        return NextResponse.json(recentCheckIns, { status: 200 });

    } catch (error) {
        console.error("Error fetching check-in history:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error fetching history.' }, { status: 500 });
    }
}

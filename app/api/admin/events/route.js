import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
    await dbConnect();

    try {
        // Ensure user is an admin
        await requireAdmin();

        // Fetch ALL approved events (past + future)
        const events = await Event.find({ status: 'approved' })
            .sort({ eventDate: 1 })
            .lean();

        return NextResponse.json(events, { status: 200 });

    } catch (error) {
        console.error("Error fetching admin events:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error fetching events.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
    await dbConnect();

    try {
        await requireAdmin();

        // --- FIX: Await params for Next.js 15 ---
        const { eventId } = await params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        const recentCheckIns = await Ticket.find({ 
            eventId: eventId, 
            status: 'checked-in' 
        })
        .sort({ checkedInAt: -1 })
        .limit(50)
        .populate({
            path: 'checkedInBy',
            model: User,
            select: 'firstName lastName'
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

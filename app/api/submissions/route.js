import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event'; // Using the actual model name 'Event'
import { requireAdmin } from '@/lib/auth'; // Our standard admin security check

export async function GET(request) {
    await dbConnect();

    try {
        // 1. Use our standard helper to ensure the user is an admin.
        await requireAdmin();

        // 2. Find all event documents and sort them by the most recently submitted.
        const submissions = await Event.find({})
            .sort({ submittedAt: -1 }); // Sort by the 'submittedAt' field in your schema

        return NextResponse.json(submissions, { status: 200 });

    } catch (error) {
        console.error("Error fetching submissions:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        
        return NextResponse.json({ message: 'Server error fetching submissions.' }, { status: 500 });
    }
}

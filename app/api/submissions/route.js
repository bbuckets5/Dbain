import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
    await dbConnect();

    try {
        await requireAdmin();

        // --- FIX: Add logic for pagination ---
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = 25; // Show 25 events per page
        const skip = (page - 1) * limit;

        // Get the total count of all events for calculating total pages
        const totalEvents = await Event.countDocuments({});
        const totalPages = Math.ceil(totalEvents / limit);

        // Find only the events for the current page
        const submissions = await Event.find({})
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean for faster, read-only queries

        // --- FIX: Return a structured object with pagination data ---
        return NextResponse.json({
            events: submissions,
            currentPage: page,
            totalPages,
            totalEvents
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching submissions:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        
        return NextResponse.json({ message: 'Server error fetching submissions.' }, { status: 500 });
    }
}

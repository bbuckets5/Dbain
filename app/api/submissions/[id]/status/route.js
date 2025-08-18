import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(request, { params }) {
    await dbConnect();

    try {
        // 1. Use our standard helper to ensure the user is a verified admin.
        await requireAdmin();

        const eventId = params.id;
        const { status } = await request.json();

        // 2. Validate that the status is one of the allowed values.
        const allowedStatuses = ['approved', 'denied', 'pending']; // Add any other valid statuses here
        if (!allowedStatuses.includes(status)) {
            return NextResponse.json({ message: 'Invalid status provided.' }, { status: 400 });
        }

        // 3. Find the event and update its status.
        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { status },
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // 4. IMPORTANT: Refresh the cached data for the homepage and the specific event page.
        // This ensures the site shows the new status immediately. Your idea to do this was excellent.
        revalidatePath('/'); // For the main events list
        revalidatePath(`/events/${eventId}`); // For the event's detail page

        return NextResponse.json(updatedEvent, { status: 200 });
        
    } catch (error)
    {
        console.error('Error updating event status:', error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error during status update.' }, { status: 500 });
    }
}

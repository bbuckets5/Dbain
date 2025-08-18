import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';

// Configure Cloudinary for deleting images
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- GET: Fetches a single event submission for an admin to view ---
export async function GET(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        const event = await Event.findById(params.id);
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }
        return NextResponse.json(event, { status: 200 });
    } catch (error) {
        console.error("Error fetching submission:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error fetching submission.' }, { status: 500 });
    }
}

// --- PUT: Updates an entire event submission ---
export async function PUT(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        const eventId = params.id;
        const updateData = await request.json();

        const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true, runValidators: true });
        if (!updatedEvent) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }

        // Refresh the cache for the homepage and the event's detail page
        revalidatePath('/');
        revalidatePath(`/events/${eventId}`);

        return NextResponse.json(updatedEvent, { status: 200 });
    } catch (error) {
        console.error('Error updating event:', error);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
    }
}

// --- DELETE: Deletes an event submission and its flyer from Cloudinary ---
export async function DELETE(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        const eventId = params.id;

        const eventToDelete = await Event.findByIdAndDelete(eventId);
        if (!eventToDelete) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // --- Reliable Deletion using the saved public_id ---
        if (eventToDelete.flyerPublicId) {
            await cloudinary.v2.uploader.destroy(eventToDelete.flyerPublicId);
        }
        
        // Refresh the cache for the homepage
        revalidatePath('/');
        
        return NextResponse.json({ message: 'Event deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error("Error deleting submission:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error deleting submission.' }, { status: 500 });
    }
}

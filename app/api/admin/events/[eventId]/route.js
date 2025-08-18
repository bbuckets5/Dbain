import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

// Configure Cloudinary for deleting images
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- GET: Fetches a single event's details for an admin to view/edit ---
export async function GET(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        const { eventId } = params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }
        return NextResponse.json(event, { status: 200 });
    } catch (error) {
        console.error("Error fetching admin event:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error fetching event.' }, { status: 500 });
    }
}

// --- PUT: A single, powerful function to update any part of an event ---
export async function PUT(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        const { eventId } = params;
        const updateData = await request.json(); // Expecting JSON data

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

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

// --- DELETE: Permanently deletes an event and all its tickets ---
export async function DELETE(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        const { eventId } = params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        const eventToDelete = await Event.findById(eventId);
        if (!eventToDelete) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // 1. Delete flyer from Cloudinary using the reliable public_id
        if (eventToDelete.flyerPublicId) {
            await cloudinary.v2.uploader.destroy(eventToDelete.flyerPublicId);
        }
        
        // 2. Delete all associated tickets to maintain data integrity
        await Ticket.deleteMany({ eventId: eventId });

        // 3. Delete the event itself
        await Event.findByIdAndDelete(eventId);

        // Refresh the cache for the homepage
        revalidatePath('/');
        
        return NextResponse.json({ message: `Event "${eventToDelete.eventName}" deleted.` }, { status: 200 });
    } catch (error) {
        console.error("Error deleting event:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error deleting event.' }, { status: 500 });
    }
}

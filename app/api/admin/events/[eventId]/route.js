import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { requireAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- SMART HELPER: Detects if a date is Daylight Savings (EDT) or Standard (EST) ---
const getEasternOffset = (dateString) => {
    // Create a date object for noon UTC on that day
    const testDate = new Date(`${dateString}T12:00:00Z`);
    
    // Ask the system: "What is the timezone name for New York on this specific date?"
    const timeZoneString = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'America/New_York', 
        timeZoneName: 'short' 
    }).format(testDate);

    // If it says "EDT" (Eastern Daylight Time), use -04:00. Otherwise -05:00.
    return timeZoneString.includes('EDT') ? '-04:00' : '-05:00';
};

export async function GET(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        
        // --- FIX: In Next.js 15, params must be awaited ---
        const { eventId } = await params;

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

export async function PUT(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        
        // --- FIX: In Next.js 15, params must be awaited ---
        const { eventId } = await params;
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }
        
        const existingEvent = await Event.findById(eventId);
        if (!existingEvent) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }

        const formData = await request.formData();
        const updateData = {};

        // Process simple text fields
        const fields = ['eventName', 'eventDate', 'eventTime', 'eventLocation', 'eventDescription', 'ticketCount'];
        fields.forEach(field => {
            if (formData.has(field)) {
                updateData[field] = formData.get(field);
            }
        });
        
        // --- FIX: Use Smart Offset Helper for Date Updates ---
        if (updateData.eventDate && updateData.eventTime) {
            const offset = getEasternOffset(updateData.eventDate);
            updateData.eventDate = new Date(`${updateData.eventDate}T${updateData.eventTime}:00.000${offset}`);
        }

        // Process ticket types
        if (formData.has('ticket_type[]')) {
            const types = formData.getAll('ticket_type[]');
            const prices = formData.getAll('ticket_price[]');
            const includes = formData.getAll('ticket_includes[]');
            updateData.tickets = types.map((type, i) => ({
                type,
                price: Number(prices[i] || 0),
                includes: includes[i] || '',
            }));
        }

        // Handle optional flyer upload
        const flyer = formData.get('flyer');
        if (flyer) {
            // Delete old flyer from Cloudinary
            if (existingEvent.flyerPublicId) {
                await cloudinary.v2.uploader.destroy(existingEvent.flyerPublicId);
            }

            // Upload new flyer
            const arrayBuffer = await flyer.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.v2.uploader.upload_stream(
                    { folder: 'events', resource_type: 'image', format: 'webp' },
                    (err, result) => err ? reject(err) : resolve(result)
                );
                stream.end(buffer);
            });
            
            updateData.flyerImagePath = uploadResult.secure_url;
            updateData.flyerPublicId = uploadResult.public_id;
            updateData.flyerImageThumbnailPath = cloudinary.v2.url(uploadResult.public_id, { width: 800, crop: 'scale', format: 'webp', quality: 'auto:good' });
            updateData.flyerImagePlaceholderPath = cloudinary.v2.url(uploadResult.public_id, { width: 20, crop: 'scale', format: 'webp', quality: 'auto:low', effect: 'blur:2000' });
        }

        const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true, runValidators: true });

        revalidatePath('/');
        revalidatePath(`/events/${eventId}`);

        return NextResponse.json(updatedEvent, { status: 200 });

    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ message: error.message || 'Failed to update event.' }, { status: 500 });
    }
}


export async function DELETE(request, { params }) {
    await dbConnect();
    try {
        await requireAdmin();
        
        // --- FIX: In Next.js 15, params must be awaited ---
        const { eventId } = await params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return NextResponse.json({ message: 'Invalid Event ID format.' }, { status: 400 });
        }

        const eventToDelete = await Event.findById(eventId);
        if (!eventToDelete) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        if (eventToDelete.flyerPublicId) {
            await cloudinary.v2.uploader.destroy(eventToDelete.flyerPublicId);
        }
        
        await Ticket.deleteMany({ eventId: eventId });
        await Event.findByIdAndDelete(eventId);

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

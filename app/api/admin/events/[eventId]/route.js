import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import cloudinary from 'cloudinary';
import mongoose from 'mongoose';

// Configure Cloudinary (ensure these are in your .env.local)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload a file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: 'event-flyers', format: 'webp', transformation: [{ quality: 'auto:good' }] },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    uploadStream.end(fileBuffer);
  });

// GET handler
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { eventId } = params;

        const cookieStore = cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        let decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminUser = await User.findById(decoded.userId).lean();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
        }
if (!mongoose.Types.ObjectId.isValid(eventId)) {
return NextResponse.json({ message: 'Invalid Event ID.' }, { status: 400 });
}

        const event = await Event.findById(eventId);
        if (!event) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }
        return NextResponse.json(event, { status: 200 });

    } catch (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ message: 'Failed to fetch event data.', error: error.message }, { status: 500 });
    }
}

// PUT handler
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { eventId } = params;

        const cookieStore = cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        let decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminUser = await User.findById(decoded.userId).lean();
        if (!adminUser || adminUser.role !== 'admin') return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
if (!mongoose.Types.ObjectId.isValid(eventId)) {
return NextResponse.json({ message: 'Invalid Event ID.' }, { status: 400 });
}

        const formData = await request.formData();
        const updateData = {};

        const fields = ['eventName', 'eventDate', 'eventTime', 'eventLocation', 'eventDescription', 'ticketCount'];
        fields.forEach(field => {
            if (formData.has(field)) {
                updateData[field] = formData.get(field);
            }
        });

        const ticket_types = formData.getAll('ticket_type[]');
        if (ticket_types && ticket_types.length > 0) {
            const ticket_prices = formData.getAll('ticket_price[]');
            const ticket_includes = formData.getAll('ticket_includes[]');
            updateData.tickets = ticket_types.map((type, i) => ({
                type: type,
                price: Number(ticket_prices[i] || 0),
                includes: ticket_includes[i] || '',
            }));
        }

        const newFlyerFile = formData.get('flyer');
        if (newFlyerFile && newFlyerFile.size > 0) {
            const fileBuffer = Buffer.from(await newFlyerFile.arrayBuffer());
            const uploadResult = await uploadToCloudinary(fileBuffer);

            updateData.flyerImagePath = uploadResult.secure_url;
            updateData.flyerImageThumbnailPath = cloudinary.v2.url(uploadResult.public_id, {
                width: 800, crop: 'scale', format: 'webp', quality: 60,
            });
            updateData.flyerImagePlaceholderPath = cloudinary.v2.url(uploadResult.public_id, {
                width: 20, crop: 'scale', format: 'webp', quality: 50, effect: 'blur:3000',
            });
        }

        const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true });

        if (!updatedEvent) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Event updated successfully!', event: updatedEvent }, { status: 200 });

    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ message: 'Failed to update event.', error: error.message }, { status: 500 });
    }
}

// PATCH function to update event status (the new code)
export async function PATCH(request, { params }) {
try {
await dbConnect();
const { eventId } = params;

// Admin authentication
const cookieStore = cookies();
const token = cookieStore.get('authToken')?.value;
if (!token) {
return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
let decoded = jwt.verify(token, process.env.JWT_SECRET);
const adminUser = await User.findById(decoded.userId).lean();
if (!adminUser || adminUser.role !== 'admin') {
return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
}

if (!mongoose.Types.ObjectId.isValid(eventId)) {
return NextResponse.json({ message: 'Invalid Event ID.' }, { status: 400 });
}

const body = await request.json();
const { status } = body;

if (status !== 'completed') {
return NextResponse.json({ message: 'Invalid status provided.' }, { status: 400 });
}

const updatedEvent = await Event.findByIdAndUpdate(
eventId,
{ status: 'completed' },
{ new: true, runValidators: true }
);

if (!updatedEvent) {
return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
}

return NextResponse.json({ message: 'Event marked as completed successfully.', event: updatedEvent }, { status: 200 });

} catch (error) {
console.error("Error updating event status:", error);
return NextResponse.json({ message: 'Server error updating event status.' }, { status: 500 });
}
}


// DELETE handler for permanently deleting an event
export async function DELETE(request, { params }) {
    try {
await dbConnect();

        const { eventId } = params;

        // --- Admin Authentication ---
        const cookieStore = cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) throw new Error('Unauthorized');
       
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).lean();
        if (!user || user.role !== 'admin') throw new Error('Forbidden: Admins only.');
        // --- End Authentication ---
if (!mongoose.Types.ObjectId.isValid(eventId)) {
return NextResponse.json({ message: 'Invalid Event ID.' }, { status: 400 });
}

        const eventToDelete = await Event.findById(eventId);
        if (!eventToDelete) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }

        // 1. Delete flyer from Cloudinary if it exists
        if (eventToDelete.flyerImagePath) {
            const publicId = eventToDelete.flyerImagePath.split('/').pop().split('.')[0];
            await cloudinary.v2.uploader.destroy(`event-flyers/${publicId}`);
        }
       
        // 2. Delete all associated tickets to maintain data integrity
        await Ticket.deleteMany({ eventId: eventId });

        // 3. Delete the event itself
        await Event.findByIdAndDelete(eventId);

        return NextResponse.json({ message: `Event "${eventToDelete.eventName}" and all associated tickets have been permanently deleted.` }, { status: 200 });

    } catch (error) {
        console.error("Error deleting event:", error);
        return NextResponse.json({ message: error.message || "Failed to delete event." }, { status: 500 });
    }
}
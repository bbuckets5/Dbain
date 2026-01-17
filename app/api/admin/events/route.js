import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';
import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request) {
    await dbConnect();

    try {
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

// --- FIX: Add POST method for Admins to create events directly ---
export async function POST(request) {
    await dbConnect();

    try {
        const adminUser = await requireAdmin(); // Get the logged-in admin's details

        const form = await request.formData();

        // Extract fields
        const eventName = form.get('eventName')?.toString().trim();
        const eventDateRaw = form.get('eventDate')?.toString().trim();
        const eventTime = form.get('eventTime')?.toString().trim();
        const eventLocation = form.get('eventLocation')?.toString().trim();
        const eventDescription = form.get('eventDescription')?.toString().trim();
        const ticketCountRaw = form.get('ticketCount')?.toString().trim();
        const flyer = form.get('flyer');
        
        const types = form.getAll('ticket_type[]').map(v => v.toString());
        const prices = form.getAll('ticket_price[]').map(v => v.toString());
        const includes = form.getAll('ticket_includes[]').map(v => v.toString());

        // Validate essential fields
        if (!eventName || !eventDateRaw || !eventTime || !eventLocation || !ticketCountRaw || !flyer) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        // Process tickets
        const ticketCount = Number(ticketCountRaw);
        const ticketTypes = types.map((label, i) => ({
            type: label,
            price: Number(prices[i] ?? 0),
            includes: (includes[i] ?? '').toString(),
        }));

        // Upload Flyer to Cloudinary
        const arrayBuffer = await flyer.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
                { folder: 'events', resource_type: 'image', format: 'webp' },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
            stream.end(buffer);
        });

        // Generate placeholders
        const flyerImageThumbnailPath = cloudinary.v2.url(uploadResult.public_id, {
            width: 800, crop: 'scale', format: 'webp', quality: 'auto:good',
        });
        const flyerImagePlaceholderPath = cloudinary.v2.url(uploadResult.public_id, {
            width: 20, crop: 'scale', format: 'webp', quality: 'auto:low', effect: 'blur:2000',
        });

        const eventDate = new Date(`${eventDateRaw}T${eventTime}:00.000-04:00`);

        // Create the Event
        // We use the Admin's own name for the "Submitter" fields to satisfy the database schema
        const newEvent = new Event({
            firstName: adminUser.firstName || 'System',
            lastName: adminUser.lastName || 'Admin',
            businessName: 'Click eTickets Admin',
            submitterEmail: adminUser.email,
            phone: 'N/A', // Admins don't need to provide a phone
            eventName,
            eventDescription,
            eventDate,
            eventTime,
            eventLocation,
            ticketCount,
            tickets: ticketTypes,
            flyerImagePath: uploadResult.secure_url,
            flyerPublicId: uploadResult.public_id,
            flyerImageThumbnailPath,
            flyerImagePlaceholderPath,
            status: 'approved', // Auto-approve admin events
        });

        await newEvent.save();

        return NextResponse.json({ message: 'Event created successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error creating admin event:', error);
        return NextResponse.json({ message: error.message || 'Failed to create event.' }, { status: 500 });
    }
}

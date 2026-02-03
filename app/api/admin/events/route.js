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

// --- SMART HELPER: Detects if a date is Daylight Savings (EDT) or Standard (EST) ---
const getEasternOffset = (dateString) => {
    const testDate = new Date(`${dateString}T12:00:00Z`);
    
    const timeZoneString = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'America/New_York', 
        timeZoneName: 'short' 
    }).format(testDate);

    return timeZoneString.includes('EDT') ? '-04:00' : '-05:00';
};

export async function GET(request) {
    await dbConnect();

    try {
        await requireAdmin();

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

export async function POST(request) {
    await dbConnect();

    try {
        const adminUser = await requireAdmin();
        const form = await request.formData();

        // 1. Extract Basic Fields
        const eventName = form.get('eventName')?.toString().trim();
        const eventDateRaw = form.get('eventDate')?.toString().trim();
        const eventTime = form.get('eventTime')?.toString().trim();
        const eventLocation = form.get('eventLocation')?.toString().trim();
        const eventDescription = form.get('eventDescription')?.toString().trim();
        const flyer = form.get('flyer');
        
        // 2. Check for Reserved Seating Flag
        const isReservedSeating = form.get('isReservedSeating') === 'true';

        if (!eventName || !eventDateRaw || !eventTime || !eventLocation || !flyer) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        let ticketCount = 0;
        let ticketTypes = [];
        let seats = [];

        // 3. Logic Branch: Reserved Seating vs General Admission
        if (isReservedSeating) {
            // --- RESERVED SEATING LOGIC ---
            const seatsConfigRaw = form.get('seats_config');
            if (!seatsConfigRaw) {
                return NextResponse.json({ message: 'Missing seating configuration.' }, { status: 400 });
            }

            try {
                seats = JSON.parse(seatsConfigRaw);
                // Override ticket count with the actual number of generated seats
                ticketCount = seats.length;
            } catch (err) {
                return NextResponse.json({ message: 'Invalid seating configuration format.' }, { status: 400 });
            }

        } else {
            // --- GENERAL ADMISSION LOGIC ---
            const ticketCountRaw = form.get('ticketCount')?.toString().trim();
            if (!ticketCountRaw) {
                return NextResponse.json({ message: 'Total Ticket Count is required for General Admission.' }, { status: 400 });
            }
            ticketCount = Number(ticketCountRaw);

            const types = form.getAll('ticket_type[]').map(v => v.toString());
            const prices = form.getAll('ticket_price[]').map(v => v.toString());
            const includes = form.getAll('ticket_includes[]').map(v => v.toString());

            ticketTypes = types.map((label, i) => ({
                type: label,
                price: Number(prices[i] ?? 0),
                includes: (includes[i] ?? '').toString(),
            }));
        }

        // 4. Handle Image Upload
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

        const flyerImageThumbnailPath = cloudinary.v2.url(uploadResult.public_id, {
            width: 800, crop: 'scale', format: 'webp', quality: 'auto:good',
        });
        const flyerImagePlaceholderPath = cloudinary.v2.url(uploadResult.public_id, {
            width: 20, crop: 'scale', format: 'webp', quality: 'auto:low', effect: 'blur:2000',
        });

        // 5. Handle Date & Time
        const offset = getEasternOffset(eventDateRaw);
        const eventDate = new Date(`${eventDateRaw}T${eventTime}:00.000${offset}`);

        // 6. Create Event Object
        const newEvent = new Event({
            firstName: adminUser.firstName || 'System',
            lastName: adminUser.lastName || 'Admin',
            businessName: 'Click eTickets Admin',
            submitterEmail: adminUser.email,
            phone: 'N/A',
            eventName,
            eventDescription,
            eventDate,
            eventTime,
            eventLocation,
            ticketCount,
            
            // --- NEW: Dynamic Ticket Data ---
            isReservedSeating,
            tickets: ticketTypes, // Will be empty if Reserved Seating is ON
            seats: seats,         // Will be empty if Reserved Seating is OFF
            
            flyerImagePath: uploadResult.secure_url,
            flyerPublicId: uploadResult.public_id,
            flyerImageThumbnailPath,
            flyerImagePlaceholderPath,
            status: 'approved',
        });

        await newEvent.save();

        return NextResponse.json({ message: 'Event created successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error creating admin event:', error);
        return NextResponse.json({ message: error.message || 'Failed to create event.' }, { status: 500 });
    }
}

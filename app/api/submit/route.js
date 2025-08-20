import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

// NOTE: The problematic 'date-fns-tz' library has been completely removed.

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mailer = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
const FROM = new Sender(process.env.FROM_EMAIL_ADDRESS || 'no-reply@clicketickets.com', 'Click eTickets');

function formatTimeForEmail(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    let hourInt = parseInt(hour, 10);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    hourInt = hourInt % 12 || 12;
    return `${hourInt}:${minute} ${ampm}`;
}

export async function POST(request) {
    await dbConnect();

    try {
        const form = await request.formData();

        const eventName = form.get('eventName')?.toString().trim();
        const eventDateRaw = form.get('eventDate')?.toString().trim(); // "YYYY-MM-DD"
        const eventTime = form.get('eventTime')?.toString().trim();     // "HH:mm"
        const eventLocation = form.get('eventLocation')?.toString().trim();
        const eventDescription = form.get('eventDescription')?.toString().trim();
        const ticketCountRaw = form.get('ticketCount')?.toString().trim();
        const flyer = form.get('flyer');

        const types = form.getAll('ticket_type[]').map(v => v.toString());
        const prices = form.getAll('ticket_price[]').map(v => v.toString());
        const includes = form.getAll('ticket_includes[]').map(v => v.toString());

        if (!eventName || !eventDateRaw || !eventTime || !eventLocation || !ticketCountRaw || !flyer) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        
        const ticketCount = Number(ticketCountRaw);
        if (!Number.isFinite(ticketCount) || ticketCount < 0) {
            return NextResponse.json({ message: 'Invalid ticket count.' }, { status: 400 });
        }

        const ticketTypes = types.map((label, i) => ({
            type: label,
            price: Number(prices[i] ?? 0),
            includes: (includes[i] ?? '').toString(),
        }));

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

        const { public_id: flyerPublicId, secure_url: flyerSecureUrl } = uploadResult;

        let flyerImageThumbnailPath = cloudinary.v2.url(flyerPublicId, {
            width: 800, crop: 'scale', format: 'webp', quality: 'auto:good',
        });
        let flyerImagePlaceholderPath = cloudinary.v2.url(flyerPublicId, {
            width: 20, crop: 'scale', format: 'webp', quality: 'auto:low', effect: 'blur:2000',
        });

        // ✅ FIX: Manually create a timezone-aware date without external libraries.
        // This creates a date string with the New York timezone offset (EDT = -04:00)
        // The JS Date constructor will correctly parse this into a UTC timestamp.
        const eventDate = new Date(`${eventDateRaw}T${eventTime}:00.000-04:00`);

        const newEvent = new Event({
            firstName: 'Admin',
            lastName: 'User',
            businessName: '',
            submitterEmail: (process.env.ADMIN_EMAIL_ADDRESS || 'admin@clicketickets.com').toLowerCase(),
            phone: '',
            eventName,
            eventDescription: eventDescription || 'No description provided.',
            eventDate,
            eventTime,
            eventLocation,
            ticketCount,
            tickets: ticketTypes,
            flyerImagePath: flyerSecureUrl,
            flyerPublicId,
            flyerImageThumbnailPath,
            flyerImagePlaceholderPath,
            status: 'pending',
        });

        await newEvent.save();

        const adminEmail = process.env.ADMIN_EMAIL_ADDRESS;
        if (adminEmail) {
            const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard`;
            const emailHtmlContent = `<div>...Email content here...</div>`; // Abbreviated for clarity
            const params = new EmailParams()
                .setFrom(FROM)
                .setTo([new Recipient(adminEmail, "Admin")])
                .setSubject(`New Event Submission: "${eventName}"`)
                .setHtml(emailHtmlContent);
            
            mailer.email.send(params).catch(err => console.error('Admin email failed:', err));
        }

        return NextResponse.json({ message: 'Event submitted successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error processing submission:', error);
        // Provide a more detailed error message in the response
        const errorMessage = error.message || 'An unknown error occurred.';
        return NextResponse.json({ message: `Failed to process submission: ${errorMessage}` }, { status: 500 });
    }
}

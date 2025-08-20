import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { zonedTimeToUtc } from 'date-fns-tz'; // ✅ added

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mailer = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
const FROM = new Sender(process.env.FROM_EMAIL_ADDRESS || 'no-reply@clicketickets.com', 'Click eTickets');

// Helper to format time for the email
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
        if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDateRaw)) {
            return NextResponse.json({ message: 'Invalid event date format.' }, { status: 400 });
        }
        if (!/^\d{2}:\d{2}$/.test(eventTime)) {
            return NextResponse.json({ message: 'Invalid event time format.' }, { status: 400 });
        }
        const ticketCount = Number(ticketCountRaw);
        if (!Number.isFinite(ticketCount) || ticketCount < 0) {
            return NextResponse.json({ message: 'Invalid ticket count.' }, { status: 400 });
        }
        if (types.length === 0 || prices.length === 0 || types.length !== prices.length) {
            return NextResponse.json({ message: 'At least one ticket type with price is required.' }, { status: 400 });
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
                {
                    folder: 'events',
                    resource_type: 'image',
                    format: 'webp',
                },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
            stream.end(buffer);
        });

        const flyerPublicId = uploadResult.public_id;
        const flyerSecureUrl = uploadResult.secure_url;

        const flyerImageThumbnailPath = cloudinary.v2.url(flyerPublicId, {
            width: 800, crop: 'scale', format: 'webp', quality: 'auto:good',
        });
        const flyerImagePlaceholderPath = cloudinary.v2.url(flyerPublicId, {
            width: 20, crop: 'scale', format: 'webp', quality: 'auto:low', effect: 'blur:2000',
        });

        const firstName = 'Admin';
        const lastName = 'User';
        const submitterEmail = (process.env.ADMIN_EMAIL_ADDRESS || process.env.FROM_EMAIL_ADDRESS || 'admin@clicketickets.com').toLowerCase();

        // ✅ FIX: Save date in New York timezone
        const eventDate = zonedTimeToUtc(`${eventDateRaw}T00:00:00`, 'America/New_York');

        const newEvent = new Event({
            firstName,
            lastName,
            businessName: '',
            submitterEmail,
            phone: '',
            eventName,
            eventDescription: eventDescription || 'No description provided.',
            eventDate,
            eventTime,
            eventLocation,
            ticketCount,
            tickets: ticketTypes,
            flyerImagePath: flyerSecureUrl,
            flyerPublicId: flyerPublicId,
            flyerImageThumbnailPath,
            flyerImagePlaceholderPath,
            status: 'pending',
        });

        await newEvent.save();

        const adminEmail = process.env.ADMIN_EMAIL_ADDRESS;
        if (adminEmail) {
            const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard`;
            const emailHtmlContent = `
              <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width: 600px;">
                <h2>New Event Submission: "${eventName}"</h2>
                <p>A new event has been submitted for approval. Here are the details:</p>
                <hr>
                <h3>Submitter Details</h3>
                <ul>
                    <li><strong>Name:</strong> ${firstName} ${lastName}</li>
                    <li><strong>Email:</strong> ${submitterEmail}</li>
                </ul>
                <h3>Event Details</h3>
                <ul>
                    <li><strong>Event Name:</strong> ${eventName}</li>
                    <li><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</li>
                    <li><strong>Time:</strong> ${formatTimeForEmail(eventTime)}</li>
                    <li><strong>Location:</strong> ${eventLocation}</li>
                </ul>
                <h3>Ticket Details</h3>
                <ul>
                    <li><strong>Total Tickets to Sell:</strong> ${ticketCount}</li>
                    ${ticketTypes.map(t => `<li><strong>${t.type}:</strong> $${Number(t.price).toFixed(2)} ${t.includes ? `— ${t.includes}` : ''}</li>`).join('')}
                </ul>
                <hr>
                <p style="text-align: center;">
                  <a href="${adminUrl}" style="display:inline-block;padding:12px 20px;background:#0056b3;color:#fff;text-decoration:none;border-radius:6px;">
                    Review in Admin Dashboard
                  </a>
                </p>
              </div>
            `;

            try {
                const params = new EmailParams()
                    .setFrom(FROM)
                    .setTo([new Recipient(adminEmail, "Admin")])
                    .setSubject(`New Event Submission: "${eventName}"`)
                    .setHtml(emailHtmlContent);

                await mailer.email.send(params);
            } catch (emailErr) {
                console.error('Admin notification email failed:', emailErr);
            }
        }

        return NextResponse.json({ message: 'Event submitted successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error processing submission:', error);
        return NextResponse.json({ message: 'Failed to process submission.', error: error.message }, { status: 500 });
    }
}

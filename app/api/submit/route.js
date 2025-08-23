import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

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

        // --- FIX: Read the submitter's details from the form ---
        const firstName = form.get('firstName')?.toString().trim();
        const lastName = form.get('lastName')?.toString().trim();
        const businessName = form.get('businessName')?.toString().trim();
        const submitterEmail = form.get('submitterEmail')?.toString().trim();
        const phone = form.get('phone')?.toString().trim();

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

        if (!firstName || !lastName || !submitterEmail || !eventName || !eventDateRaw || !eventTime || !eventLocation || !ticketCountRaw || !flyer) {
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

        const eventDate = new Date(`${eventDateRaw}T${eventTime}:00.000-04:00`);

        // --- FIX: Use the real submitter's details when creating the event ---
        const newEvent = new Event({
            firstName,
            lastName,
            businessName,
            submitterEmail: submitterEmail.toLowerCase(),
            phone,
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
            
            // --- FIX: Add the logo and build a more detailed email body ---
            const logoUrl = 'https://clicketickets.com/images/Clicketicketslogo.png';
            const formattedDateForEmail = new Date(eventDateRaw + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const formattedTimeForEmail = formatTimeForEmail(eventTime);
            const adminUrl = `${process.env.FRONTEND_URL}/admin-dashboard`;

            const emailHtmlContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${logoUrl}" alt="Click eTickets Logo" style="width: 200px; height: auto;" />
                    </div>
                    <h2 style="color: #0056b3;">New Event Submission</h2>
                    <p>A new event, "${eventName}", has been submitted and is awaiting your approval.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <h3 style="color: #333;">Submitter Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 10px;"><strong>Name:</strong> ${firstName} ${lastName}</li>
                        <li style="margin-bottom: 10px;"><strong>Email:</strong> ${submitterEmail}</li>
                        <li style="margin-bottom: 10px;"><strong>Phone:</strong> ${phone || 'N/A'}</li>
                        <li style="margin-bottom: 10px;"><strong>Business:</strong> ${businessName || 'N/A'}</li>
                    </ul>

                    <h3 style="color: #333; margin-top: 20px;">Event Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 10px;"><strong>Event Name:</strong> ${eventName}</li>
                        <li style="margin-bottom: 10px;"><strong>Date:</strong> ${formattedDateForEmail}</li>
                        <li style="margin-bottom: 10px;"><strong>Time:</strong> ${formattedTimeForEmail}</li>
                        <li style="margin-bottom: 10px;"><strong>Location:</strong> ${eventLocation}</li>
                        <li style="margin-bottom: 10px;"><strong>Total Tickets:</strong> ${ticketCount}</li>
                    </ul>

                    <p style="margin-top: 25px; text-align: center;">
                        <a href="${adminUrl}" style="background-color: #0056b3; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Go to Admin Dashboard to Review
                        </a>
                    </p>
                </div>
            `;
            
            const params = new EmailParams()
                .setFrom(FROM)
                .setTo([new Recipient(adminEmail, "Admin")])
                .setSubject(`New Event Submission: "${eventName}"`)
                .setHtml(emailHtmlContent)
                // --- FIX: Add a Reply-To header for easy replies ---
                .setReplyTo(new Recipient(submitterEmail, `${firstName} ${lastName}`));
            
            mailer.email.send(params).catch(err => console.error('Admin email failed:', err));
        }

        return NextResponse.json({ message: 'Event submitted successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error processing submission:', error);
        const errorMessage = error.message || 'An unknown error occurred.';
        return NextResponse.json({ message: `Failed to process submission: ${errorMessage}` }, { status: 500 });
    }
}

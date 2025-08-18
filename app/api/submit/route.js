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
        const body = await request.json();
        // Add submitterEmail to the list of expected data
        const {
            firstName, lastName, businessName, submitterEmail, phone,
            eventName, eventDescription, eventDate, eventTime, eventLocation,
            ticketCount, ticketTypes, flyerPublicId, flyerSecureUrl
        } = body;
        
        // Add submitterEmail to the validation check
        if (!firstName || !lastName || !submitterEmail || !eventName || !eventDate || !ticketCount || !flyerPublicId || !ticketTypes) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
             return NextResponse.json({ message: 'At least one ticket type is required.' }, { status: 400 });
        }
        if (isNaN(Date.parse(eventDate))) {
            return NextResponse.json({ message: 'Invalid event date format.' }, { status: 400 });
        }

        const newEvent = new Event({
            firstName, lastName, businessName, submitterEmail, phone,
            eventName, eventDescription, eventDate, eventTime, eventLocation,
            ticketCount,
            tickets: ticketTypes,
            flyerImagePath: flyerSecureUrl,
            flyerPublicId: flyerPublicId,
            flyerImageThumbnailPath: cloudinary.v2.url(flyerPublicId, {
                width: 800, crop: 'scale', format: 'webp', quality: 'auto:good',
            }),
            flyerImagePlaceholderPath: cloudinary.v2.url(flyerPublicId, {
                width: 20, crop: 'scale', format: 'webp', quality: 'auto:low', effect: 'blur:2000',
            }),
            status: 'pending'
        });

        await newEvent.save();

        const adminEmail = process.env.ADMIN_EMAIL_ADDRESS;
        if (adminEmail) {
            const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-dashboard`;
            
            // --- DETAILED EMAIL CONTENT ---
            const emailHtmlContent = `
              <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6; max-width: 600px;">
                <h2>New Event Submission: "${eventName}"</h2>
                <p>A new event has been submitted for approval. Here are the details:</p>
                <hr>
                <h3>Submitter Details</h3>
                <ul>
                    <li><strong>Name:</strong> ${firstName} ${lastName}</li>
                    <li><strong>Email:</strong> ${submitterEmail}</li>
                    <li><strong>Phone:</strong> ${phone || 'Not provided'}</li>
                    <li><strong>Business:</strong> ${businessName || 'Not provided'}</li>
                </ul>
                <h3>Event Details</h3>
                <ul>
                    <li><strong>Event Name:</strong> ${eventName}</li>
                    <li><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</li>
                    <li><strong>Time:</strong> ${formatTimeForEmail(eventTime)}</li>
                    <li><strong>Location:</strong> ${eventLocation}</li>
                </ul>
                <h3>Ticket Details</h3>
                <ul>
                    <li><strong>Total Tickets to Sell:</strong> ${ticketCount}</li>
                    ${ticketTypes.map(t => `<li><strong>${t.type}:</strong> $${parseFloat(t.price).toFixed(2)}</li>`).join('')}
                </ul>
                <hr>
                <p style="text-align: center;">
                  <a href="${adminUrl}" style="display:inline-block;padding:12px 20px;background:#0056b3;color:#fff;text-decoration:none;border-radius:6px;">
                    Review in Admin Dashboard
                  </a>
                </p>
              </div>
            `;

            const params = new EmailParams()
                .setFrom(FROM)
                .setTo([new Recipient(adminEmail, "Admin")])
                .setSubject(`New Event Submission: "${eventName}"`)
                .setHtml(emailHtmlContent);

            await mailer.email.send(params);
        }
        
        return NextResponse.json({ message: 'Event submitted successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error processing submission:', error);
        return NextResponse.json({ message: 'Failed to process submission.', error: error.message }, { status: 500 });
    }
}

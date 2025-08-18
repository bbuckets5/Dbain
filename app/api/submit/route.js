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

export async function POST(request) {
    await dbConnect();
    
    try {
        const body = await request.json();
        const {
            firstName, lastName, businessName, eventName, eventDescription,
            eventDate, eventTime, eventLocation, phone, ticketCount,
            ticketTypes, flyerPublicId, flyerSecureUrl
        } = body;
        
        if (!firstName || !lastName || !eventName || !eventDate || !ticketCount || !flyerPublicId || !ticketTypes) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
             return NextResponse.json({ message: 'At least one ticket type is required.' }, { status: 400 });
        }
        if (isNaN(Date.parse(eventDate))) {
            return NextResponse.json({ message: 'Invalid event date format.' }, { status: 400 });
        }

        const newEvent = new Event({
            firstName, lastName, businessName, eventName, eventDescription,
            eventDate, eventTime, eventLocation, phone, ticketCount,
            tickets: ticketTypes,
            flyerImagePath: flyerSecureUrl,
            flyerPublicId: flyerPublicId, // ADDED: Save the public ID to the database
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
            const params = new EmailParams()
                .setFrom(FROM)
                .setTo([new Recipient(adminEmail, "Admin")])
                .setSubject(`New Event Submission: "${eventName}"`)
                .setHtml(`
                    <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6;">
                      <h2>New Event Submitted for Approval</h2>
                      <p>A new event, <strong>${eventName}</strong>, has been submitted by ${firstName} ${lastName}.</p>
                      <p>Please review it in the admin dashboard.</p>
                      <p><a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#0056b3;color:#fff;text-decoration:none;border-radius:6px;">
                        Go to Dashboard
                      </a></p>
                    </div>
                `);
            await mailer.email.send(params);
        }
        
        return NextResponse.json({ message: 'Event submitted successfully!', id: newEvent._id }, { status: 201 });

    } catch (error) {
        console.error('Error processing submission:', error);
        return NextResponse.json({ message: 'Failed to process submission.', error: error.message }, { status: 500 });
    }
}

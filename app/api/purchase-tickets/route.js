// app/api/purchase-tickets/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { getOptionalAuth } from '@/lib/auth';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import qrcode from 'qrcode';
import { toDate } from 'date-fns-tz';
import { getLocalEventDate } from '@/lib/dateUtils';
// --- NEW: Import Cloudinary and a helper for streaming ---
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// --- NEW: Configure Cloudinary with your credentials ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const auth = getOptionalAuth();
        const userId = auth ? auth.userId : null;
        const { purchases, customerInfo } = await request.json();

        if (!purchases || !customerInfo || !customerInfo.email) {
            throw new Error('Missing purchase or customer information.');
        }

        const normalizedEmail = customerInfo.email.toLowerCase();
        const timeZone = 'America/New_York';
        let createdTickets = [];

        for (const purchaseItem of purchases) {
            const event = await Event.findById(purchaseItem.eventId).session(session);
            if (!event || event.status !== 'approved') {
                throw new Error(`Event not available.`);
            }

            const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
            const eventStart = toDate(eventDateString, { timeZone });
            if (new Date() > eventStart) {
                throw new Error(`Ticket sales have closed.`);
            }

            const totalTicketsRequested = purchaseItem.tickets.reduce((sum, t) => sum + t.quantity, 0);
            
            const updateResult = await Event.updateOne(
                { 
                    _id: event._id, 
                    $expr: { $lte: [ { $add: ["$ticketsSold", totalTicketsRequested] }, "$ticketCount" ] }
                },
                { $inc: { ticketsSold: totalTicketsRequested } }
            ).session(session);

            if (updateResult.modifiedCount === 0) {
                throw new Error('Not enough tickets available or high demand. Please try again.');
            }

            for (const ticketRequest of purchaseItem.tickets) {
                const ticketOption = event.tickets.find(t => t.type === ticketRequest.name);
                if (!ticketOption) throw new Error(`Ticket type not found.`);
                
                for (let i = 0; i < ticketRequest.quantity; i++) {
                    createdTickets.push({
                        eventId: event._id,
                        userId: userId || null,
                        ticketType: ticketRequest.name,
                        price: ticketOption.price,
                        customerFirstName: customerInfo.firstName,
                        customerLastName: customerInfo.lastName,
                        customerEmail: normalizedEmail,
                    });
                }
            }
        }
        
        const savedTicketDocs = await Ticket.insertMany(createdTickets, { session });
        await session.commitTransaction();

        // --- MODIFIED SECTION START: Generate, upload, and update QR codes after purchase ---
        const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(normalizedEmail);
        const firstEvent = await Event.findById(purchases[0].eventId).lean();
        
        const logoUrl = 'https://clicketickets.com/images/Clicketicketslogo.png';
        const emailHeader = `
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="${logoUrl}" alt="Click eTickets Logo" style="width: 200px; height: auto;" />
            </div>
        `;

        let ticketsHtml = '';
        for (const ticketDoc of savedTicketDocs) {
            const event = await Event.findById(ticketDoc.eventId).lean();
            const { fullDate, time } = getLocalEventDate(event);
            
            // 1. Generate QR code as an image buffer
            const qrCodeBuffer = await qrcode.toBuffer(ticketDoc._id.toString(), { width: 200, margin: 1 });

            // 2. Upload the buffer to Cloudinary
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "qrcodes", public_id: ticketDoc._id.toString() },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                streamifier.createReadStream(qrCodeBuffer).pipe(uploadStream);
            });
            const uploadResult = await uploadPromise;
            const qrCodeUrl = uploadResult.secure_url;

            // 3. Save the new Cloudinary URL to the ticket in the database
            await Ticket.findByIdAndUpdate(ticketDoc._id, { qrCodeUrl: qrCodeUrl });

            // 4. Use the public Cloudinary URL in the email
            ticketsHtml += `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p><strong>Event:</strong> ${event.eventName}</p>
                    <p><strong>Date:</strong> ${fullDate} at ${time}</p>
                    <p><strong>Ticket Type:</strong> ${ticketDoc.ticketType}</p>
                    <p><strong>Ticket ID:</strong> ${ticketDoc._id.toString()}</p>
                    <img src="${qrCodeUrl}" alt="QR Code for ticket ${ticketDoc._id}" />
                </div>
            `;
        }
        // --- MODIFIED SECTION END ---

        let emailBody;
        if (userId) {
            emailBody = `<h2>Purchase Confirmation</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase!</p><p>Your tickets are included below. They have also been saved to your account and can be viewed anytime in the "My Tickets" section of our website.</p>${ticketsHtml}`;
        } else {
            emailBody = `<h2>Your Tickets</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase! Your tickets are attached below.</p>${ticketsHtml}`;
        }

        const emailHtmlContent = emailHeader + emailBody;

        const emailParams = new EmailParams()
            .setFrom(sender).setTo([recipient])
            .setSubject(`Your Tickets for ${firstEvent.eventName}`)
            .setHtml(`<div style="font-family: Arial, sans-serif; line-height: 1.6;">${emailHtmlContent}</div>`);

        await mailerSend.email.send(emailParams);

        return NextResponse.json({ message: 'Purchase successful!' }, { status: 200 });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Purchase failed:", error);
        return NextResponse.json({ message: error.message || 'Failed to complete purchase.' }, { status: 500 });
    } finally {
        session.endSession();
    }
}

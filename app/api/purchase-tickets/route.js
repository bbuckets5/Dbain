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
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

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

        // --- PROCESS EACH EVENT ---
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

            // --- PROCESS TICKETS FOR THIS EVENT ---
            for (const ticketRequest of purchaseItem.tickets) {
                
                // === PATH A: RESERVED SEATING (Specific Seat ID) ===
                if (ticketRequest.seatId) {
                    // 1. Find the specific seat in the array
                    const seat = event.seats.id(ticketRequest.seatId);
                    if (!seat) {
                        throw new Error(`Seat not found: ${ticketRequest.name}`);
                    }

                    // 2. Safety Check: Is it already sold?
                    if (seat.status === 'sold') {
                        throw new Error(`Seat ${seat.section}-${seat.row}-${seat.number} has already been sold.`);
                    }

                    // 3. Mark the seat as SOLD in the Event document
                    // We use array filters to update the specific sub-document
                    await Event.updateOne(
                        { "_id": event._id, "seats._id": ticketRequest.seatId },
                        { 
                            "$set": { 
                                "seats.$.status": "sold",
                                "seats.$.heldBy": null,     // Clear the hold
                                "seats.$.holdExpires": null // Clear the timer
                            }
                        }
                    ).session(session);

                    // 4. Create the Ticket Record
                    createdTickets.push({
                        eventId: event._id,
                        userId: userId || null,
                        ticketType: ticketRequest.name, // e.g. "Section A - Row 1 - Seat 5"
                        price: seat.price,
                        seatId: ticketRequest.seatId,   // Link to the specific seat
                        customerFirstName: customerInfo.firstName,
                        customerLastName: customerInfo.lastName,
                        customerEmail: normalizedEmail,
                        status: 'valid'
                    });

                } 
                // === PATH B: GENERAL ADMISSION (Standard Logic) ===
                else {
                    const ticketOption = event.tickets.find(t => t.type === ticketRequest.name);
                    if (!ticketOption) throw new Error(`Ticket type not found: ${ticketRequest.name}`);

                    // 1. Check Capacity & Increment Count
                    const updateResult = await Event.updateOne(
                        { 
                            _id: event._id, 
                            $expr: { $lte: [ { $add: ["$ticketsSold", ticketRequest.quantity] }, "$ticketCount" ] }
                        },
                        { $inc: { ticketsSold: ticketRequest.quantity } }
                    ).session(session);

                    if (updateResult.modifiedCount === 0) {
                        throw new Error('Not enough tickets available.');
                    }

                    // 2. Create Ticket Records (Loop for quantity)
                    for (let i = 0; i < ticketRequest.quantity; i++) {
                        createdTickets.push({
                            eventId: event._id,
                            userId: userId || null,
                            ticketType: ticketRequest.name,
                            price: ticketOption.price,
                            customerFirstName: customerInfo.firstName,
                            customerLastName: customerInfo.lastName,
                            customerEmail: normalizedEmail,
                            status: 'valid'
                        });
                    }
                }
            }
        }
        
        // --- SAVE ALL TICKETS ---
        const savedTicketDocs = await Ticket.insertMany(createdTickets, { session });
        await session.commitTransaction();

        // --- EMAILS & QR CODES (Post-Transaction) ---
        // This part runs AFTER the database is safely updated
        try {
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
                
                // Generate QR
                const qrCodeBuffer = await qrcode.toBuffer(ticketDoc._id.toString(), { width: 200, margin: 1 });

                // Upload to Cloudinary
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

                // Save URL
                await Ticket.findByIdAndUpdate(ticketDoc._id, { qrCodeUrl: qrCodeUrl });

                // Add to Email
                ticketsHtml += `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p><strong>Event:</strong> ${event.eventName}</p>
                        <p><strong>Date:</strong> ${fullDate} at ${time}</p>
                        <p><strong>Ticket Type:</strong> ${ticketDoc.ticketType}</p>
                        <p><strong>Ticket ID:</strong> ${ticketDoc._id.toString()}</p>
                        <img src="${qrCodeUrl}" alt="QR Code" />
                    </div>
                `;
            }

            let emailBody;
            if (userId) {
                emailBody = `<h2>Purchase Confirmation</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase!</p><p>Your tickets are included below and saved to your "My Tickets" account.</p>${ticketsHtml}`;
            } else {
                emailBody = `<h2>Your Tickets</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase! Your tickets are attached below.</p>${ticketsHtml}`;
            }

            const emailHtmlContent = emailHeader + emailBody;
            const emailParams = new EmailParams()
                .setFrom(sender).setTo([recipient])
                .setSubject(`Your Tickets for ${firstEvent.eventName}`)
                .setHtml(`<div style="font-family: Arial, sans-serif; line-height: 1.6;">${emailHtmlContent}</div>`);

            await mailerSend.email.send(emailParams);

        } catch (emailError) {
            console.error("Email sending failed (tickets were still purchased):", emailError);
            // We do NOT fail the request here because the user already paid/tickets are generated.
        }

        return NextResponse.json({ message: 'Purchase successful!' }, { status: 200 });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Purchase failed:", error);
        return NextResponse.json({ message: error.message || 'Failed to complete purchase.' }, { status: 500 });
    } finally {
        session.endSession();
    }
}

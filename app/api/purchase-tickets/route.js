import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { getOptionalAuth } from '@/lib/auth';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import qrcode from 'qrcode';
// --- THE FIX: Import the correct time zone tools ---
import { format, toDate } from 'date-fns-tz';

export async function POST(request) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const auth = getOptionalAuth();
        const userId = auth ? auth.userId : null;
        const { purchases, customerInfo } = await request.json();

        if (!purchases || !customerInfo || !customerInfo.email || purchases.length === 0) {
            throw new Error('Missing or invalid purchase or customer information.');
        }

        const timeZone = 'America/New_York';
        let createdTickets = [];

        for (const purchaseItem of purchases) {
            const event = await Event.findById(purchaseItem.eventId).session(session);
            
            if (!event || event.status !== 'approved') {
                throw new Error(`Event "${purchaseItem.eventId}" is not available for purchase.`);
            }

            // --- RELIABLE TIME CHECK ---
            const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
            const eventStart = toDate(eventDateString, { timeZone });
            if (new Date() > eventStart) {
                throw new Error(`Ticket sales for "${event.eventName}" have closed as the event has started.`);
            }

            // Check inventory
            const totalTicketsRequested = purchaseItem.tickets.reduce((sum, t) => sum + t.quantity, 0);
            if (event.ticketsSold + totalTicketsRequested > event.ticketCount) {
                throw new Error(`Not enough tickets available for "${event.eventName}".`);
            }
            event.ticketsSold += totalTicketsRequested;
            await event.save({ session });

            // Prepare ticket documents
            for (const ticketRequest of purchaseItem.tickets) {
                const ticketOption = event.tickets.find(t => t.type === ticketRequest.name);
                if (!ticketOption) throw new Error(`Ticket type "${ticketRequest.name}" not found.`);
                
                for (let i = 0; i < ticketRequest.quantity; i++) {
                    createdTickets.push({
                        eventId: event._id, userId, ticketType: ticketRequest.name,
                        price: ticketOption.price, customerFirstName: customerInfo.firstName,
                        customerLastName: customerInfo.lastName, customerEmail: customerInfo.email,
                    });
                }
            }
        }
        
        const savedTicketDocs = await Ticket.insertMany(createdTickets, { session });
        await session.commitTransaction();

        // --- RELIABLE EMAIL FORMATTING ---
        const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(customerInfo.email);
        let emailHtmlContent;
        const firstEvent = await Event.findById(purchases[0].eventId).lean();

        if (userId) { // User is logged in
            emailHtmlContent = `<h2>Purchase Confirmation</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase!</p><p>Your tickets have been added to your account. You can view them at any time in the "My Tickets" section on our website.</p>`;
        } else { // User is a guest
            let ticketsHtml = '';
            for (const ticketDoc of savedTicketDocs) {
                const event = await Event.findById(ticketDoc.eventId).lean();
                const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
                const eventDateObj = toDate(eventDateString, { timeZone });
                const formattedDate = format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone });
                const formattedTime = format(eventDateObj, 'h:mm a', { timeZone });
                const qrCodeDataUrl = await qrcode.toDataURL(ticketDoc._id.toString(), { width: 150, margin: 2 });
                ticketsHtml += `<div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px;"><p><strong>Event:</strong> ${event.eventName}</p><p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p><p><strong>Ticket Type:</strong> ${ticketDoc.ticketType}</p><img src="${qrCodeDataUrl}" alt="QR Code" style="display: block; margin: 10px auto;"></div>`;
            }
            emailHtmlContent = `<h2>Your Tickets from Click eTickets</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase! Your QR codes are below:</p>${ticketsHtml}`;
        }

        const emailParams = new EmailParams()
            .setFrom(sender).setTo([recipient])
            .setSubject(`Your Tickets for ${firstEvent.eventName}`)
            .setHtml(`<div style="font-family: Arial, sans-serif;">${emailHtmlContent}</div>`);

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

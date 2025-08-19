import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import { getOptionalAuth } from '@/lib/auth';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import qrcode from 'qrcode';
import { format, toDate } from 'date-fns-tz';

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
            if (event.ticketsSold + totalTicketsRequested > event.ticketCount) {
                throw new Error(`Not enough tickets available.`);
            }
            event.ticketsSold += totalTicketsRequested;
            await event.save({ session });

            for (const ticketRequest of purchaseItem.tickets) {
                const ticketOption = event.tickets.find(t => t.type === ticketRequest.name);
                if (!ticketOption) throw new Error(`Ticket type not found.`);
                
                for (let i = 0; i < ticketRequest.quantity; i++) {
                    createdTickets.push({
                        eventId: event._id,
                        userId: userId || null,                // FIX: store userId if logged in
                        ticketType: ticketRequest.name,
                        price: ticketOption.price,
                        customerFirstName: customerInfo.firstName,
                        customerLastName: customerInfo.lastName,
                        customerEmail: normalizedEmail,        // FIX: always store email
                    });
                }
            }
        }
        
        const savedTicketDocs = await Ticket.insertMany(createdTickets, { session });
        await session.commitTransaction();

        const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(normalizedEmail);
        let emailHtmlContent;
        const firstEvent = await Event.findById(purchases[0].eventId).lean();

        if (userId) {
            emailHtmlContent = `<h2>Purchase Confirmation</h2><p>Hello ${customerInfo.firstName}, thank you for your purchase!</p><p>Your tickets have been added to your account. View them anytime in "My Tickets".</p>`;
        } else {
            let ticketsHtml = '';
            for (const ticketDoc of savedTicketDocs) {
                const event = await Event.findById(ticketDoc.eventId).lean();
                const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
                const eventDateObj = toDate(eventDateString, { timeZone });
                const formattedDate = format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone });
                const formattedTime = format(eventDateObj, 'h:mm a', { timeZone });
                const qrCodeDataUrl = await qrcode.toDataURL(ticketDoc._id.toString(), { width: 150, margin: 2 });
                ticketsHtml += `<div><p><strong>Event:</strong> ${event.eventName}</p><p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p><p><strong>Ticket Type:</strong> ${ticketDoc.ticketType}</p><img src="${qrCodeDataUrl}" /></div>`;
            }
            emailHtmlContent = `<h2>Your Tickets</h2><p>Hello ${customerInfo.firstName}, here are your tickets:</p>${ticketsHtml}`;
        }

        const emailParams = new EmailParams()
            .setFrom(sender).setTo([recipient])
            .setSubject(`Your Tickets for ${firstEvent.eventName}`)
            .setHtml(`<div>${emailHtmlContent}</div>`);

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

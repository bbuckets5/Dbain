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

        const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(normalizedEmail);
        const firstEvent = await Event.findById(purchases[0].eventId).lean();
        
        // --- FIX: Updated the logo URL to use your new custom domain ---
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
            const qrCodeDataUrl = await qrcode.toDataURL(ticketDoc._id.toString(), { width: 150, margin: 2 });
            
            ticketsHtml += `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p><strong>Event:</strong> ${event.eventName}</p>
                    <p><strong>Date:</strong> ${fullDate} at ${time}</p>
                    <p><strong>Ticket Type:</strong> ${ticketDoc.ticketType}</p>
                    {/* --- FIX: Added the missing Ticket ID line --- */}
                    <p><strong>Ticket ID:</strong> ${ticketDoc._id.toString()}</p>
                    <img src="${qrCodeDataUrl}" alt="QR Code for ticket ${ticketDoc._id}" />
                </div>
            `;
        }

        let emailBody;
        if (userId) {
            emailBody = `
                <h2>Purchase Confirmation</h2>
                <p>Hello ${customerInfo.firstName}, thank you for your purchase!</p>
                <p>Your tickets are included below. They have also been saved to your account and can be viewed anytime in the "My Tickets" section of our website.</p>
                ${ticketsHtml}
            `;
        } else {
            emailBody = `
                <h2>Your Tickets</h2>
                <p>Hello ${customerInfo.firstName}, thank you for your purchase! Your tickets are attached below.</p>
                ${ticketsHtml}
            `;
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

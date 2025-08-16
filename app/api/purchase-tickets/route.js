// In app/api/purchase-tickets/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';

function formatTimeServer(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    let hourInt = parseInt(hour, 10);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    hourInt = hourInt % 12 || 12;
    return `${hourInt}:${minute} ${ampm}`;
}

export async function POST(request) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await request.json();
        const { purchases, customerInfo } = body;

        if (!purchases || !customerInfo || purchases.length === 0) {
            throw new Error('Missing purchase or customer information.');
        }

        let allTicketsForDb = [];
        let allTicketsForEmail = [];

        const token = request.cookies.get('authToken')?.value;
        let userId = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (err) {
                console.warn('Invalid token on purchase, proceeding as guest.');
            }
        }

        for (const purchaseItem of purchases) {
            const event = await Event.findById(purchaseItem.eventId).session(session);
            
            if (!event || event.status !== 'approved') {
                throw new Error(`Event with ID ${purchaseItem.eventId} is not available for purchase.`);
            }

            // --- THIS IS THE CORRECTED LINE ---
            // This new version safely handles the date whether it's a string or a Date object.
            const eventStartDateTime = new Date(`${new Date(event.eventDate).toISOString().substring(0, 10)}T${event.eventTime}`);
            const now = new Date();
            if (now > eventStartDateTime) {
                throw new Error(`Ticket sales for "${event.eventName}" have closed because the event has already started.`);
            }

            let totalTicketsRequestedForEvent = 0;
            for (const ticketRequest of purchaseItem.tickets) {
                const ticketOption = event.tickets.find(t => t.type === ticketRequest.name);
                if (!ticketOption) {
                    throw new Error(`Ticket type "${ticketRequest.name}" not found for event "${event.eventName}".`);
                }
                totalTicketsRequestedForEvent += ticketRequest.quantity;
            }

            if (event.ticketsSold + totalTicketsRequestedForEvent > event.ticketCount) {
                throw new Error(`Sorry, not enough tickets available for "${event.eventName}". Purchase blocked.`);
            }

            event.ticketsSold += totalTicketsRequestedForEvent;
            await event.save({ session });

            for (const ticketRequest of purchaseItem.tickets) {
                const ticketOption = event.tickets.find(t => t.type === ticketRequest.name);
                for (let i = 0; i < ticketRequest.quantity; i++) {
                    allTicketsForDb.push({
                        eventId: event._id,
                        userId: userId,
                        ticketType: ticketRequest.name,
                        price: ticketOption.price,
                        customerFirstName: customerInfo.firstName,
                        customerLastName: customerInfo.lastName,
                        customerEmail: customerInfo.email,
                    });
                    allTicketsForEmail.push({
                        eventName: event.eventName,
                        eventDate: event.eventDate,
                        eventTime: event.eventTime,
                        ticketType: ticketRequest.name,
                    });
                }
            }
        }

        const savedTicketDocs = await Ticket.insertMany(allTicketsForDb, { session });
        
        await session.commitTransaction();

        const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(customerInfo.email);
        
        let ticketsHtml = '';
        for (let i = 0; i < savedTicketDocs.length; i++) {
            const ticketDoc = savedTicketDocs[i];
            const emailInfo = allTicketsForEmail[i];
            const qrCodeDataUrl = await qrcode.toDataURL(ticketDoc._id.toString(), { width: 150, margin: 2 });
            const formattedTime = formatTimeServer(emailInfo.eventTime);
            const formattedDate = new Date(emailInfo.eventDate).toLocaleDateString();

            ticketsHtml += `
                <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                    <p><strong>Event:</strong> ${emailInfo.eventName}</p>
                    <p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
                    <p><strong>Ticket Type:</strong> ${emailInfo.ticketType}</p>
                    <p><strong>Ticket ID:</strong> ${ticketDoc._id}</p>
                    <img src="${qrCodeDataUrl}" alt="QR Code" style="display: block; margin: 10px auto;">
                </div>
            `;
        }

        const emailHtmlContent = `
            <h2>Your Click eTickets Purchase Confirmation</h2>
            <p>Hello ${customerInfo.firstName}, thank you for your purchase! Your QR codes are below:</p>
            ${ticketsHtml}
            <p>Best regards,<br>The Click eTickets Team</p>
        `;
        
        const emailParams = new EmailParams()
            .setFrom(sender)
            .setTo([recipient])
            .setSubject(`Your Tickets for ${allTicketsForEmail[0].eventName}`)
            .setHtml(emailHtmlContent);

        await mailerSend.email.send(emailParams);

        return NextResponse.json({ message: 'Purchase successful!' }, { status: 200 });

    } catch (error) {
        await session.abortTransaction();
        console.error("Purchase failed:", error);
        return NextResponse.json({ message: error.message || 'Failed to complete purchase.' }, { status: 500 });
    } finally {
        session.endSession();
    }
}


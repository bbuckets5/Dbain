import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/auth';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import qrcode from 'qrcode';
// --- THE FIX: Use the correct 'toDate' function from the main library ---
import { format, toDate } from 'date-fns-tz';

export async function POST(request, { params }) {
    await dbConnect();

    try {
        await requireAdmin();

        const { ticketId } = params;
        const ticket = await Ticket.findById(ticketId).populate('eventId');

        if (!ticket || !ticket.eventId) {
            return NextResponse.json({ message: 'Ticket or associated event not found.' }, { status: 404 });
        }
        
        const recipientEmail = ticket.customerEmail;
        if (!recipientEmail) {
            return NextResponse.json({ message: 'Recipient email could not be found for this ticket.' }, { status: 400 });
        }

        const timeZone = 'America/New_York';
        const eventDateString = `${ticket.eventId.eventDate.toISOString().substring(0, 10)}T${ticket.eventId.eventTime}`;
        // Use the correct 'toDate' function for a reliable Date object
        const eventDateObj = toDate(eventDateString, { timeZone });
        
        // Format the reliable Date object for display in the email
        const formattedDate = format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone });
        const formattedTime = format(eventDateObj, 'h:mm a', { timeZone });
        
        const qrCodeDataUrl = await qrcode.toDataURL(ticket._id.toString(), { width: 150, margin: 2 });

        const ticketHtml = `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                <p><strong>Event:</strong> ${ticket.eventId.eventName}</p>
                <p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
                <p><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
                <p><strong>Ticket ID:</strong> ${ticket._id}</p>
                <img src="${qrCodeDataUrl}" alt="QR Code" style="display: block; margin: 10px auto;">
            </div>`;

        const emailHtmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                <h2>Your Ticket (Resent)</h2>
                <p>Hello ${ticket.customerFirstName},</p>
                <p>As requested, here is your ticket information again.</p>
                ${ticketHtml}
                <p>Thank you,<br>The Team</p>
            </div>`;

        const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
        const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, "Click eTickets");
        const recipient = new Recipient(recipientEmail);

        const emailParams = new EmailParams()
            .setFrom(sender)
            .setTo([recipient])
            .setSubject(`Your Ticket for ${ticket.eventId.eventName} (Resent)`)
            .setHtml(emailHtmlContent);

        await mailerSend.email.send(emailParams);
        
        return NextResponse.json({ message: `Ticket successfully resent to ${recipientEmail}` }, { status: 200 });

    } catch (error) {
        console.error("Error resending ticket:", error);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        return NextResponse.json({ message: "Server Error: Failed to resend ticket." }, { status: 500 });
    }
}

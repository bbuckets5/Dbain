import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/auth';
import Ticket from '@/models/Ticket';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import qrcode from 'qrcode';

// Helper function to format time
function formatTimeServer(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    let hourInt = parseInt(hour, 10);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    hourInt = hourInt % 12 || 12;
    return `${hourInt}:${minute} ${ampm}`;
}

export async function POST(request, { params }) {
    await dbConnect();

    try {
        // 1. Authenticate and authorize the user as an admin.
        // This function will throw an error if the user is not a valid admin.
        await requireAdmin();

        const { ticketId } = params;

        // 2. Find the ticket in the database and populate the event details.
        // Thanks to our model correction, .populate('eventId') will now work perfectly.
        const ticket = await Ticket.findById(ticketId).populate('eventId');

        if (!ticket || !ticket.eventId) {
            return NextResponse.json({ message: 'Ticket or associated event not found.' }, { status: 404 });
        }
        
        const recipientEmail = ticket.customerEmail;
        if (!recipientEmail) {
            return NextResponse.json({ message: 'Recipient email could not be found for this ticket.' }, { status: 400 });
        }

        // 3. Generate a QR Code and the HTML content for the email.
        const qrCodeDataUrl = await qrcode.toDataURL(ticket._id.toString(), { width: 150, margin: 2 });
        const formattedTime = formatTimeServer(ticket.eventId.eventTime);
        const formattedDate = new Date(ticket.eventId.eventDate).toLocaleDateString();

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

        // 4. Send the email using the MailerSend service.
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
        // Catch specific authentication/authorization errors from our helper
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        // Catch all other errors
        return NextResponse.json({ message: "Server Error: Failed to resend ticket." }, { status: 500 });
    }
}
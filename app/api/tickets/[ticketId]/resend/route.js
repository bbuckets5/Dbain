// app/api/tickets/[ticketId]/resend/route.js (or your current path)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/auth';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import qrcode from 'qrcode';
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

export async function POST(request, { params }) {
  await dbConnect();

  try {
    await requireAdmin();

    const { ticketId } = params;
    const ticket = await Ticket.findById(ticketId).populate('eventId');

    if (!ticket || !ticket.eventId) {
      return NextResponse.json(
        { message: 'Ticket or associated event not found.' },
        { status: 404 }
      );
    }

    const recipientEmail = ticket.customerEmail;
    if (!recipientEmail) {
      return NextResponse.json(
        { message: 'Recipient email not found for this ticket.' },
        { status: 400 }
      );
    }

    // --- Safe date handling in America/New_York ---
    const tz = 'America/New_York';
    const ev = ticket.eventId;

    // Normalize eventDate to YYYY-MM-DD (works if Date or string)
    const yyyyMmDd =
      typeof ev.eventDate === 'string'
        ? ev.eventDate.slice(0, 10)
        : ev.eventDate instanceof Date
        ? ev.eventDate.toISOString().slice(0, 10)
        : '';

    const hhmm =
      ev.eventTime && /^\d{2}:\d{2}$/.test(ev.eventTime) ? ev.eventTime : '00:00';

    const nyDateTime = `${yyyyMmDd || '1970-01-01'}T${hhmm}:00`;
    const eventUtc = zonedTimeToUtc(nyDateTime, tz);

    const formattedDate = formatInTimeZone(eventUtc, tz, 'EEEE, MMMM d, yyyy');
    const formattedTime = formatInTimeZone(eventUtc, tz, 'h:mm a');

    // QR code for the ticket id
    const qrCodeDataUrl = await qrcode.toDataURL(ticket._id.toString(), {
      width: 150,
      margin: 2,
    });

    const ticketHtml = `
      <div style="border:1px solid #ddd;padding:15px;margin-bottom:20px;border-radius:8px;">
        <p><strong>Event:</strong> ${ev.eventName}</p>
        <p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
        <p><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
        <p><strong>Ticket ID:</strong> ${ticket._id}</p>
        <img src="${qrCodeDataUrl}" alt="QR Code" style="display:block;margin:10px auto;">
      </div>
    `;

    const emailHtmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2>Your Ticket (Resent)</h2>
        <p>Hello ${ticket.customerFirstName || 'there'},</p>
        <p>As requested, here is your ticket information again.</p>
        ${ticketHtml}
        <p>Thank you,<br>Click eTickets</p>
      </div>
    `;

    const mailerSend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
    const sender = new Sender(process.env.FROM_EMAIL_ADDRESS, 'Click eTickets');
    const recipient = new Recipient(recipientEmail);

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo([recipient])
      .setSubject(`Your Ticket for ${ev.eventName} (Resent)`)
      .setHtml(emailHtmlContent);

    await mailerSend.email.send(emailParams);

    return NextResponse.json(
      { message: `Ticket successfully resent to ${recipientEmail}` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resending ticket:', error);
    if (
      typeof error?.message === 'string' &&
      (error.message.includes('Authentication') || error.message.includes('Forbidden'))
    ) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: 'Server Error: Failed to resend ticket.' },
      { status: 500 }
    );
  }
}

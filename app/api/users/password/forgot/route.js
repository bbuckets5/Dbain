// app/api/users/password/forgot/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const mailer = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });
const FROM = new Sender(process.env.FROM_EMAIL_ADDRESS || 'no-reply@clicketickets.com', 'Click eTickets');

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond 200 to avoid email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If that email exists, a reset link was sent.' }, { status: 200 });
    }

    // Token -> store only hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

    // Helpful in dev
    if (process.env.NODE_ENV !== 'production') {
      console.log('RESET URL:', resetUrl);
    }

    const params = new EmailParams()
      .setFrom(FROM)
      .setTo([new Recipient(email)])
      .setSubject('Reset your Click eTickets password')
      .setHtml(`
        <div style="font-family: Arial, sans-serif; color:#333; line-height:1.6;">
          <h2>Reset your password</h2>
          <p>Click the button below to set a new password (link expires in 1 hour):</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#0056b3;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
          <p>If you didn’t request this, you can ignore this email.</p>
        </div>
      `);

    await mailer.email.send(params);

    return NextResponse.json({ message: 'If that email exists, a reset link was sent.' }, { status: 200 });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(req) {
    await dbConnect();

    try {
        const { token, newPassword } = await req.json();
        if (!token || !newPassword) {
            return NextResponse.json({ message: 'Token and new password are required.' }, { status: 400 });
        }

        // 1. Validate the new password's strength, just like in registration.
        const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!policy.test(newPassword)) {
            return NextResponse.json({ message: 'Password does not meet complexity requirements.' }, { status: 400 });
        }

        // 2. Hash the incoming token to safely compare it with the one in the database.
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 3. Find the user by the hashed token AND ensure the token has not expired.
        const user = await User.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpires: { $gt: Date.now() }, // Check if the expiration date is in the future
        });

        // If no user is found, the token was either wrong or expired.
        if (!user) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 400 });
        }

        // 4. Hash the new password and update the user's record.
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // 5. CRITICAL: Invalidate the token so it cannot be used again.
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        
        await user.save();

        return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });
    } catch (err) {
        console.error('Reset password error:', err);
        return NextResponse.json({ message: 'Server error.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import { getAuthedUser } from '@/lib/auth';
import User from '@/models/User';

export async function PATCH(request) {
    await dbConnect();

    try {
        // 1. Get the authenticated user using our central helper.
        // This handles token verification and finds the user in the database.
        const user = await getAuthedUser();

        const { currentPassword, newPassword } = await request.json();

        // 2. Robust Validation
        if (!currentPassword || !newPassword) {
            return NextResponse.json({ message: 'Current and new passwords are required.' }, { status: 400 });
        }

        // Check if the new password is the same as the old one
        if (currentPassword === newPassword) {
            return NextResponse.json({ message: 'New password cannot be the same as the current password.' }, { status: 400 });
        }

        // Enforce password complexity for the new password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return NextResponse.json({ 
                message: 'New password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character.' 
            }, { status: 400 });
        }

        // 3. Verify the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ message: 'Incorrect current password.' }, { status: 401 });
        }

        // 4. Hash and save the new password
        const salt = await bcrypt.genSalt(10);
        // We need to fetch the full user document to save it, not the plain object from getAuthedUser
        const userToUpdate = await User.findById(user._id);
        userToUpdate.password = await bcrypt.hash(newPassword, salt);
        await userToUpdate.save();

        return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });

    } catch (error) {
        console.error("Change password error:", error.message);
        if (error.message.includes('Authentication')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 401 });
        }
        return NextResponse.json({ message: 'Server error changing password.' }, { status: 500 });
    }
}
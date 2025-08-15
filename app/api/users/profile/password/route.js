// app/api/users/profile/password/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import User from '@/models/User';

export async function PATCH(request) {
    try {
        // 1. Authenticate the user
        const cookieStore = cookies();
        const token = cookieStore.get('authToken')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Authentication token not found.' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 2. Get the passwords from the request body
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ message: 'Current and new passwords are required.' }, { status: 400 });
        }

        // 3. Find the user in the database
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.DB_CONNECTION_STRING);
        }
        
        const user = await User.findById(decoded.userId);
        if (!user) {
            return NextResponse.json({ message: 'User not found.' }, { status: 404 });
        }

        // 4. Verify the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ message: 'Incorrect current password.' }, { status: 400 });
        }

        // 5. Hash and save the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
             return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }
        console.error("Change password error:", error);
        return NextResponse.json({ message: 'Server error changing password.' }, { status: 500 });
    }
}
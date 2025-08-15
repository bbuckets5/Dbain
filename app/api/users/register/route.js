// app/api/users/register/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '@/models/User';

export async function POST(request) {
    try {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.DB_CONNECTION_STRING);
        }

        const body = await request.json();
        const { firstName, lastName, email, password } = body;

        // --- Server-Side Validation ---
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 400 });
        }

        // --- Securely Hash the Password ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- Create and Save the New User ---
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword
        });

        await newUser.save();
        
        return NextResponse.json({ message: "User registered successfully!" }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ message: 'Server error during registration.' }, { status: 500 });
    }
}
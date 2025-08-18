import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function POST(request) {
    // 1. Connect to the database using our reusable helper
    await dbConnect();

    try {
        const body = await request.json();
        const { firstName, lastName, email, password } = body;

        // --- 2. Robust Server-Side Validation ---
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ message: 'Please provide a valid email address.' }, { status: 400 });
        }

        // Password complexity validation (matches your old server.js rules)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return NextResponse.json({ 
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
            }, { status: 400 });
        }

        // --- 3. Check if user already exists ---
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 }); // 409 Conflict is more specific
        }

        // --- 4. Securely Hash the Password ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- 5. Create and Save the New User ---
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(), // Store email in lowercase for consistency
            password: hashedPassword
        });

        await newUser.save();
        
        // Do not send the user object back, just a success message.
        return NextResponse.json({ message: "User registered successfully!" }, { status: 201 });

    } catch (error) {
        console.error("Registration API error:", error);
        return NextResponse.json({ message: 'Server error during registration.' }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function POST(request) {
    await dbConnect();

    try {
        const { email, password } = await request.json();

        // 1. Basic validation
        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
        }

        // Normalize email to ensure consistent lookups
        const emailNorm = email.trim().toLowerCase();
        
        // 2. Find user by normalized email
        const user = await User.findOne({ email: emailNorm });

        // 3. Securely compare password
        // If user is not found OR password doesn't match, send the same generic error
        if (!user || !(await bcrypt.compare(password, user.password))) {
            // This prevents attackers from knowing if an email is registered or not
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // 4. Create the JSON Web Token (JWT)
        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );

        // 5. Return the user object (without password) and the token
        const userToReturn = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };
        
        return NextResponse.json({ user: userToReturn, token: token }, { status: 200 });

    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json({ message: 'Server error during login.' }, { status: 500 });
    }
}

// app/api/users/profile/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function GET(request) {
    try {
        // --- THIS IS THE FIX ---
        // 1. Get the token directly from the incoming request's cookies.
        // This is a more direct method and avoids the dynamic import issue.
        const token = request.cookies.get('authToken')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized: No token provided.' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        await dbConnect();
        
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return NextResponse.json({ message: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json(user, { status: 200 });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return NextResponse.json({ message: 'Unauthorized: Invalid or expired token.' }, { status: 401 });
        }
        
        console.error("Error fetching user profile:", error);
        return NextResponse.json({ message: 'Server error fetching profile.' }, { status: 500 });
    }
}
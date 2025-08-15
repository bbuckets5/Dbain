import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import Submission from '@/models/submission';
import User from '@/models/User';

export async function GET(request) {
    try {
        // This is the only line that changed
        const cookieStore = await cookies();
        const token = cookieStore.get('authToken')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.DB_CONNECTION_STRING);
        }
        
        const user = await User.findById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
        }

        const submissions = await Submission.find({}).sort({ createdAt: -1 });

        return NextResponse.json(submissions, { status: 200 });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json({ message: 'Unauthorized: Invalid token.' }, { status: 401 });
        }
        
        console.error("Error fetching submissions:", error);
        return NextResponse.json({ message: 'Server error fetching submissions.' }, { status: 500 });
    }
}
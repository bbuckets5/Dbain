// In app/api/admin/events/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

export async function GET(request) {
    try {
        await dbConnect();

        // Authenticate the user and check if they are an admin
        const token = request.cookies.get('authToken')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
        }

        // Fetch all events, sorted by most recently submitted
        const events = await Event.find({}).sort({ submittedAt: -1 }).lean();

        return NextResponse.json(events, { status: 200 });

    } catch (error) {
        console.error("Error fetching admin events:", error);
        return NextResponse.json({ message: 'Server error fetching events.' }, { status: 500 });
    }
}
// In app/api/users/tickets/route.js

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
// We no longer need to import 'cookies' from next/headers
import User from '@/models/User';
import Ticket from '@/models/Ticket';
import Event from '@/models/Event';
import dbConnect from '@/lib/dbConnect';

export async function GET(request) {
    try {
        await dbConnect();

        // --- THIS IS THE FIX ---
        // Get the token directly from the incoming request's cookies.
        const token = request.cookies.get('authToken')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const tickets = await Ticket.find({ userId: decoded.userId })
            .populate({
                path: 'eventId',
                model: Event,
                select: 'eventName eventDate eventTime'
            })
            .sort({ purchaseDate: -1 })
            .lean();

        return NextResponse.json(tickets, { status: 200 });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return NextResponse.json({ message: 'Unauthorized: Invalid or expired token.' }, { status: 401 });
        }
        console.error("Error fetching user tickets:", error);
        return NextResponse.json({ message: 'Server error fetching tickets.' }, { status: 500 });
    }
}
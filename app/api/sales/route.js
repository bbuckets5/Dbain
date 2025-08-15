// In app/api/sales/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/ticket';
import { cookies } from 'next/headers'; // Use this for Next.js 13+
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import Event from '@/models/Event';

export async function GET(request) {
    await dbConnect();

    try {
        // --- Admin Authentication ---
        const cookieStore = await cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) throw new Error('Unauthorized');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).lean();
        if (!user || user.role !== 'admin') throw new Error('Forbidden: Admins only.');
        // --- End Authentication ---

        // Get the search term and eventId from the URL query parameters
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search');
        const eventId = searchParams.get('eventId');

        // If there's no search term and no event ID, return an empty array to prevent
        // loading all sales at once.
        if (!searchTerm && !eventId) {
            return NextResponse.json([], { status: 200 });
        }

        let query = {};

        // If an eventId is present, add it to the query.
        if (eventId) {
            query.eventId = eventId;
        }

        // If a search term is present, build the search query.
        if (searchTerm) {
            const searchRegex = new RegExp(searchTerm, 'i');
            const searchConditions = [
                { customerFirstName: searchRegex },
                { customerLastName: searchRegex },
                { customerEmail: searchRegex }
            ];

            // If the search term is a valid ObjectId, also search by _id
            if (mongoose.Types.ObjectId.isValid(searchTerm)) {
                searchConditions.push({ _id: searchTerm });
            }

            // Combine the search conditions with the existing query (if any)
            query = {
                ...query,
                $or: searchConditions
            };
        }

        // Find tickets matching the query, populate the event name and user details, and sort by newest first
        const sales = await Ticket.find(query)
            .populate({ path: 'eventId', model: Event, select: 'eventName' })
            .populate({ path: 'userId', model: User, select: 'firstName lastName email' })
            .sort({ purchaseDate: -1 })
            .lean();

        return NextResponse.json(sales, { status: 200 });

    } catch (error) {
        console.error("Error fetching sales data:", error);
        const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden: Admins only.' ? 403 : 500;
        return NextResponse.json({ message: error.message || "Failed to fetch sales data." }, { status });
    }
}
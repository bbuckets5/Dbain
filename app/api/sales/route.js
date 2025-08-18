import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import Event from '@/models/Event';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
    await dbConnect();

    try {
        // 1. Standard admin security check
        await requireAdmin();

        // 2. Get parameters from the URL for filtering, searching, and pagination
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search');
        const eventId = searchParams.get('eventId');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 25;
        const skip = (page - 1) * limit;

        // 3. Build the database query based on filters
        let query = {};
        if (eventId) {
            query.eventId = eventId;
        }
        if (searchTerm) {
            const searchRegex = new RegExp(searchTerm, 'i');
            const searchConditions = [
                { customerFirstName: searchRegex },
                { customerLastName: searchRegex },
                { customerEmail: searchRegex }
            ];
            if (mongoose.Types.ObjectId.isValid(searchTerm)) {
                searchConditions.push({ _id: searchTerm });
            }
            query.$or = searchConditions;
        }
        
        // 4. Get the total count for pagination
        const totalSales = await Ticket.countDocuments(query);
        const totalPages = Math.ceil(totalSales / limit);

        // 5. Find the sales for the current page
        const sales = await Ticket.find(query)
            .populate({ path: 'eventId', model: Event, select: 'eventName' })
            .populate({ path: 'userId', model: User, select: 'firstName lastName' })
            .sort({ purchaseDate: -1 }) // Show most recent sales first
            .skip(skip)
            .limit(limit)
            .lean();

        return NextResponse.json({ 
            sales,
            currentPage: page,
            totalPages,
            totalSales
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching sales data:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: "Server Error: Failed to fetch sales data." }, { status: 500 });
    }
}

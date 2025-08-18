import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
    await dbConnect();

    try {
        // 1. Standard admin security check
        await requireAdmin();

        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 25; // Default to 25 users per page
        const skip = (page - 1) * limit;

        // 2. Build the database query
        let query = {};
        if (searchTerm) {
            const searchRegex = new RegExp(searchTerm, 'i');
            query = {
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex }
                ]
            };
        }
        
        // 3. Get the total count of users matching the query for pagination
        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        // 4. Find the users for the current page
        const users = await User.find(query)
            .select('-password')
            .sort({ lastName: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 5. Return users and pagination info
        return NextResponse.json({ 
            users,
            currentPage: page,
            totalPages,
            totalUsers
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching users:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: "Server Error: Failed to fetch users." }, { status: 500 });
    }
}
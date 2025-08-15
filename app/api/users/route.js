import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET(request) {
    await dbConnect();

    try {
        // --- Admin Authentication ---
        const cookieStore = await cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) throw new Error('Unauthorized');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminUser = await User.findById(decoded.userId).lean();
        if (!adminUser || adminUser.role !== 'admin') throw new Error('Forbidden: Admins only.');
        // --- End Authentication ---

        // Get the search term from the URL query parameters
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search');

        // If there's no search term, return an empty array.
        // This is the key change to prevent loading all users.
        if (!searchTerm) {
            return NextResponse.json([], { status: 200 });
        }

        // Create a case-insensitive regular expression for searching
        const searchRegex = new RegExp(searchTerm, 'i');
        
        // Build the query to search across multiple fields
        const query = {
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ]
        };
        
        // Find users matching the query, remove the password field, and sort by last name
        const users = await User.find(query)
            .select('-password') // Exclude password from the result
            .sort({ lastName: 1 })
            .lean();

        return NextResponse.json(users, { status: 200 });

    } catch (error) {
        console.error("Error fetching users:", error);
        const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden: Admins only.' ? 403 : 500;
        return NextResponse.json({ message: error.message || "Failed to fetch users." }, { status });
    }
}
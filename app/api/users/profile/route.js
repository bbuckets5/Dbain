import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getAuthedUser } from '@/lib/auth';

export async function GET(request) {
    await dbConnect();
    try {
        const user = await getAuthedUser();
        
        // --- THIS IS THE FIX ---
        // We nest the user object inside a 'user' key for consistency.
        // This makes sure the UserContext always receives the data in the same format.
        return NextResponse.json({ user: user }, { status: 200 });

    } catch (error) {
        console.error("Profile fetch error:", error.message);
        if (error.message.includes('Authentication')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 401 });
        }
        return NextResponse.json({ message: 'Server error fetching profile.' }, { status: 500 });
    }
}
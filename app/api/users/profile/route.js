import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getAuthedUser } from '@/lib/auth';

export async function GET(request) {
    await dbConnect();

    try {
        // 1. Get the authenticated user using our new, one-step helper.
        // It handles token verification and database lookup automatically.
        const user = await getAuthedUser();

        // 2. Return the user object.
        return NextResponse.json(user, { status: 200 });

    } catch (error) {
        console.error("Profile fetch error:", error.message);
        // The helper throws specific errors, which we can catch and return.
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 401 });
        }
        
        return NextResponse.json({ message: 'Server error fetching profile.' }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(request, { params }) {
    await dbConnect();

    try {
        // 1. Use our standard helper to get the verified admin making the request.
        const adminUser = await requireAdmin();

        const { id: userIdToUpdate } = params; // The ID of the user whose role is being changed
        const { role: newRole } = await request.json();

        // 2. Add a critical safety check to prevent an admin from changing their own role.
        if (adminUser._id.toString() === userIdToUpdate) {
            return NextResponse.json({ message: "Forbidden: Admins cannot change their own role." }, { status: 403 });
        }

        // 3. Validate the new role to ensure it's either 'user' or 'admin'.
        if (!['user', 'admin'].includes(newRole)) {
            return NextResponse.json({ message: 'Invalid role provided.' }, { status: 400 });
        }

        // 4. Find and update the user in a single, efficient step.
        // The { new: true } option tells the database to return the updated user document.
        const updatedUser = await User.findByIdAndUpdate(
            userIdToUpdate, 
            { role: newRole }, 
            { new: true, runValidators: true }
        ).select('-password'); // Exclude the password from the returned object

        if (!updatedUser) {
            return NextResponse.json({ message: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json(updatedUser, { status: 200 });

    } catch (error) {
        console.error("Role update error:", error.message);
        if (error.message.includes('Authentication') || error.message.includes('Forbidden')) {
            return NextResponse.json({ message: `Unauthorized: ${error.message}` }, { status: 403 });
        }
        return NextResponse.json({ message: 'Server error during role update.' }, { status: 500 });
    }
}

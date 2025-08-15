// app/api/submissions/[id]/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import cloudinary from 'cloudinary';
import Submission from '@/models/Event';
import User from '@/models/User';

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Function to handle GET requests for a single submission ---
export async function GET(request, { params }) {
    try {
        const { id } = params;

        // 1. Authenticate and Authorize Admin
        const cookieStore = cookies();
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
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // 2. Find the submission by its ID
        const submission = await Submission.findById(id);
        if (!submission) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        return NextResponse.json(submission, { status: 200 });

    } catch (error) {
        console.error("Error fetching submission:", error);
        return NextResponse.json({ message: 'Server error fetching submission.' }, { status: 500 });
    }
}

// -------------------------------------------------------------
// --- NEW: Function to handle PUT requests to update a submission ---
// -------------------------------------------------------------
export async function PUT(request, { params }) {
    try {
        const { id } = params;

        // 1. Admin Auth Check
        const cookieStore = cookies();
        const token = cookieStore.get('authToken')?.value;
        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DB_CONNECTION_STRING);
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        
        // 2. Get the updated data from the request body
        const updateData = await request.json();

        // 3. Update the submission in the database
        const updatedEvent = await Submission.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedEvent) return NextResponse.json({ message: 'Event not found' }, { status: 404 });

        return NextResponse.json({ message: 'Event updated successfully.', event: updatedEvent }, { status: 200 });

    } catch (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
    }
}

// --- Existing DELETE handler ---
export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        // Admin Auth Check
        const cookieStore = cookies();
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

        // Find and delete the submission
        const submissionToDelete = await Submission.findByIdAndDelete(id);
        if (!submissionToDelete) {
            return NextResponse.json({ message: 'Submission not found.' }, { status: 404 });
        }

        // Delete the associated image from Cloudinary
        if (submissionToDelete.flyerImagePath) {
            const publicId = submissionToDelete.flyerImagePath.split('/').pop().split('.')[0];
            await cloudinary.v2.uploader.destroy(`event-flyers/${publicId}`);
        }
        
        return NextResponse.json({ message: 'Event deleted successfully.' }, { status: 200 });

    } catch (error) {
        console.error("Error deleting submission:", error);
        return NextResponse.json({ message: 'Server error deleting submission.' }, { status: 500 });
    }
}
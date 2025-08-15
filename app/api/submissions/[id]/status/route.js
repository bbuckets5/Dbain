// app/api/submissions/[id]/status/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event'; // Ensure correct casing matches filename
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import User from '@/models/User';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ message: 'Invalid token.' }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
    }

    // ✅ FIXED: Direct access to the params object from the function's second argument
    const eventId = params.id;

    const { status } = await request.json();
    if (!['approved', 'denied', 'finished'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status provided.' }, { status: 400 });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error('Error updating event status:', error);
    return NextResponse.json({ message: 'Server error during status update.' }, { status: 500 });
  }
}
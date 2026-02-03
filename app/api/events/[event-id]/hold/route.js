import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Event from '@/models/Event';

// This API handles the "Click" on a seat.
// It locks the seat for 10 minutes so no one else can grab it.

export async function POST(request, { params }) {
    await dbConnect();

    try {
        // 1. Unwrap params for Next.js 15
        const resolvedParams = await params;
        const eventId = resolvedParams['event-id'];

        // 2. Get data from the frontend
        const { seatId, action, holderId } = await request.json();

        if (!seatId || !holderId) {
            return NextResponse.json({ message: 'Missing seat or user ID.' }, { status: 400 });
        }

        // 3. Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
        }

        // 4. Find the specific seat in the huge array
        const seat = event.seats.id(seatId); 
        if (!seat) {
            return NextResponse.json({ message: 'Seat not found.' }, { status: 404 });
        }

        // --- ACTION: HOLD (Lock the seat) ---
        if (action === 'hold') {
            // Check if it's already taken
            if (seat.status === 'sold') {
                return NextResponse.json({ message: 'Seat is already sold.' }, { status: 409 });
            }
            if (seat.status === 'held' && seat.heldBy !== holderId) {
                // Check if the hold is expired
                if (seat.holdExpires && new Date() < new Date(seat.holdExpires)) {
                    return NextResponse.json({ message: 'Seat is currently held by someone else.' }, { status: 409 });
                }
                // If expired, we can steal it! (Code continues below)
            }

            // Lock it!
            seat.status = 'held';
            seat.heldBy = holderId;
            // Set expiration to 10 minutes from now
            seat.holdExpires = new Date(Date.now() + 10 * 60 * 1000); 

            await event.save();

            return NextResponse.json({ 
                message: 'Seat held successfully', 
                expiresAt: seat.holdExpires 
            }, { status: 200 });
        }

        // --- ACTION: RELEASE (Unlock the seat - e.g. user unclicks it) ---
        if (action === 'release') {
            // Only let the person who held it release it
            if (seat.heldBy === holderId) {
                seat.status = 'available';
                seat.heldBy = null;
                seat.holdExpires = null;
                await event.save();
                return NextResponse.json({ message: 'Seat released.' }, { status: 200 });
            } else {
                return NextResponse.json({ message: 'You cannot release a seat you do not hold.' }, { status: 403 });
            }
        }

        return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });

    } catch (error) {
        console.error("Error holding seat:", error);
        return NextResponse.json({ message: 'Server error processing hold.' }, { status: 500 });
    }
}

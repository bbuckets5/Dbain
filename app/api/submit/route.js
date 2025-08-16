import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event';

// Cloudinary is still configured here to generate thumbnails
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    await dbConnect();
    
    // The API now receives a clean JSON body from the front-end
    const body = await request.json();
    const {
        firstName, lastName, businessName, eventName, eventDate,
        eventLocation, eventTime, phone, ticketCount, eventDescription,
        ticketTypes, flyerPublicId, flyerSecureUrl
    } = body;
    
    // Basic validation for required fields
    if (!firstName || !lastName || !eventName || !eventDate || !ticketCount || !flyerPublicId) {
        return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // The file upload logic is no longer needed here.
    // We just create the new event with the data provided.

    const newEvent = new Event({
      firstName,
      lastName,
      businessName,
      eventName,
      eventDescription: eventDescription || 'No description provided.',
      eventDate,
      eventTime,
      eventLocation,
      phone,
      ticketCount,
      tickets: ticketTypes, // The front-end now sends this as a clean array
      flyerImagePath: flyerSecureUrl, // Use the URL from the front-end upload
      // Use the public_id from the front-end to generate supporting URLs
      flyerImageThumbnailPath: cloudinary.v2.url(flyerPublicId, {
        width: 800, crop: 'scale', format: 'webp', quality: 60,
      }),
      flyerImagePlaceholderPath: cloudinary.v2.url(flyerPublicId, {
        width: 20, crop: 'scale', format: 'webp', quality: 50, effect: 'blur:3000',
      }),
      status: 'pending',
    });

    await newEvent.save();
    return NextResponse.json({ message: 'Event submitted successfully!', id: newEvent._id }, { status: 201 });

  } catch (error) {
    console.error('Error processing submission:', error);
    return NextResponse.json({ message: 'Failed to process submission.', error: error.message }, { status: 500 });
  }
}

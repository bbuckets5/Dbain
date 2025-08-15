// app/api/submit/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import cloudinary from 'cloudinary';
import Event from '@/models/Event'; // models/event.js (lowercase)
import User from '@/models/User';   // models/user.js  (lowercase)

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { folder: 'event-flyers', format: 'webp', transformation: [{ quality: 'auto:good' }] },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    uploadStream.end(fileBuffer);
  });

export async function POST(request) {
  try {
    await dbConnect();

    // 1) Admin auth
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const adminUser = await User.findById(decoded.userId).lean();
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
    }

    // 2) Read form data
    const formData = await request.formData();

    // Auto-fill names from admin profile; provide safe fallbacks so schema passes
    const firstName = (adminUser.firstName || '').trim() || 'Admin';
    const lastName  = (adminUser.lastName  || '').trim() || 'User';

    const businessName = (formData.get('businessName') || '').trim();
    const eventName = (formData.get('eventName') || '').trim();
    const eventDescription = (formData.get('eventDescription') || '').trim();
    const eventDate = formData.get('eventDate'); // string, mongoose will cast
    const eventTime = (formData.get('eventTime') || '').trim();
    const eventLocation = (formData.get('eventLocation') || '').trim();
    const phone = (formData.get('phone') || '').trim();

    // ticketCount as number
    const ticketCountRaw = formData.get('ticketCount');
    const ticketCount = ticketCountRaw !== null ? Number(ticketCountRaw) : NaN;

    const flyerFile = formData.get('flyer');

    // 3) Validate required fields (names are auto-filled above)
    const missing = [];
    if (!eventName) missing.push('eventName');
    if (!eventDate) missing.push('eventDate');
    if (!eventTime) missing.push('eventTime');
    if (!eventLocation) missing.push('eventLocation');
    if (!Number.isFinite(ticketCount)) missing.push('ticketCount');
    if (!flyerFile) missing.push('flyer');
    if (missing.length) {
      return NextResponse.json({ message: 'Missing required fields', missing }, { status: 400 });
    }

    // 4) Upload flyer
    const fileBuffer = Buffer.from(await flyerFile.arrayBuffer());
    const uploadResult = await uploadToCloudinary(fileBuffer);

    // 5) Tickets (optional arrays)
    const ticket_types = formData.getAll('ticket_type[]');
    const ticket_prices = formData.getAll('ticket_price[]');
    const ticket_includes = formData.getAll('ticket_includes[]');
    const tickets = (ticket_types || []).map((type, i) => ({
      type: String(type || '').trim(),
      price: Number(ticket_prices?.[i] ?? 0) || 0,
      includes: String(ticket_includes?.[i] ?? ''),
    }));

    // 6) Create Event
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
      tickets,
      flyerImagePath: uploadResult.secure_url,
      flyerImageThumbnailPath: cloudinary.v2.url(uploadResult.public_id, {
        width: 800, crop: 'scale', format: 'webp', quality: 60,
      }),
      flyerImagePlaceholderPath: cloudinary.v2.url(uploadResult.public_id, {
        width: 20, crop: 'scale', format: 'webp', quality: 50, effect: 'blur:3000',
      }),
      status: 'pending',
    });

    await newEvent.save();
    return NextResponse.json({ message: 'Event created', id: newEvent._id }, { status: 200 });
  } catch (error) {
    console.error('Error processing submission:', error);
    return NextResponse.json({ message: 'Failed to process submission.', error: error.message }, { status: 500 });
  }
}

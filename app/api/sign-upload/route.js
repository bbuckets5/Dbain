import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

// Configure Cloudinary with your credentials from .env.local
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request) {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Create the secure signature
    const signature = cloudinary.v2.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: 'event-flyers', // Optional: The folder to upload into
      },
      process.env.CLOUDINARY_API_SECRET
    );

    // Return the signature and other necessary info to the front-end
    return NextResponse.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
    });

  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    return NextResponse.json(
      { message: "Failed to generate upload signature." },
      { status: 500 }
    );
  }
}
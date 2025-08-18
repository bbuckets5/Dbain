import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';

// Configure Cloudinary with your credentials from .env.local
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { paramsToSign } = body;

        // Create the secure signature using the parameters from the frontend
        const signature = cloudinary.v2.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        // Return the signature to the front-end
        return NextResponse.json({ signature });

    } catch (error) {
        console.error("Error generating Cloudinary signature:", error);
        return NextResponse.json(
            { message: "Failed to generate upload signature." },
            { status: 500 }
        );
    }
}

// app/api/users/logout/route.js

import { NextResponse } from 'next/server';
import * as cookie from 'cookie';

export async function POST(request) {
    // To log out, we create a serialized cookie that is expired.
    const serializedCookie = cookie.serialize('authToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: -1, // Set maxAge to a past date to expire the cookie
        path: '/',
    });

    return NextResponse.json(
        { message: 'Logged out successfully.' },
        {
            status: 200,
            headers: { 'Set-Cookie': serializedCookie },
        }
    );
}
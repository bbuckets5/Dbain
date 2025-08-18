import { NextResponse } from 'next/server';

export async function POST(request) {
    // In our token-based system, the client handles logout by deleting the token.
    // This server route simply confirms the action was received.
    return NextResponse.json({ message: 'Logged out successfully.' }, { status: 200 });
}
// app/api/users/login/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';

export async function POST(request) {
  try {
    await dbConnect();

    const { email, password } = await request.json();
    const emailNorm = (email || '').trim().toLowerCase();

    // Find user by normalized email
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // Create JWT
    if (!process.env.JWT_SECRET) {
      console.error('Missing JWT_SECRET in environment');
      return NextResponse.json({ message: 'Server config error.' }, { status: 500 });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ✅ Next.js 15: await cookies()
    const cookieStore = await cookies();
    cookieStore.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    // Return user (without password)
    const userToReturn = await User.findById(user._id).select('-password').lean();
    return NextResponse.json(userToReturn, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Server error during login.' }, { status: 500 });
  }
}

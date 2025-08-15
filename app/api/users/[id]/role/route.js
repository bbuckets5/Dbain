// app/api/users/[id]/role/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function PATCH(request, context) {
  try {
    await dbConnect();

    // Auth: only admins can change roles
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admins only.' }, { status: 403 });
    }

    // ✅ Next 15: await the params object, then read id
    const { id: userId } = await context.params;

    const { role } = await request.json();
    const allowed = ['user', 'admin'];
    if (!allowed.includes(role)) {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, { role }, { runValidators: true });

    // Return a safe, plain object
    const safeUser = await User.findById(userId).select('-password').lean();
    if (!safeUser) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

    return NextResponse.json(safeUser, { status: 200 });
  } catch (err) {
    console.error('Role update error:', err);
    return NextResponse.json({ message: 'Server error during role update.' }, { status: 500 });
  }
}

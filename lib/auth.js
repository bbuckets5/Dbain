import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { headers } from 'next/headers';

/**
 * Verifies the JWT from the request's Authorization header.
 * @returns {object} The decoded token payload (e.g., { userId, role }).
 * @throws {Error} If the token is missing, malformed, or invalid.
 */
export const verifyAuth = () => {
    const authHeader = headers().get('authorization');
    if (!authHeader) throw new Error('Authentication: Login required.');
    
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('Authentication: Malformed token.');

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Authentication: Invalid or expired token.');
    }
};

/**
 * Gets the full user object for an authenticated user.
 * @returns {object} The full user object from the database, without the password.
 * @throws {Error} If authentication fails or the user is not found.
 */
export const getAuthedUser = async () => {
    const decodedToken = verifyAuth();
    if (!decodedToken?.userId) throw new Error("Authentication: User ID not found in token.");
    
    const user = await User.findById(decodedToken.userId).select('-password');
    if (!user) throw new Error("Authentication: User not found.");

    return user;
};

/**
 * Gets the decoded token payload if the user is logged in, but returns null if not.
 * This is for routes where login is OPTIONAL (like purchasing a ticket).
 * @returns {object|null} The decoded token payload or null.
 */
export const getOptionalAuth = () => {
    const authHeader = headers().get('authorization');
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    try {
        // If token is valid, return the decoded data
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        // If token is invalid (e.g., expired), treat them as a guest
        console.warn('Optional auth: Invalid token found.');
        return null;
    }
};

/**
 * A helper for API routes that require an authenticated ADMIN user.
 * @returns {object} The full admin user object from the database.
 * @throws {Error} If authentication or authorization fails.
 */
export const requireAdmin = async () => {
    const user = await getAuthedUser();
    if (user.role !== 'admin') throw new Error('Forbidden: Admin access required.');
    
    return user;
};
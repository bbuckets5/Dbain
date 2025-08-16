// app/purchase-confirmation/page.js
"use client"; // 1. Convert to a Client Component

import Link from 'next/link';
import { useUser } from '@/components/UserContext'; // 2. Import the useUser hook

export default function PurchaseConfirmationPage() {
    const { user } = useUser(); // 3. Get the current user from the context

    return (
        <div className="glass" style={{ padding: '50px', textAlign: 'center', maxWidth: '600px', margin: '50px auto' }}>
            <h1><i className="fas fa-check-circle" style={{ color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '20px' }}></i> Purchase Confirmed!</h1>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px' }}>Your tickets have been successfully purchased.</p>
            <p style={{ fontSize: '1rem', marginBottom: '30px', color: 'rgba(255, 255, 255, 0.8)' }}>A confirmation email with your tickets has been sent to your email address.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <Link href="/" className="cta-button" style={{ fontSize: '1rem', padding: '10px 20px' }}>Continue Shopping</Link>
                
                {/* 4. Only show this button if a user is logged in */}
                {user && (
                    <Link href="/mytickets" id="view-my-tickets-btn" className="cta-button" style={{ fontSize: '1rem', padding: '10px 20px' }}>View My Tickets</Link>
                )}
            </div>
        </div>
    );
}
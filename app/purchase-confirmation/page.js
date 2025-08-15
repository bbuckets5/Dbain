import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function PurchaseConfirmationPage() {
    return (
        <div className="container">
            <Header />

            <main className="main-content">
                <div className="glass" style={{ padding: '50px', textAlign: 'center', maxWidth: '600px', margin: '50px auto' }}>
                    <h1><i className="fas fa-check-circle" style={{ color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '20px' }}></i> Purchase Confirmed!</h1>
                    <p style={{ fontSize: '1.1rem', marginBottom: '25px' }}>Your tickets have been successfully purchased.</p>
                    <p style={{ fontSize: '1rem', marginBottom: '30px', color: 'rgba(255, 255, 255, 0.8)' }}>A confirmation email with your tickets has been sent to your email address.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        <Link href="/" className="cta-button" style={{ fontSize: '1rem', padding: '10px 20px' }}>Continue Shopping</Link>
                        <Link href="/mytickets" id="view-my-tickets-btn" className="cta-button" style={{ fontSize: '1rem', padding: '10px 20px' }}>View My Tickets</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
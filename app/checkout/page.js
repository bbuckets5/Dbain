'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import Link from 'next/link';
import Cleave from 'cleave.js/react';
import 'cleave.js/dist/addons/cleave-phone.us';

export default function CheckoutPage() {
    // --- FIX: Destructure removeFromCart ---
    const { user, cart, cartCount, clearCart, removeFromCart } = useUser();
    const router = useRouter();

    const [formState, setFormState] = useState({
        firstName: '',
        lastName: '',
        email: '',
        confirmEmail: '',
        phone: ''
    });
    
    const [paymentDetails, setPaymentDetails] = useState({
        cardNumber: '',
        expiryDate: '',
        cvc: ''
    });

    const [view, setView] = useState('prompt');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            setFormState(prev => ({
                ...prev,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                confirmEmail: user.email || '',
                phone: user.phone || ''
            }));
            setView('payment');
        } else {
            setView('prompt');
        }
    }, [user]);

    const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const serviceFee = subtotal * 0.05;
    const total = subtotal + serviceFee;
    
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handlePaymentChange = (e) => {
        setPaymentDetails(prev => ({ ...prev, [e.target.id]: e.target.rawValue }));
    };

    const handleGuestEmailSubmit = (e) => {
        e.preventDefault();
        if (formState.email !== formState.confirmEmail) {
            setError("Emails do not match.");
            return;
        }
        setError(null);
        setView('payment');
    };
    
    const handleSubmitPurchase = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (formState.email !== formState.confirmEmail) {
            setError("Billing emails do not match.");
            setIsLoading(false);
            return;
        }
        if (cartCount === 0) {
            setError("Your cart is empty.");
            setIsLoading(false);
            return;
        }

        // Group items by event for the backend
        const purchasesByEvent = cart.reduce((acc, item) => {
            // Reserved seats have IDs like 'seat_123', Standard have 'eventId_Type'
            // We use item.eventId which we explicitly added to the cart object
            const eventId = item.eventId || item.id.split('_')[0]; 
            
            const event = acc[eventId] || { eventId, tickets: [] };
            
            // For reserved seating, we might want to pass specific seat IDs if the backend requires it
            // But for now, name + quantity is standard
            event.tickets.push({ 
                name: item.name, 
                quantity: item.quantity,
                // Pass seatId if it's a reserved seat so backend can mark it SOLD
                seatId: item.isReserved ? item.id : undefined 
            });
            
            acc[eventId] = event;
            return acc;
        }, {});

        const payload = {
            purchases: Object.values(purchasesByEvent),
            customerInfo: { ...formState },
            paymentDetails: { ...paymentDetails }
        };

        try {
            const token = localStorage.getItem('authToken');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/purchase-tickets', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to complete purchase.');
            }

            alert('Purchase Successful! Check your email for your tickets.');
            clearCart();
            const redirectUrl = user ? '/purchase-confirmation' : '/purchase-confirmation?guest=true';
            router.push(redirectUrl);

        } catch (err) {
            alert(`Purchase Failed: ${err.message}`);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <main className="main-content">
            <h1 className="page-title">Checkout</h1>
            <div className="checkout-layout">
                
                <div className="checkout-form-container glass">
                    {view === 'prompt' && (
                        <div>
                            <h3 style={{textAlign: 'center'}}>How would you like to proceed?</h3>
                            <p style={{textAlign: 'center'}}>To purchase tickets, please choose an option below:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '25px auto' }}>
                                <button type="button" onClick={() => setView('guestEmail')} className="cta-button form-submit-btn">Continue as Guest</button>
                                <Link href="/login?redirect=/checkout" className="cta-button form-submit-btn" style={{ textAlign: 'center' }}>Log In / Create Profile</Link>
                            </div>
                        </div>
                    )}

                    {view === 'guestEmail' && (
                        <form onSubmit={handleGuestEmailSubmit}>
                            <h3>Your Email for Tickets</h3>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input type="email" id="email" value={formState.email} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmEmail">Confirm Email Address</label>
                                <input type="email" id="confirmEmail" value={formState.confirmEmail} onChange={handleInputChange} required />
                            </div>
                            {error && <p className="error-msg">{error}</p>}
                            <button type="submit" className="cta-button form-submit-btn">Proceed to Payment</button>
                            <p className="login-prompt">
                                Already have an account? <Link href="/login?redirect=/checkout">Log In here.</Link>
                            </p>
                        </form>
                    )}

                    {view === 'payment' && (
                        <form onSubmit={handleSubmitPurchase}>
                            <h3>Billing Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">First Name</label>
                                    <input type="text" id="firstName" name="firstName" value={formState.firstName} onChange={handleInputChange} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="lastName">Last Name</label>
                                    <input type="text" id="lastName" name="lastName" value={formState.lastName} onChange={handleInputChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input type="email" id="email" name="email" value={formState.email} onChange={handleInputChange} required readOnly={!!user} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirmEmail">Confirm Email Address</label>
                                <input type="email" id="confirmEmail" name="confirmEmail" value={formState.confirmEmail} onChange={handleInputChange} required readOnly={!!user} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Telephone Number</label>
                                <Cleave id="phone" name="phone" value={formState.phone} onChange={handleInputChange} options={{ phone: true, phoneRegionCode: 'US' }} placeholder="(123) 456-7890" required />
                            </div>

                            <h3 className="payment-header">Payment Details</h3>
                            <p><em>(This is a demo. No real card is needed or charged.)</em></p>
                            <div className="form-group">
                                <label htmlFor="cardNumber">Card Number</label>
                                <Cleave id="cardNumber" onChange={handlePaymentChange} options={{ creditCard: true }} placeholder="0000 0000 0000 0000" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="expiryDate">Expiry Date</label>
                                    <Cleave id="expiryDate" onChange={handlePaymentChange} options={{ date: true, datePattern: ['m', 'y'] }} placeholder="MM / YY" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cvc">CVC</label>
                                    <Cleave id="cvc" onChange={handlePaymentChange} options={{ blocks: [4], numericOnly: true }} placeholder="123" required />
                                </div>
                            </div>
                            {error && <p className="error-msg">{error}</p>}
                            <button type="submit" className="cta-button form-submit-btn" disabled={isLoading}>
                                {isLoading ? 'Processing...' : `Complete Purchase - $${total.toFixed(2)}`}
                            </button>
                            {!user && (
                                <p className="login-prompt">
                                    Already have an account? <Link href="/login?redirect=/checkout">Log In here.</Link>
                                </p>
                            )}
                        </form>
                    )}
                </div>

                <div className="order-summary-container glass">
                    <h3>Order Summary</h3>
                    <div className="summary-items">
                        {cart.length > 0 ? cart.map(item => (
                            <div className="summary-item" key={item.id}>
                                <div className="item-details">
                                    <span className="event-name">{item.eventName || 'Event'}</span>
                                    <span className="ticket-type">{item.name} x{item.quantity}</span>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span>${(Number(item.price) * item.quantity).toFixed(2)}</span>
                                    {/* --- FIX: Added Remove Button --- */}
                                    <button 
                                        type="button" 
                                        onClick={() => removeFromCart(item.id)}
                                        style={{
                                            background: 'none', 
                                            border: 'none', 
                                            color: '#ff4444', 
                                            cursor: 'pointer',
                                            fontSize: '1.1rem',
                                            padding: '0 5px'
                                        }}
                                        title="Remove Item"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        )) : <p>Your cart is empty.</p>}
                    </div>
                    {cart.length > 0 && (
                        <>
                            <div className="summary-calculations">
                                <div className="summary-line">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="summary-line">
                                    <span>Service Fee (5%)</span>
                                    <span>${serviceFee.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="summary-total">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { useUser } from '@/components/UserContext'; 
import TicketManager from '@/components/TicketManager';
import SeatingChart from '@/components/SeatingChart'; 
import { getLocalEventDate } from '@/lib/dateUtils';

export default function EventDetailsPage({ params }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams['event-id'] || resolvedParams['id'] || resolvedParams['eventId'];
    
    const router = useRouter();
    const { cart, addToCart, removeFromCart, loading: userLoading } = useUser();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- Reserved Seating State ---
    const [selectedSeats, setSelectedSeats] = useState([]);
    
    // Track initial load
    const isInitialLoad = useRef(true);

    // 1. Load Guest ID (Kept for backend hold logic)
    const [guestId] = useState(() => {
        if (typeof window === 'undefined') return null;
        let stored = localStorage.getItem('guest_hold_id');
        if (!stored) {
            stored = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('guest_hold_id', stored);
        }
        return stored;
    });

    // 2. Fetch Event Data & Sync
    const fetchEvent = async () => {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Event not found.');
            }
            const eventData = await response.json();
            setEvent(eventData);

            // --- RESTORE HOLDS ON REFRESH ---
            if (isInitialLoad.current && eventData.isReservedSeating && guestId) {
                const now = new Date();
                
                // Find valid holds for this user
                const myHolds = eventData.seats.filter(s => 
                    s.status === 'held' && s.heldBy === guestId
                );

                if (myHolds.length > 0) {
                    setSelectedSeats(myHolds);
                    
                    // Sync to global cart if missing
                    myHolds.forEach(seat => {
                        const isInCart = cart.some(item => item.id === seat._id);
                        if (!isInCart) {
                            pushToGlobalCart(seat, eventData);
                        }
                    });
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            // Safety buffer
            setTimeout(() => { isInitialLoad.current = false; }, 1000);
        }
    };

    useEffect(() => {
        if (!eventId) return;
        fetchEvent();
        const interval = setInterval(fetchEvent, 5000); 
        return () => clearInterval(interval);
    }, [eventId, guestId]); 


    // --- 3. GLOBAL CART SYNC LISTENER ---
    useEffect(() => {
        if (loading || userLoading || isInitialLoad.current || selectedSeats.length === 0) return;

        // If user removed item from cart (navbar), remove it from selection here
        const seatsRemovedFromCart = selectedSeats.filter(seat => 
            !cart.some(cartItem => cartItem.id === seat._id)
        );

        if (seatsRemovedFromCart.length > 0) {
            console.log("Releasing seats removed from cart:", seatsRemovedFromCart);
            seatsRemovedFromCart.forEach(seat => {
                releaseSeat(seat._id);
            });
        }
    }, [cart, selectedSeats, loading, userLoading]);


    const pushToGlobalCart = (seat, eventObj = event) => {
        if (!eventObj) return;
        const cartItem = {
            id: seat._id, 
            name: `${seat.section} - Row ${seat.row} - Seat ${seat.number}`, 
            quantity: 1,
            price: seat.price,
            eventName: eventObj.eventName,
            eventId: eventObj._id,
            isReserved: true,
        };
        addToCart(cartItem);
    };

    // 4. Handle Seat Click
    const handleSeatSelect = async (seat) => {
        if (!guestId) return;

        const isSelected = selectedSeats.some(s => s._id === seat._id);
        
        if (isSelected) {
            await releaseSeat(seat._id);
        } else {
            await holdSeat(seat);
        }
    };

    // --- HOLD SEAT ---
    const holdSeat = async (seat) => {
        if (selectedSeats.length >= 10) {
            alert("You can only select up to 10 seats.");
            return;
        }

        // Optimistic Update
        const optimisticSeat = { ...seat, status: 'held', heldBy: guestId };
        setSelectedSeats(prev => [...prev, optimisticSeat]);
        pushToGlobalCart(optimisticSeat); // Add to cart immediately

        try {
            // Tell server to hold it (Background logic)
            await fetch(`/api/events/${eventId}/hold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatId: seat._id, action: 'hold', holderId: guestId })
            });
            // We don't wait for response to update UI anymore. Fast & Simple.
        } catch (err) {
            console.error(err);
            // Revert if network fails
            setSelectedSeats(prev => prev.filter(s => s._id !== seat._id));
            if(removeFromCart) removeFromCart(seat._id);
        }
    };

    // --- RELEASE SEAT ---
    const releaseSeat = async (seatId) => {
        setSelectedSeats(prev => prev.filter(s => s._id !== seatId));
        if (removeFromCart) removeFromCart(seatId);

        try {
            await fetch(`/api/events/${eventId}/hold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatId: seatId, action: 'release', holderId: guestId })
            });
            fetchEvent(); 
        } catch (err) {
            console.error("Error releasing seat:", err);
        }
    };

    const handleProceedToCheckout = () => {
        router.push('/checkout');
    };

    if (loading && isInitialLoad.current) return <main className="main-content"><p>Loading event...</p></main>;

    if (error || !event) {
        return (
            <main className="main-content">
                <h1>Event Not Found</h1>
                <Link href="/" className="cta-button">Back to Events</Link>
            </main>
        );
    }
    
    const { fullDate: formattedDate, time: formattedTime } = getLocalEventDate(event);

    return (
        <main className="main-content" style={{ paddingBottom: '100px' }}> 
            
            <div className="event-details-container glass">
                <div className="event-image-box">
                    <Image 
                        src={event.flyerImagePath || '/placeholder.png'} 
                        alt={event.eventName}
                        width={500}
                        height={300}
                    />
                </div>
                <div className="event-info-box">
                    <h1>{event.eventName}</h1>
                    <div className="event-meta">
                        <p><i className="fas fa-calendar-alt"></i> {formattedDate}</p>
                        <p><i className="fas fa-clock"></i> {formattedTime}</p>
                        <p><i className="fas fa-map-marker-alt"></i> {event.eventLocation}</p>
                    </div>
                    <div className="event-description">
                        {event.eventDescription.split('\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>

                    {event.isReservedSeating ? (
                        <div className="reserved-seating-section">
                            <h3>Select Your Seats</h3>
                            
                            {/* Seating Chart (Mobile Scroll handled inside component) */}
                            <SeatingChart 
                                seats={event.seats} 
                                onSeatSelect={handleSeatSelect} 
                                selectedSeats={selectedSeats} 
                                guestId={guestId}
                            />
                            
                            {selectedSeats.length > 0 && (
                                <div style={{marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px'}}>
                                    <h4>Selected Tickets:</h4>
                                    <ul style={{listStyle: 'none', padding: 0, margin: '10px 0'}}>
                                        {selectedSeats.map(s => (
                                            <li key={s._id} style={{display:'flex', justifyContent:'space-between', alignItems: 'center', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'8px 0'}}>
                                                <span>{s.section} - Row {s.row} - Seat {s.number}</span>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                                    <span>${s.price.toFixed(2)}</span>
                                                    <button 
                                                        onClick={() => releaseSeat(s._id)}
                                                        style={{background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2rem'}}
                                                        title="Remove from cart"
                                                    >
                                                        <i className="fas fa-times-circle"></i>
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <TicketManager 
                            tickets={event.tickets} 
                            eventName={event.eventName}
                            eventId={event._id}
                        />
                    )}
                </div>
            </div>

            {selectedSeats.length > 0 && (
                <div className="sticky-checkout-bar">
                    <style jsx>{`
                        .sticky-checkout-bar {
                            position: fixed; bottom: 0; left: 0; width: 100%;
                            background: #1a1a1a; border-top: 1px solid #00d4ff;
                            padding: 15px 20px; display: flex; justify-content: space-between;
                            align-items: center; z-index: 1000;
                            box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
                            animation: slideUp 0.3s ease-out;
                        }
                        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                        .bar-info { display: flex; gap: 20px; align-items: center; }
                        .total-price { font-size: 1.2rem; font-weight: bold; color: white; }
                        .checkout-btn {
                            background: #00d4ff; color: black; border: none; padding: 10px 25px;
                            border-radius: 25px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: transform 0.2s;
                        }
                        .checkout-btn:hover { transform: scale(1.05); background: #66e0ff; }
                        @media (max-width: 600px) {
                            .sticky-checkout-bar { flex-direction: column; gap: 10px; text-align: center; }
                        }
                    `}</style>

                    <div className="bar-info">
                        <div className="total-price">
                            Total: ${selectedSeats.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                        </div>
                    </div>

                    <button onClick={handleProceedToCheckout} className="checkout-btn">
                        Go to Checkout <i className="fas fa-arrow-right"></i>
                    </button>
                </div>
            )}
        </main>
    );
}

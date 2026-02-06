'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { useUser } from '@/components/UserContext'; 
import TicketManager from '@/components/TicketManager';
import SeatingChart from '@/components/SeatingChart'; 
import CountdownTimer from '@/components/CountdownTimer';
import { getLocalEventDate } from '@/lib/dateUtils';
import { toDate } from 'date-fns-tz';

export default function EventDetailsPage({ params }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams['event-id'] || resolvedParams['id'] || resolvedParams['eventId'];
    
    const router = useRouter();
    const { addToCart } = useUser();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- Reserved Seating State ---
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [earliestExpiration, setEarliestExpiration] = useState(null);
    
    // --- FIX 1: Load Guest ID Immediately (Synchronously) ---
    const [guestId] = useState(() => {
        if (typeof window === 'undefined') return null;
        let stored = localStorage.getItem('guest_hold_id');
        if (!stored) {
            stored = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('guest_hold_id', stored);
        }
        return stored;
    });

    // 2. Fetch Event Data & RESTORE HOLDS
    const fetchEvent = async () => {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Event not found.');
            }
            const eventData = await response.json();
            setEvent(eventData);

            // --- FIX 2: Check for "My Holds" on Refresh ---
            if (eventData.isReservedSeating && guestId) {
                const now = new Date();

                // --- CRITICAL FIX: Only restore holds that represent FUTURE time ---
                // If a hold is expired, ignore it. This stops the infinite alert loop.
                const myHolds = eventData.seats.filter(s => 
                    s.status === 'held' && 
                    s.heldBy === guestId &&
                    new Date(s.holdExpires) > now // MUST be in the future
                );

                // Re-format them to match our selectedSeats structure
                const restoredSelection = myHolds.map(s => ({
                    ...s,
                    expiresAt: s.holdExpires 
                }));

                // Only update if the length is different to prevent jitter
                setSelectedSeats(prev => {
                    if (prev.length === restoredSelection.length && 
                        restoredSelection.every(r => prev.find(p => p._id === r._id))) {
                        return prev;
                    }
                    return restoredSelection;
                });
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!eventId) return;
        fetchEvent();
        // Poll frequently to keep map updated
        const interval = setInterval(fetchEvent, 10000); 
        return () => clearInterval(interval);
    }, [eventId, guestId]); 

    // --- Helper: Find the seat expiring soonest ---
    useEffect(() => {
        if (selectedSeats.length === 0) {
            setEarliestExpiration(null);
            return;
        }
        // Filter out any NaN dates or past dates just to be safe
        const times = selectedSeats.map(s => new Date(s.expiresAt).getTime()).filter(t => !isNaN(t) && t > Date.now());
        
        if (times.length > 0) {
            setEarliestExpiration(new Date(Math.min(...times)));
        } else {
            setEarliestExpiration(null);
        }
    }, [selectedSeats]);


    // 3. Handle Seat Click (Toggle)
    const handleSeatSelect = async (seat) => {
        if (!guestId) return;

        const isSelected = selectedSeats.some(s => s._id === seat._id);
        
        if (isSelected) {
            await releaseSeat(seat._id);
        } else {
            await holdSeat(seat);
        }
    };

    // --- FIX 3: Separate Hold Logic ---
    const holdSeat = async (seat) => {
        if (selectedSeats.length >= 10) {
            alert("You can only select up to 10 seats.");
            return;
        }

        // Optimistic UI update
        const optimisticSeat = { ...seat, status: 'held', heldBy: guestId };
        setSelectedSeats(prev => [...prev, optimisticSeat]);

        try {
            const response = await fetch(`/api/events/${eventId}/hold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seatId: seat._id, action: 'hold', holderId: guestId })
            });
            const result = await response.json();

            if (!response.ok) {
                alert(result.message);
                setSelectedSeats(prev => prev.filter(s => s._id !== seat._id));
                fetchEvent();
                return;
            }

            // Update with actual server expiration time
            setSelectedSeats(prev => prev.map(s => 
                s._id === seat._id ? { ...s, expiresAt: result.expiresAt } : s
            ));

        } catch (err) {
            console.error(err);
            setSelectedSeats(prev => prev.filter(s => s._id !== seat._id));
        }
    };

    // --- FIX 4: Separate Release Logic ---
    const releaseSeat = async (seatId) => {
        setSelectedSeats(prev => prev.filter(s => s._id !== seatId));

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

    // --- FIX 5: Silent Expiration ---
    const handleExpired = () => {
        if (selectedSeats.length > 0) {
            console.log("Timer expired. Clearing seats.");
            setSelectedSeats([]); 
            fetchEvent(); 
            // We removed the alert() here to stop the popup loop
        }
    };

    const handleReservedAddToCart = () => {
        if (selectedSeats.length === 0) return;
        selectedSeats.forEach(seat => {
            const cartItem = {
                id: seat._id, 
                name: `${seat.section} - Row ${seat.row} - Seat ${seat.number}`, 
                quantity: 1,
                price: seat.price,
                eventName: event.eventName,
                eventId: event._id,
                isReserved: true,
                expiresAt: seat.expiresAt 
            };
            addToCart(cartItem);
        });
        router.push('/checkout');
    };

    if (loading) return <main className="main-content"><p>Loading event...</p></main>;

    if (error || !event) {
        return (
            <main className="main-content">
                <h1>Event Not Found</h1>
                <Link href="/" className="cta-button">Back to Events</Link>
            </main>
        );
    }
    
    const { fullDate: formattedDate, time: formattedTime } = getLocalEventDate(event);
    
    const isSoldOut = event.isReservedSeating 
        ? event.seats.every(s => s.status === 'sold') 
        : event.ticketsSold >= event.ticketCount;

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
                            <SeatingChart 
                                seats={event.seats} 
                                onSeatSelect={handleSeatSelect} 
                                selectedSeats={selectedSeats} 
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
                            isSoldOut={isSoldOut}
                            eventHasStarted={new Date() > new Date(event.eventDate)}
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
                        .timer-box {
                            background: rgba(255, 68, 68, 0.2); border: 1px solid #ff4444; color: #ff4444;
                            padding: 5px 10px; border-radius: 4px; font-weight: bold;
                            display: flex; align-items: center; gap: 8px;
                        }
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
                        {earliestExpiration && (
                            <div className="timer-box">
                                <i className="fas fa-stopwatch"></i>
                                <span>Time Left: </span>
                                <CountdownTimer targetDate={earliestExpiration} onExpire={handleExpired} />
                            </div>
                        )}
                        <div className="total-price">
                            Total: ${selectedSeats.reduce((sum, s) => sum + s.price, 0).toFixed(2)}
                        </div>
                    </div>

                    <button onClick={handleReservedAddToCart} className="checkout-btn">
                        Checkout ({selectedSeats.length}) <i className="fas fa-arrow-right"></i>
                    </button>
                </div>
            )}
        </main>
    );
}

'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TicketManager from '@/components/TicketManager';
import SeatingChart from '@/components/SeatingChart'; 
import CountdownTimer from '@/components/CountdownTimer';
import { getLocalEventDate } from '@/lib/dateUtils';
import { toDate } from 'date-fns-tz';

export default function EventDetailsPage({ params }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams['event-id'] || resolvedParams['id'] || resolvedParams['eventId'];

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- Reserved Seating State ---
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [guestId, setGuestId] = useState(null); 
    const [earliestExpiration, setEarliestExpiration] = useState(null);

    // 1. Initialize Guest ID
    useEffect(() => {
        let storedId = localStorage.getItem('guest_hold_id');
        if (!storedId) {
            storedId = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('guest_hold_id', storedId);
        }
        setGuestId(storedId);
    }, []);

    // 2. Fetch Event Data
    const fetchEvent = async () => {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Event not found.');
            }
            const eventData = await response.json();
            setEvent(eventData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!eventId) return;
        fetchEvent();
        const interval = setInterval(fetchEvent, 30000);
        return () => clearInterval(interval);
    }, [eventId]);

    // --- Helper: Find the seat expiring soonest ---
    useEffect(() => {
        if (selectedSeats.length === 0) {
            setEarliestExpiration(null);
            return;
        }
        // Find the earliest date object among all selected seats
        const times = selectedSeats.map(s => new Date(s.expiresAt).getTime()).filter(t => !isNaN(t));
        if (times.length > 0) {
            setEarliestExpiration(new Date(Math.min(...times)));
        }
    }, [selectedSeats]);


    // 3. Handle Seat Click & Capture Expiration
    const handleSeatSelect = async (seat) => {
        if (!guestId) return;

        const isSelected = selectedSeats.some(s => s._id === seat._id);
        const action = isSelected ? 'release' : 'hold';

        if (action === 'hold' && selectedSeats.length >= 10) {
            alert("You can only select up to 10 seats.");
            return;
        }

        try {
            const response = await fetch(`/api/events/${eventId}/hold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seatId: seat._id,
                    action: action,
                    holderId: guestId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message); 
                fetchEvent(); 
                return;
            }

            if (action === 'hold') {
                const seatWithTimer = { ...seat, expiresAt: result.expiresAt };
                setSelectedSeats(prev => [...prev, seatWithTimer]);
            } else {
                setSelectedSeats(prev => prev.filter(s => s._id !== seat._id));
            }

        } catch (err) {
            console.error("Error holding seat:", err);
            alert("Could not connect to server.");
        }
    };

    const handleExpired = () => {
        alert("Time expired! Your held seats have been released.");
        setSelectedSeats([]); // Clear local selection
        fetchEvent(); // Refresh map to show them as available again (or taken by someone else)
    };

    const handleReservedAddToCart = () => {
        alert("Seats successfully held! Proceeding to checkout...");
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
            {/* Added paddingBottom so the sticky footer doesn't cover content */}
            
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
                            
                            {/* Standard List (Timer Removed from here) */}
                            {selectedSeats.length > 0 && (
                                <div style={{marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px'}}>
                                    <h4>Selected Tickets:</h4>
                                    <ul style={{listStyle: 'none', padding: 0, margin: '10px 0'}}>
                                        {selectedSeats.map(s => (
                                            <li key={s._id} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'5px 0'}}>
                                                <span>{s.section} - Row {s.row} - Seat {s.number}</span>
                                                <span>${s.price.toFixed(2)}</span>
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

            {/* --- NEW: STICKY CHECKOUT BAR --- */}
            {selectedSeats.length > 0 && (
                <div className="sticky-checkout-bar">
                    <style jsx>{`
                        .sticky-checkout-bar {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            width: 100%;
                            background: #1a1a1a;
                            border-top: 1px solid #00d4ff;
                            padding: 15px 20px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            z-index: 1000;
                            box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
                            animation: slideUp 0.3s ease-out;
                        }
                        @keyframes slideUp {
                            from { transform: translateY(100%); }
                            to { transform: translateY(0); }
                        }
                        .bar-info {
                            display: flex;
                            gap: 20px;
                            align-items: center;
                        }
                        .timer-box {
                            background: rgba(255, 68, 68, 0.2);
                            border: 1px solid #ff4444;
                            color: #ff4444;
                            padding: 5px 10px;
                            border-radius: 4px;
                            font-weight: bold;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        .total-price {
                            font-size: 1.2rem;
                            font-weight: bold;
                            color: white;
                        }
                        .checkout-btn {
                            background: #00d4ff;
                            color: black;
                            border: none;
                            padding: 10px 25px;
                            border-radius: 25px;
                            font-weight: bold;
                            font-size: 1rem;
                            cursor: pointer;
                            transition: transform 0.2s;
                        }
                        .checkout-btn:hover {
                            transform: scale(1.05);
                            background: #66e0ff;
                        }
                        @media (max-width: 600px) {
                            .sticky-checkout-bar {
                                flex-direction: column;
                                gap: 10px;
                                text-align: center;
                            }
                        }
                    `}</style>

                    <div className="bar-info">
                        {earliestExpiration && (
                            <div className="timer-box">
                                <i className="fas fa-stopwatch"></i>
                                <span>Time Left: </span>
                                <CountdownTimer 
                                    targetDate={earliestExpiration} 
                                    onExpire={handleExpired} 
                                />
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

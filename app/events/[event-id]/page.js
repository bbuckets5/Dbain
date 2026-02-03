'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TicketManager from '@/components/TicketManager';
import SeatingChart from '@/components/SeatingChart'; // --- NEW IMPORT ---
import { getLocalEventDate } from '@/lib/dateUtils';
import { toDate } from 'date-fns-tz';

export default function EventDetailsPage({ params }) {
    // Unwrap params for Next.js 15
    const resolvedParams = use(params);
    const eventId = resolvedParams['event-id'] || resolvedParams['id'] || resolvedParams['eventId'];

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- NEW: State for Reserved Seating ---
    const [selectedSeats, setSelectedSeats] = useState([]);

    useEffect(() => {
        if (!eventId) return;
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
        fetchEvent();
    }, [eventId]);

    // --- NEW: Handle clicking a seat on the map ---
    const handleSeatSelect = (seat) => {
        // Toggle selection: If selected, remove it. If not, add it.
        if (selectedSeats.some(s => s._id === seat._id)) {
            setSelectedSeats(selectedSeats.filter(s => s._id !== seat._id));
        } else {
            // Optional: Limit to max 10 tickets per order
            if (selectedSeats.length >= 10) {
                alert("You can only select up to 10 seats.");
                return;
            }
            setSelectedSeats([...selectedSeats, seat]);
        }
    };

    // --- NEW: Temporary "Add to Cart" for Reserved Seats ---
    // (We will connect this to the Real-Time Hold API in the next step)
    const handleReservedAddToCart = () => {
        alert(`You selected ${selectedSeats.length} seats. Connecting to payment system next...`);
        console.log("Selected Seats:", selectedSeats);
    };

    if (loading) return <main className="main-content"><p>Loading event...</p></main>;

    if (error || !event) {
        return (
            <main className="main-content">
                <h1>Event Not Found</h1>
                <p>Sorry, we couldn&apos;t find that event.</p>
                <Link href="/" className="cta-button">Back to Events</Link>
            </main>
        );
    }
    
    const { fullDate: formattedDate, time: formattedTime } = getLocalEventDate(event);
    const eventDateObj = toDate(event.eventDate, { timeZone: 'America/New_York' });
    const eventHasStarted = new Date() > eventDateObj;
    
    // Logic for "Sold Out" differs slightly between modes
    const isSoldOut = event.isReservedSeating 
        ? event.seats.every(s => s.status === 'sold') 
        : event.ticketsSold >= event.ticketCount;

    return (
        <main className="main-content">
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

                    {/* --- TOGGLE: Show Map OR Standard Ticket List --- */}
                    {event.isReservedSeating ? (
                        <div className="reserved-seating-section">
                            <h3>Select Your Seats</h3>
                            <SeatingChart 
                                seats={event.seats} 
                                onSeatSelect={handleSeatSelect} 
                                selectedSeats={selectedSeats} 
                            />
                            
                            {/* Selected Seats Summary */}
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
                                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', marginTop:'10px', fontSize:'1.1rem'}}>
                                        <span>Total:</span>
                                        <span>${selectedSeats.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                                    </div>
                                    <button 
                                        onClick={handleReservedAddToCart} 
                                        className="cta-button" 
                                        style={{width: '100%', marginTop: '15px'}}
                                    >
                                        Proceed to Checkout ({selectedSeats.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // STANDARD GENERAL ADMISSION
                        <TicketManager 
                            tickets={event.tickets} 
                            eventName={event.eventName}
                            isSoldOut={isSoldOut}
                            eventHasStarted={eventHasStarted}
                            eventId={event._id}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

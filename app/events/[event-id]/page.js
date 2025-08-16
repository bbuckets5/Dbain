'use client'; // 1. Convert to a Client Component

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TicketManager from '@/components/TicketManager';

export default function EventDetailsPage({ params }) {
    const eventId = params['event-id'];
    
    // 2. Use state to hold event data, loading, and error status
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 3. Use useEffect to fetch data on the client-side
    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;
            try {
                // Fetch the event data from your existing API route
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

    // Handle loading and error states
    if (loading) {
        return <main className="main-content"><p>Loading event...</p></main>;
    }

    if (error || !event) {
        return (
            <main className="main-content">
                <h1>Event Not Found</h1>
                <p>Sorry, we couldn&apos;t find the event you were looking for, or it is not currently available.</p>
                <Link href="/" className="cta-button">Back to Events</Link>
            </main>
        );
    }
    
    // 4. Perform the time check in the browser for accuracy
    const datePart = event.eventDate.substring(0, 10);
    const timePart = event.eventTime;
    const eventLocalTimeString = `${datePart}T${timePart}`;
    const eventStartDateTime = new Date(eventLocalTimeString);
    const now = new Date();
    const eventHasStarted = now > eventStartDateTime;

    const isSoldOut = event.ticketsSold >= event.ticketCount;
    
    const formattedDate = new Date(event.eventDate).toLocaleDateString(undefined, {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    const formattedTime = new Date(`1970-01-01T${event.eventTime}Z`).toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit', hour12: true
    });

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
                    <TicketManager 
                        tickets={event.tickets} 
                        eventName={event.eventName}
                        isSoldOut={isSoldOut}
                        eventHasStarted={eventHasStarted}
                        eventId={event._id}
                    />
                </div>
            </div>
        </main>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TicketManager from '@/components/TicketManager';
// --- THE FIX: Use the correct 'toDate' function ---
import { format, toDate } from 'date-fns-tz';

export default function EventDetailsPage({ params }) {
    const eventId = params['event-id'];
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) return;
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
    
    // --- THIS ENTIRE BLOCK IS REPLACED WITH THE NEW, RELIABLE TIME LOGIC ---
    const timeZone = 'America/New_York';
    const eventDateString = `${event.eventDate.substring(0, 10)}T${event.eventTime}`;
    // Use the correct 'toDate' function to get a reliable Date object
    const eventDateObj = toDate(eventDateString, { timeZone });

    // This comparison is now 100% accurate
    const eventHasStarted = new Date() > eventDateObj;
    const isSoldOut = event.ticketsSold >= event.ticketCount;
    
    // Format the reliable Date object for display
    const formattedDate = format(eventDateObj, 'EEEE, MMMM d, yyyy', { timeZone });
    const formattedTime = format(eventDateObj, 'h:mm a', { timeZone });

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

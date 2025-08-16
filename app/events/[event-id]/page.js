import Link from 'next/link';
import Image from 'next/image';
import Event from '../../../models/Event.js';
import TicketManager from '@/components/TicketManager';
import dbConnect from '../../../lib/dbConnect';

async function EventDetails({ eventId }) {
    try {
        await dbConnect();
        
        const eventFromDB = await Event.findById(eventId).lean();
        const event = JSON.parse(JSON.stringify(eventFromDB));
        
        if (!event || event.status !== 'approved') {
            return (
                <main className="main-content">
                    <h1>Event Not Found</h1>
                    <p>Sorry, we couldn&apos;t find the event you were looking for, or it is not currently available.</p>
                    <Link href="/" className="cta-button">Back to Events</Link>
                </main>
            );
        }
        
        const eventStartDateTime = new Date(`${new Date(event.eventDate).toISOString().substring(0, 10)}T${event.eventTime}`);
        const now = new Date();
        const eventHasStarted = now > eventStartDateTime;
        
        const isSoldOut = event.ticketsSold >= event.ticketCount;

        const eventDateTime = new Date(event.eventDate);
        
        // --- THIS IS THE CORRECTED LINE ---
        // Added { timeZone: 'UTC' } to ensure the date is displayed consistently.
        const formattedDate = eventDateTime.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });

        const formattedTime = new Date(`1970-01-01T${event.eventTime}Z`).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC'
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

    } catch (error) {
        console.error("Error rendering event details page:", error);
        return (
            <main className="main-content">
                <h1>Error</h1>
                <p>Sorry, an error occurred while trying to load this page.</p>
                <Link href="/" className="cta-button">Back to Events</Link>
            </main>
        );
    }
}

export default async function EventDetailsPage({ params }) {
    const { 'event-id': eventId } = await params;
    return <EventDetails eventId={eventId} />;
}
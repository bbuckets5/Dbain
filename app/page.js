import Link from 'next/link';
import Image from 'next/image'; // Import the Next.js Image component
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
import { format, zonedTimeToUtc } from 'date-fns-tz'; // Import our new time zone tools

export default async function HomePage() {
    await dbConnect();
    
    // --- NEW TIME-ZONE-AWARE LOGIC ---
    const timeZone = 'America/New_York'; // Set our target time zone

    // 1. Get the start of today in the target time zone to correctly filter past events.
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    // This creates a date object representing midnight in the server's local time,
    // then zonedTimeToUtc correctly interprets it as midnight Eastern Time.
    const startOfTodayET = new Date(year, month, day); 
    const startOfTodayUTC = zonedTimeToUtc(startOfTodayET, timeZone);

    // 2. Find only approved events that are happening on or after the start of today.
    const events = await Event.find({ 
        status: 'approved',
        eventDate: { $gte: startOfTodayUTC }
    }).sort({ eventDate: 1 }).lean();

    return (
        <main className="container">
            <h1 className="page-title">Upcoming Events</h1>
            <div id="event-list-container" className="event-grid">
                {events.length === 0 ? (
                    <p>No upcoming events at the moment.</p>
                ) : (
                    events.map(event => {
                        // --- NEW DATE/TIME FORMATTING ---
                        const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
                        const eventStartUTC = zonedTimeToUtc(eventDateString, timeZone);
                        const displayDate = format(eventStartUTC, 'M/d/yy', { timeZone });
                        const displayTime = format(eventStartUTC, 'h:mm a', { timeZone });

                        return (
                            <Link href={`/events/${event._id}`} key={event._id} className="event-link">
                                <div className="event-card glass">
                                    {/* --- UPGRADED IMAGE COMPONENT --- */}
                                    <Image 
                                        src={event.flyerImageThumbnailPath || 'https://placehold.co/600x400/2c5364/ffffff?text=No+Image'} 
                                        alt={`${event.eventName} Flyer`} 
                                        className="event-image"
                                        width={600} // Required for Next.js Image
                                        height={400} // Required for Next.js Image
                                    />
                                    <h3>{event.eventName}</h3>
                                    <p>
                                        <i className="fas fa-calendar-alt"></i> {displayDate}
                                        <span className="info-separator"> &bull; </span>
                                        <i className="fas fa-clock"></i> {displayTime}
                                    </p>
                                    <p><i className="fas fa-map-marker-alt"></i> {event.eventLocation}</p>
                                    <p className="price">
                                        {event.tickets && event.tickets.length > 0
                                            ? `$${Number(event.tickets[0].price).toFixed(2)}`
                                            : 'Click for Price'}
                                    </p>
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>
            <div className="ticket-your-event-container" style={{ textAlign: 'center', margin: '40px 0' }}>
                <Link href="/ticket-form" className="cta-button">
                    Ticket Your Event
                </Link>
            </div>
        </main>
    );
}

import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
// --- THE FIX: Use the correct 'toDate' function ---
import { format, toDate } from 'date-fns-tz';

export default async function HomePage() {
    await dbConnect();
    
    const timeZone = 'America/New_York';

    // Get the start of today in the target time zone to correctly filter past events.
    const startOfToday = toDate(new Date().toLocaleDateString(), { timeZone });

    // Find only approved events that are happening on or after the start of today.
    const events = await Event.find({ 
        status: 'approved',
        eventDate: { $gte: startOfToday }
    }).sort({ eventDate: 1 }).lean();

    // This is your original time formatting helper function. We will keep it.
    function formatTime(timeString) {
        if (!timeString) return '';
        const [hour, minute] = timeString.split(':');
        const hourInt = parseInt(hour, 10);
        const ampm = hourInt >= 12 ? 'PM' : 'AM';
        const formattedHour = hourInt % 12 || 12;
        return `${formattedHour}:${minute} ${ampm}`;
    }

    return (
        <main className="container">
            <h1 className="page-title">Upcoming Events</h1>
            <div id="event-list-container" className="event-grid">
                {events.length === 0 ? (
                    <p>No upcoming events at the moment.</p>
                ) : (
                    events.map(event => {
                        // --- THE FIX: Use the 'toDate' function for reliable date display ---
                        const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
                        const eventDateObj = toDate(eventDateString, { timeZone });
                        const displayDate = format(eventDateObj, 'M/d/yy', { timeZone });

                        return (
                            <Link href={`/events/${event._id}`} key={event._id} className="event-link">
                                <div className="event-card glass">
                                    <Image 
                                        src={event.flyerImageThumbnailPath || 'https://placehold.co/600x400/2c5364/ffffff?text=No+Image'} 
                                        alt={`${event.eventName} Flyer`} 
                                        className="event-image"
                                        width={600}
                                        height={400}
                                        loading="lazy" // Added loading="lazy" from your original code
                                    />
                                    <h3>{event.eventName}</h3>
                                    <p>
                                        <i className="fas fa-calendar-alt"></i> 
                                        {/* Display the correctly formatted date */}
                                        {displayDate}
                                        <span className="info-separator"> &bull; </span>
                                        {/* Use your original time formatter as requested */}
                                        <i className="fas fa-clock"></i> {formatTime(event.eventTime)}
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

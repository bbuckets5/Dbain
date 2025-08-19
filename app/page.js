import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
import { format, toDate } from 'date-fns-tz';
import { startOfDay } from 'date-fns';

export default async function HomePage() {
    await dbConnect();
    
    const timeZone = 'America/New_York';

    // Reliably get the start of today to filter out past events
    const startOfToday = startOfDay(new Date());
    
    // Find events that are approved and happening on or after today
    const events = await Event.find({ 
        status: 'approved',
        eventDate: { $gte: startOfToday }
    }).sort({ eventDate: 1 }).lean();

    return (
        <main className="container">
            <h1 className="page-title">Upcoming Events</h1>
            <div id="event-list-container" className="event-grid">
                {events.length === 0 ? (
                    <p>No upcoming events at the moment.</p>
                ) : (
                    events.map(event => {
                        // Reliably create a timezone-aware date object for display
                        const eventDateString = `${event.eventDate.toISOString().substring(0, 10)}T${event.eventTime}`;
                        const eventDateObj = toDate(eventDateString, { timeZone });
                        
                        // Reliably format the date and time
                        const displayDate = format(eventDateObj, 'M/d/yy', { timeZone });
                        const displayTime = format(eventDateObj, 'h:mm a', { timeZone });

                        return (
                            <Link href={`/events/${event._id}`} key={event._id} className="event-link">
                                <div className="event-card glass">
                                    <Image 
                                        src={event.flyerImageThumbnailPath || 'https://placehold.co/600x400/2c5364/ffffff?text=No+Image'} 
                                        alt={`${event.eventName} Flyer`} 
                                        className="event-image"
                                        width={600}
                                        height={400}
                                        loading="lazy"
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
                        );
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

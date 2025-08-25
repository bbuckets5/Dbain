import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
import { getLocalEventDate } from '../lib/dateUtils';

// --- FIX: Add searchParams to the function to read the page number from the URL ---
export default async function HomePage({ searchParams }) {
    await dbConnect();
    
    // --- FIX: Pagination Logic ---
    const page = parseInt(searchParams.page) || 1;
    const limit = 9; // Show 9 events per page as requested
    const skip = (page - 1) * limit;

    const query = { status: 'approved' };

    // Get the total count of approved events for the counter and total pages
    const totalEvents = await Event.countDocuments(query);
    const totalPages = Math.ceil(totalEvents / limit);

    // Fetch only the 9 events for the current page
    const events = await Event.find(query)
        .sort({ eventDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // --- FIX: Calculate the item numbers for the counter text ---
    const startItem = totalEvents > 0 ? skip + 1 : 0;
    const endItem = skip + events.length;

    return (
        <main className="container">
            {/* --- FIX: Container for title and the new counter --- */}
            <div className="page-header-controls">
                <h1 className="page-title">Upcoming Events</h1>
                {totalEvents > 0 && (
                    <div className="pagination-meta">
                        Showing {startItem} - {endItem} of {totalEvents} events
                    </div>
                )}
            </div>

            <div id="event-list-container" className="event-grid">
                {events.length === 0 ? (
                    <p>No upcoming events at the moment.</p>
                ) : (
                    events.map(event => {
                        const { shortDate, time } = getLocalEventDate(event);
                        
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
                                        <i className="fas fa-calendar-alt"></i> {shortDate}
                                        <span className="info-separator"> &bull; </span>
                                        <i className="fas fa-clock"></i> {time}
                                    </p>
                                    <p><i className="fas fa-map-marker-alt"></i> {event.eventLocation}</p>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
            
            {/* --- FIX: Add the pagination navigation links --- */}
            {totalPages > 1 && (
                <div className="pagination-nav">
                    {page > 1 ? (
                        <Link href={`/?page=${page - 1}`} className="cta-button">&larr; Previous Page</Link>
                    ) : (
                        <span className="cta-button disabled">&larr; Previous Page</span>
                    )}
                    
                    <span>Page {page} of {totalPages}</span>
                    
                    {page < totalPages ? (
                        <Link href={`/?page=${page + 1}`} className="cta-button">Next Page &rarr;</Link>
                    ) : (
                        <span className="cta-button disabled">Next Page &rarr;</span>
                    )}
                </div>
            )}

            <div className="ticket-your-event-container" style={{ textAlign: 'center', margin: '40px 0' }}>
                <Link href="/ticket-form" className="cta-button">
                    Ticket Your Event
                </Link>
            </div>
        </main>
    );
}

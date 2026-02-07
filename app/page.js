import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
import { getLocalEventDate } from '../lib/dateUtils';

// This is a Server Component that runs directly on the server
export default async function HomePage(props) {
    // Unwrap searchParams for Next.js 15+ support
    const searchParams = await props.searchParams;
    
    await dbConnect();
    
    const page = parseInt(searchParams?.page) || 1;
    const limit = 9; 
    const skip = (page - 1) * limit;

    // --- QUERY: Show ALL approved events (Past & Future) ---
    const query = { status: 'approved' };

    // Get stats
    const totalEvents = await Event.countDocuments(query);
    const totalPages = Math.ceil(totalEvents / limit);

    // Fetch events
    const events = await Event.find(query)
        // Sort by Date DESCENDING (-1) so newest/future events are at the top
        .sort({ eventDate: -1 }) 
        .skip(skip)
        .limit(limit)
        .lean();

    const startItem = totalEvents > 0 ? skip + 1 : 0;
    const endItem = skip + events.length;

    return (
        <main className="container">
            <div className="page-header-controls">
                <h1 className="page-title">Browse Events</h1>
                {totalEvents > 0 && (
                    <div className="pagination-meta">
                        Showing {startItem} - {endItem} of {totalEvents} events
                    </div>
                )}
            </div>

            <div id="event-list-container" className="event-grid">
                {events.length === 0 ? (
                    <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px'}}>
                        <p>No events found.</p>
                    </div>
                ) : (
                    events.map(event => {
                        const { shortDate, time } = getLocalEventDate(event);
                        
                        return (
                            <Link href={`/events/${event._id}`} key={event._id} className="event-link">
                                {/* FIX: Added position: relative so the badge stays inside the card */}
                                <div className="event-card glass" style={{ position: 'relative' }}>
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
                                    
                                    {/* Reserved Seating Badge */}
                                    {event.isReservedSeating && (
                                        <span style={{
                                            position: 'absolute', 
                                            top: '10px', 
                                            right: '10px', 
                                            background: '#00d4ff', 
                                            color: '#000', 
                                            padding: '4px 8px', 
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            zIndex: 10
                                        }}>
                                            Reserved Seating
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
            
            {/* Pagination Controls */}
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

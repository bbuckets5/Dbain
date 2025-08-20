// In app/page.js

import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
import { getLocalEventDate } from '../lib/dateUtils';

export default async function HomePage() {
    await dbConnect();
    
    const events = await Event.find({ 
        status: 'approved'
    }).sort({ eventDate: 1 }).lean();

    return (
        <main className="container">
            <h1 className="page-title">Upcoming Events (DEBUG MODE)</h1>
            <div id="event-list-container" className="event-grid">
                {events.length === 0 ? (
                    <p>No upcoming events at the moment.</p>
                ) : (
                    events.map(event => {
                        const { shortDate, time } = getLocalEventDate(event);
                        
                        // --- DEBUGGING LINE ---
                        const rawDatabaseDate = event.eventDate ? event.eventDate.toString() : "No Date";
                        
                        return (
                            <div key={event._id} style={{ border: '2px solid red', padding: '10px', margin: '10px' }}>
                                <Link href={`/events/${event._id}`} className="event-link">
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
                                {/* --- DEBUGGING DISPLAY --- */}
                                <div style={{ marginTop: '10px', background: 'black', color: 'lime', padding: '5px', fontFamily: 'monospace' }}>
                                    <p>RAW DB DATE: {rawDatabaseDate}</p>
                                    <p>FORMATTED TIME: {time}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}

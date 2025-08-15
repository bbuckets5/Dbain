// app/page.js
import Link from 'next/link';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event'; // Using our renamed Event model

// Helper function to format time (can be moved to a utils file later)
function formatTime(timeString) {
  if (!timeString) return '';
  const [hour, minute] = timeString.split(':');
  const hourInt = parseInt(hour, 10);
  const ampm = hourInt >= 12 ? 'PM' : 'AM';
  const formattedHour = hourInt % 12 || 12;
  return `${formattedHour}:${minute} ${ampm}`;
}

// This is an async Server Component
export default async function HomePage() {
  await dbConnect();
  
  // Fetch approved events directly from the database
  const events = await Event.find({ status: 'approved' }).sort({ eventDate: 1 }).lean();

  return (
    <main className="container">
      <h1 className="page-title">Upcoming Events</h1>
      <div id="event-list-container" className="event-grid">
        {events.length === 0 ? (
          <p>No upcoming events at the moment.</p>
        ) : (
          events.map(event => (
            <Link href={`/events/${event._id}`} key={event._id} className="event-link">
              <div className="event-card glass">
                <img 
                  src={event.flyerImageThumbnailPath || 'https://placehold.co/600x400/2c5364/ffffff?text=No+Image'} 
                  alt={`${event.eventName} Flyer`} 
                  className="event-image"
                  loading="lazy"
                />
                <h3>{event.eventName}</h3>
                <p>
                  <i className="fas fa-calendar-alt"></i> {new Date(event.eventDate).toLocaleDateString()}
                  <span className="info-separator"> &bull; </span>
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
          ))
        )}
      </div>
    </main>
  );
}
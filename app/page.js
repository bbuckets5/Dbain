// app/page.js
import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '../lib/dbConnect';
import Event from '../models/Event';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

export default async function HomePage() {
  await dbConnect();

  const timeZone = 'America/New_York';

  // 1) Compute start of *today* in New York, then convert to UTC for Mongo
  const startOfTodayNYString = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd'T'00:00:00");
  const startOfTodayUtc = zonedTimeToUtc(startOfTodayNYString, timeZone);

  // 2) Fetch approved, upcoming events (robust against bad dates)
  let events = [];
  try {
    events = await Event.find({
      status: 'approved',
      eventDate: { $gte: startOfTodayUtc },
    })
      .sort({ eventDate: 1 })
      .lean();
  } catch {
    // If anything goes wrong, keep events empty so prerender never crashes
    events = [];
  }

  // 3) Time formatter (kept from your original, with a small safety check)
  function formatTime(timeString) {
    if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return '';
    const [hour, minute] = timeString.split(':');
    const hourInt = parseInt(hour, 10);
    if (Number.isNaN(hourInt)) return '';
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    const formattedHour = hourInt % 12 || 12;
    const safeMinute = /^\d+$/.test(minute) ? minute : '00';
    return `${formattedHour}:${safeMinute} ${ampm}`;
  }

  // 4) Render
  return (
    <main className="container">
      <h1 className="page-title">Upcoming Events</h1>

      <div id="event-list-container" className="event-grid">
        {(!events || events.length === 0) ? (
          <p>No upcoming events at the moment.</p>
        ) : (
          events.map((event) => {
            // Safely format the date for display in New York time
            let displayDate = '';
            try {
              // event.eventDate should be a Date; ensure it’s parsed safely
              const eventDateObj = new Date(event.eventDate);
              if (!Number.isNaN(eventDateObj.valueOf())) {
                displayDate = formatInTimeZone(eventDateObj, timeZone, 'M/d/yy');
              }
            } catch {
              displayDate = '';
            }

            const price =
              Array.isArray(event.tickets) && event.tickets.length > 0 && event.tickets[0]?.price != null
                ? `$${Number(event.tickets[0].price).toFixed(2)}`
                : 'Click for Price';

            return (
              <Link href={`/events/${event._id}`} key={String(event._id)} className="event-link">
                <div className="event-card glass">
                  <Image
                    src={
                      event.flyerImageThumbnailPath ||
                      'https://placehold.co/600x400/2c5364/ffffff?text=No+Image'
                    }
                    alt={`${event.eventName ?? 'Event'} Flyer`}
                    className="event-image"
                    width={600}
                    height={400}
                    loading="lazy"
                  />

                  <h3>{event.eventName ?? 'Untitled Event'}</h3>

                  <p>
                    <i className="fas fa-calendar-alt"></i>{' '}
                    {displayDate || 'TBD'}
                    <span className="info-separator"> &bull; </span>
                    <i className="fas fa-clock"></i>{' '}
                    {formatTime(event.eventTime) || 'TBD'}
                  </p>

                  <p>
                    <i className="fas fa-map-marker-alt"></i>{' '}
                    {event.eventLocation || 'Location TBA'}
                  </p>

                  <p className="price">{price}</p>
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


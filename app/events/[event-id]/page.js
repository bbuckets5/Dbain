// app/events/[event-id]/page.jsx (or your current path)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TicketManager from '@/components/TicketManager';
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

export default function EventDetailsPage({ params }) {
  const eventId = params['event-id'];
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Event not found.');
        setEvent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <main className="main-content">
        <p>Loading event...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="main-content">
        <h1>Event Not Found</h1>
        <p>Sorry, we couldn&apos;t find that event.</p>
        <Link href="/" className="cta-button">Back to Events</Link>
      </main>
    );
  }

  // ---- Safe date handling in America/New_York ----
  const tz = 'America/New_York';
  const yyyyMmDd =
    typeof event.eventDate === 'string'
      ? event.eventDate.slice(0, 10)
      : event.eventDate instanceof Date
      ? event.eventDate.toISOString().slice(0, 10)
      : '';

  const hhmm =
    event.eventTime && /^\d{2}:\d{2}$/.test(event.eventTime) ? event.eventTime : '00:00';

  const nyDateTime = `${yyyyMmDd || '1970-01-01'}T${hhmm}:00`;
  const eventUtc = zonedTimeToUtc(nyDateTime, tz);

  const eventHasStarted = new Date() > eventUtc;
  const isSoldOut = (event.ticketsSold ?? 0) >= (event.ticketCount ?? 0);

  const formattedDate = formatInTimeZone(eventUtc, tz, 'EEEE, MMMM d, yyyy');
  const formattedTime = formatInTimeZone(eventUtc, tz, 'h:mm a');

  return (
    <main className="main-content">
      <div className="event-details-container glass">
        <div className="event-image-box">
          <Image
            src={event.flyerImagePath || '/placeholder.png'}
            alt={event.eventName || 'Event'}
            width={500}
            height={300}
          />
        </div>

        <div className="event-info-box">
          <h1>{event.eventName || 'Untitled Event'}</h1>

          <div className="event-meta">
            <p><i className="fas fa-calendar-alt"></i> {formattedDate}</p>
            <p><i className="fas fa-clock"></i> {formattedTime}</p>
            <p><i className="fas fa-map-marker-alt"></i> {event.eventLocation || 'TBA'}</p>
          </div>

          <div className="event-description">
            {(event.eventDescription || '')
              .split('\n')
              .map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>

          <TicketManager
            tickets={event.tickets || []}
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


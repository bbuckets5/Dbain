// app/my-tickets/page.js
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { useUser } from '@/components/UserContext';
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

export default function MyTicketsPage() {
  const { user, loading: userLoading } = useUser();
  const [upcomingTickets, setUpcomingTickets] = useState([]);
  const [pastTickets, setPastTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleQrCode, setVisibleQrCode] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      if (userLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/users/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tickets. Please log in again.');
        }

        const tickets = await response.json();
        const validTickets = Array.isArray(tickets)
          ? tickets.filter((t) => t?.eventId)
          : [];

        const timeZone = 'America/New_York';
        const nowUtc = new Date(); // compare in UTC; we’ll create UTC dates from NY wall time

        const upcoming = [];
        const past = [];

        for (const ticket of validTickets) {
          const ev = ticket.eventId || {};
          // Handle eventDate if it's a Date or string
          const yyyyMmDd =
            typeof ev.eventDate === 'string'
              ? ev.eventDate.slice(0, 10)
              : ev.eventDate instanceof Date
              ? ev.eventDate.toISOString().slice(0, 10)
              : '';

          // Ensure time (fallback to midnight if missing)
          const hhmm = (ev.eventTime && /^\d{2}:\d{2}$/.test(ev.eventTime))
            ? ev.eventTime
            : '00:00';

          if (!yyyyMmDd) {
            // If date is missing/invalid, treat as past so it doesn’t break
            past.push(ticket);
            continue;
          }

          // Build NY wall-time string then convert to an actual UTC Date
          const nyDateTime = `${yyyyMmDd}T${hhmm}:00`;
          let eventUtc;
          try {
            eventUtc = zonedTimeToUtc(nyDateTime, timeZone);
            if (Number.isNaN(eventUtc.valueOf())) throw new Error('Bad date');
          } catch {
            // Any parsing issues → place in past to avoid crashing UI
            past.push(ticket);
            continue;
          }

          if (eventUtc > nowUtc) {
            upcoming.push(ticket);
          } else {
            past.push(ticket);
          }
        }

        setUpcomingTickets(upcoming);
        setPastTickets(past);
      } catch (err) {
        setError(err.message || 'Failed to load tickets.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, userLoading]);

  const generateQrCode = async (ticketId) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(ticketId, { width: 200, margin: 2 });
      setVisibleQrCode(qrCodeDataUrl);
    } catch (err) {
      console.error('Failed to generate QR code', err);
      setError('Could not generate QR code.');
    }
  };

  const TicketItem = ({ ticket }) => {
    const { eventId, ticketType, _id } = ticket || {};
    const ev = eventId || {};
    const timeZone = 'America/New_York';

    // Normalize date (string or Date)
    const yyyyMmDd =
      typeof ev.eventDate === 'string'
        ? ev.eventDate.slice(0, 10)
        : ev.eventDate instanceof Date
        ? ev.eventDate.toISOString().slice(0, 10)
        : '';

    const hhmm = (ev.eventTime && /^\d{2}:\d{2}$/.test(ev.eventTime)) ? ev.eventTime : '00:00';

    const nyDateTime = `${yyyyMmDd || '1970-01-01'}T${hhmm}:00`;

    let eventUtc = null;
    try {
      eventUtc = zonedTimeToUtc(nyDateTime, timeZone);
    } catch {
      eventUtc = null;
    }

    const formattedDate = eventUtc
      ? formatInTimeZone(eventUtc, timeZone, 'M/d/yy')
      : 'TBD';

    const formattedTime = eventUtc
      ? formatInTimeZone(eventUtc, timeZone, 'h:mm a')
      : 'TBD';

    return (
      <div className="ticket-item glass">
        <div className="ticket-details">
          <h3>{ev.eventName || 'Untitled Event'}</h3>
          <p>
            <i className="fas fa-calendar-alt"></i> {formattedDate}
            <span className="info-separator"> &bull; </span>
            <i className="fas fa-clock"></i> {formattedTime}
          </p>
          <p className="ticket-type-info">{ticketType || 'General'}</p>
          <p>
            <i className="fas fa-receipt"></i> Ticket ID: <strong>{_id}</strong>
          </p>
        </div>
        <div className="ticket-actions">
          <button className="cta-button" onClick={() => generateQrCode(_id)}>
            Show QR Code
          </button>
        </div>
      </div>
    );
  };

  if (loading || userLoading) return <p>Loading your tickets...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!user) return <p>Please <a href="/login">log in</a> to see your tickets.</p>;

  return (
    <main className="container">
      <h1 className="page-title">My Tickets</h1>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>

      {visibleQrCode && (
        <div className="modal-overlay" onClick={() => setVisibleQrCode(null)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            {/* Use Next/Image to avoid ESLint no-img-element warning */}
            <Image
              src={visibleQrCode}
              alt="Ticket QR Code"
              width={220}
              height={220}
              unoptimized
              priority={false}
            />
            <button className="cta-button" onClick={() => setVisibleQrCode(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="tickets-list">
        {activeTab === 'upcoming' &&
          (upcomingTickets.length > 0 ? (
            upcomingTickets.map((t) => <TicketItem key={t._id} ticket={t} />)
          ) : (
            <p>You have no upcoming tickets.</p>
          ))}

        {activeTab === 'past' &&
          (pastTickets.length > 0 ? (
            pastTickets.map((t) => <TicketItem key={t._id} ticket={t} />)
          ) : (
            <p>You have no past tickets.</p>
          ))}
      </div>
    </main>
  );
}



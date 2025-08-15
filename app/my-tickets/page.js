// In app/my-tickets/page.js
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function MyTicketsPage() {
    const [upcomingTickets, setUpcomingTickets] = useState([]);
    const [pastTickets, setPastTickets] = useState([]);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visibleQrCode, setVisibleQrCode] = useState(null);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const response = await fetch('/api/users/tickets');
                if (!response.ok) {
                    throw new Error('Failed to fetch tickets. Please log in again.');
                }
                const tickets = await response.json();

                // --- THIS IS THE FIX ---
                // We filter out any tickets where the event has been deleted (eventId is null).
                const validTickets = tickets.filter(ticket => ticket.eventId);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcoming = [];
                const past = [];

                // We now loop over the filtered validTickets instead of all tickets
                validTickets.forEach(ticket => {
                    const eventDate = new Date(ticket.eventId.eventDate);
                    if (eventDate >= today) {
                        upcoming.push(ticket);
                    } else {
                        past.push(ticket);
                    }
                });

                setUpcomingTickets(upcoming);
                setPastTickets(past);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);

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
        const { eventId, ticketType, _id } = ticket;
        const formattedDate = new Date(eventId.eventDate).toLocaleDateString();
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const [hour, minute] = timeStr.split(':');
            const hourInt = parseInt(hour, 10);
            const ampm = hourInt >= 12 ? 'PM' : 'AM';
            const formattedHour = hourInt % 12 || 12;
            return `${formattedHour}:${minute} ${ampm}`;
        };

        return (
            <div className="ticket-item glass">
                <div className="ticket-details">
                    <h3>{eventId.eventName}</h3>
                    <p>
                        <i className="fas fa-calendar-alt"></i> {formattedDate}
                        <span className="info-separator"> &bull; </span>
                        <i className="fas fa-clock"></i> {formatTime(eventId.eventTime)}
                    </p>
                    <p className="ticket-type-info">{ticketType}</p>
                    <p><i className="fas fa-receipt"></i> Ticket ID: <strong>{_id}</strong></p>
                </div>
                <div className="ticket-actions">
                    <button className="cta-button" onClick={() => generateQrCode(_id)}>Show QR Code</button>
                </div>
            </div>
        );
    };

    if (loading) return <p>Loading your tickets...</p>;
    if (error) return <p className="error-msg">{error}</p>;

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

            {/* QR Code Modal */}
            {visibleQrCode && (
                <div className="modal-overlay" onClick={() => setVisibleQrCode(null)}>
                    <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                        <img src={visibleQrCode} alt="Ticket QR Code" />
                        <button className="cta-button" onClick={() => setVisibleQrCode(null)}>Close</button>
                    </div>
                </div>
            )}

            <div className="tickets-list">
                {activeTab === 'upcoming' && (
                    upcomingTickets.length > 0
                        ? upcomingTickets.map(ticket => <TicketItem key={ticket._id} ticket={ticket} />)
                        : <p>You have no upcoming tickets.</p>
                )}
                {activeTab === 'past' && (
                    pastTickets.length > 0
                        ? pastTickets.map(ticket => <TicketItem key={ticket._id} ticket={ticket} />)
                        : <p>You have no past tickets.</p>
                )}
            </div>
        </main>
    );
}
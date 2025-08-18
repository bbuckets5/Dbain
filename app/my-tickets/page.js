'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useUser } from '@/components/UserContext';
// --- THE FIX: Use the correct 'toDate' function from the main library ---
import { format, toDate } from 'date-fns-tz';

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
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch tickets. Please log in again.');
                }
                const tickets = await response.json();
                const validTickets = tickets.filter(ticket => ticket.eventId);

                const timeZone = 'America/New_York';
                const now = new Date();
                const upcoming = [];
                const past = [];

                validTickets.forEach(ticket => {
                    const eventDateString = `${ticket.eventId.eventDate.substring(0, 10)}T${ticket.eventId.eventTime}`;
                    // Use the correct 'toDate' function for reliable sorting
                    const eventDateObj = toDate(eventDateString, { timeZone });
                    
                    if (eventDateObj > now) {
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
        const { eventId, ticketType, _id } = ticket;
        
        const timeZone = 'America/New_York';
        const eventDateString = `${eventId.eventDate.substring(0, 10)}T${eventId.eventTime}`;
        // Use the correct 'toDate' function for reliable display
        const eventDateObj = toDate(eventDateString, { timeZone });
        const formattedDate = format(eventDateObj, 'M/d/yy', { timeZone });
        const formattedTime = format(eventDateObj, 'h:mm a', { timeZone });

        return (
            <div className="ticket-item glass">
                <div className="ticket-details">
                    <h3>{eventId.eventName}</h3>
                    <p>
                        <i className="fas fa-calendar-alt"></i> {formattedDate}
                        <span className="info-separator"> &bull; </span>
                        <i className="fas fa-clock"></i> {formattedTime}
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

    if (loading || userLoading) return <p>Loading your tickets...</p>;
    if (error) return <p className="error-msg">{error}</p>;
    if (!user) return <p>Please <a href="/login">log in</a> to see your tickets.</p>

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

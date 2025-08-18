'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useUser } from '@/components/UserContext';
import { format, zonedTimeToUtc } from 'date-fns-tz';

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
            // Wait for user to be loaded from context
            if (userLoading) return;
            // If there's no user, no need to fetch
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // --- FIX 1: Add the Authorization header ---
                const token = localStorage.getItem('authToken');
                const response = await fetch('/api/users/tickets', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch tickets. Please log in again.');
                }
                const tickets = await response.json();
                const validTickets = tickets.filter(ticket => ticket.eventId);

                // --- FIX 2: Use the new time zone library for sorting ---
                const timeZone = 'America/New_York';
                const now = new Date();
                const upcoming = [];
                const past = [];

                validTickets.forEach(ticket => {
                    const eventDateString = `${ticket.eventId.eventDate.substring(0, 10)}T${ticket.eventId.eventTime}`;
                    const eventStartUTC = zonedTimeToUtc(eventDateString, timeZone);
                    
                    if (eventStartUTC > now) {
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
    }, [user, userLoading]); // Rerun when user is loaded

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
        
        // --- FIX 3: Use the new time zone library for display ---
        const timeZone = 'America/New_York';
        const eventDateString = `${eventId.eventDate.substring(0, 10)}T${eventId.eventTime}`;
        const eventStartUTC = zonedTimeToUtc(eventDateString, timeZone);
        const formattedDate = format(eventStartUTC, 'M/d/yy', { timeZone });
        const formattedTime = format(eventStartUTC, 'h:mm a', { timeZone });

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
            {/* ... The rest of your JSX for tabs and the modal is perfect and remains unchanged ... */}
            <h1 className="page-title">My Tickets</h1>
            <div className="tabs-nav">
                {/* Tabs for Upcoming/Past */}
            </div>
            {visibleQrCode && (
                <div className="modal-overlay" onClick={() => setVisibleQrCode(null)}>
                    {/* QR Code Modal */}
                </div>
            )}
            <div className="tickets-list">
                {/* Ticket list rendering */}
            </div>
        </main>
    );
}


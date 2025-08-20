'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/modal';
import { useRouter } from 'next/navigation';

// --- FIX #1: Add the authenticated fetch helper ---
const authedFetch = async (url, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const body =
        options.body && typeof options.body !== 'string'
            ? JSON.stringify(options.body)
            : options.body;
    const res = await fetch(url, { ...options, headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || 'An API error occurred.');
    }
    return data;
};

export default function CheckinPage() {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [stats, setStats] = useState(null);
    const [ticketId, setTicketId] = useState('');
    const [scanResult, setScanResult] = useState({ 
        message: '<i class="fas fa-qrcode"></i> Select an event to begin',
        type: 'info' 
    });
    const [isLoading, setIsLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });
    const router = useRouter();

    const showCustomAlert = (title, message, navigateTo) => {
        setModal({ 
            isOpen: true, 
            title, 
            message,
            onClose: () => {
                setModal({ isOpen: false, title: '', message: '' });
                if (navigateTo) {
                    router.push(navigateTo);
                }
            }
        });
    };

    // Fetch the list of events for the dropdown
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // --- FIX #2: Use authedFetch to get the event list ---
                // NOTE: This endpoint might need to be /api/admin/events depending on your routes
                const data = await authedFetch('/api/events'); 
                setEvents(data);
                if (data.length === 0) {
                     showCustomAlert('No Events Found', 'There are no events available for you to manage.');
                }
            } catch (error) {
                console.error('Failed to fetch events', error);
                showCustomAlert('Error', `Could not load event list: ${error.message}`);
            }
        };
        fetchEvents();
    }, []);

    // Fetch stats when a new event is selected
    useEffect(() => {
        if (!selectedEventId) {
            setStats(null);
            setScanResult({ message: '<i class="fas fa-qrcode"></i> Select an event to begin', type: 'info' });
            return;
        }

        const fetchStats = async () => {
            try {
                // --- FIX #3: Use authedFetch to get the event stats ---
                const data = await authedFetch(`/api/checkin/stats/${selectedEventId}`);
                setStats(data);
                setScanResult({ message: '<i class="fas fa-qrcode"></i> Ready to scan', type: 'info' });
            } catch (error) {
                console.error('Failed to fetch stats', error);
                setStats(null);
                showCustomAlert('Error', `Could not load stats: ${error.message}`);
            }
        };
        fetchStats();
    }, [selectedEventId]);

    const handleCheckin = async (e) => {
        if (e) e.preventDefault();
        if (!ticketId.trim()) return;
        if (!selectedEventId) {
            showCustomAlert('Error', 'Please select an event before scanning.');
            return;
        }

        setIsLoading(true);
        try {
            // --- FIX #4: Use authedFetch to process the check-in ---
            const result = await authedFetch('/api/tickets/checkin', {
                method: 'POST',
                body: { ticketId, eventId: selectedEventId }
            });

            setScanResult({ message: `<i class="fas fa-check-circle"></i> ${result.message || 'Valid Ticket'}`, type: 'success' });
            // Refetch stats to get the most up-to-date count
            const latestStats = await authedFetch(`/api/checkin/stats/${selectedEventId}`);
            setStats(latestStats);

        } catch (error) {
            console.error('Check-in error:', error);
            setScanResult({ message: `<i class="fas fa-times-circle"></i> ${error.message || 'Invalid Ticket'}`, type: 'error' });
            showCustomAlert('Check-in Failed', error.message);
        } finally {
            setTicketId('');
            setIsLoading(false);
            setTimeout(() => {
                if (selectedEventId) {
                    setScanResult({ message: '<i class="fas fa-qrcode"></i> Ready to scan', type: 'info' });
                } else {
                    setScanResult({ message: '<i class="fas fa-qrcode"></i> Select an event to begin', type: 'info' });
                }
            }, 5000);
        }
    };

    return (
        <>
            <h1>Event Check-in</h1>
            <p className="form-description">First, select an event. Then, scan tickets to check attendees in.</p>
            <div className="event-selector-container glass">
                <label htmlFor="event-selector">Select an Event:</label>
                <select id="event-selector" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                    <option value="">-- Please choose an event --</option>
                    {events.map(event => (
                        <option key={event._id} value={event._id}>{event.eventName}</option>
                    ))}
                </select>
            </div>

            {selectedEventId && stats && (
                <div className="checkin-container glass">
                    <div className="checkin-event-info">
                        <h2>Checking In For: <span>{stats.eventName}</span></h2>
                        <p>Total Tickets Sold: <span>{stats.totalTickets}</span></p>
                        <p>Tickets Checked In: <span>{stats.checkedInCount}</span></p>
                        <p>Remaining Capacity: <span>{stats.totalTickets - stats.checkedInCount}</span></p>
                    </div>

                    <div className="checkin-scanner-area">
                        <div id="scan-result-display" className={`scan-result ${scanResult.type}`} dangerouslySetInnerHTML={{ __html: scanResult.message }}>
                        </div>
                        <form onSubmit={handleCheckin}>
                            <input 
                                type="text" 
                                id="ticket-id-input" 
                                placeholder="Scan ticket here..." 
                                value={ticketId}
                                onChange={(e) => setTicketId(e.target.value)}
                                autoFocus 
                            />
                            <button id="manual-checkin-btn" className="cta-button" type="submit" disabled={isLoading}>
                                {isLoading ? 'Checking in...' : 'Manual Check-in'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            <Modal 
                isOpen={modal.isOpen} 
                title={modal.title} 
                message={modal.message} 
                onClose={modal.onClose} 
            />
        </>
    );
}

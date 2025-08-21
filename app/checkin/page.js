'use client';

import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import Modal from '@/components/modal';
import { useRouter } from 'next/navigation';

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

    // --- FIX #1: Add state for the history list ---
    const [history, setHistory] = useState([]);

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

    // --- FIX #2: Create a reusable function to fetch history ---
    const fetchHistory = useCallback(async () => {
        if (!selectedEventId) return;
        try {
            const data = await authedFetch(`/api/checkin/history/${selectedEventId}`);
            setHistory(data);
        } catch (error) {
            console.error("Failed to fetch history:", error.message);
        }
    }, [selectedEventId]);


    // Fetch stats and history when a new event is selected
    useEffect(() => {
        if (!selectedEventId) {
            setStats(null);
            setHistory([]); // Clear history when no event is selected
            setScanResult({ message: '<i class="fas fa-qrcode"></i> Select an event to begin', type: 'info' });
            return;
        }

        const fetchStatsAndHistory = async () => {
            try {
                const data = await authedFetch(`/api/checkin/stats/${selectedEventId}`);
                setStats(data);
                await fetchHistory(); // Fetch initial history
                setScanResult({ message: '<i class="fas fa-qrcode"></i> Ready to scan', type: 'info' });
            } catch (error) {
                console.error('Failed to fetch stats', error);
                setStats(null);
                showCustomAlert('Error', `Could not load stats: ${error.message}`);
            }
        };
        
        fetchStatsAndHistory();

        // --- FIX #3: Add auto-refreshing logic for the history feed ---
        const intervalId = setInterval(fetchHistory, 5000); // Refresh every 5 seconds

        // Cleanup function to stop the interval when the component unmounts or the event changes
        return () => clearInterval(intervalId);

    }, [selectedEventId, fetchHistory]);


    const handleCheckin = async (e) => {
        if (e) e.preventDefault();
        if (!ticketId.trim()) return;
        if (!selectedEventId) {
            showCustomAlert('Error', 'Please select an event before scanning.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authedFetch('/api/tickets/checkin', {
                method: 'POST',
                body: { ticketId, eventId: selectedEventId }
            });

            setScanResult({ message: `<i class="fas fa-check-circle"></i> ${result.message || 'Valid Ticket'}`, type: 'success' });
            const latestStats = await authedFetch(`/api/checkin/stats/${selectedEventId}`);
            setStats(latestStats);

            // --- FIX #4: Immediately refresh history after a successful check-in ---
            await fetchHistory();

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
            {/* ... event selector and stats display ... (no changes here) */}
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
                       {/* ... scanner form ... (no changes here) */}
                       <div id="scan-result-display" className={`scan-result ${scanResult.type}`} dangerouslySetInnerHTML={{ __html: scanResult.message }}></div>
                        <form onSubmit={handleCheckin}>
                            <input type="text" id="ticket-id-input" placeholder="Scan ticket here..." value={ticketId} onChange={(e) => setTicketId(e.target.value)} autoFocus />
                            <button id="manual-checkin-btn" className="cta-button" type="submit" disabled={isLoading}>{isLoading ? 'Checking in...' : 'Manual Check-in'}</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* --- FIX #5: Add the JSX to display the live history feed --- */}
            {selectedEventId && (
                <div className="checkin-history-container glass">
                    <h2>Recent Check-ins</h2>
                    {history.length > 0 ? (
                        <ul className="history-list">
                            {history.map(ticket => (
                                <li key={ticket._id} className="history-item">
                                    <span className="name">
                                        {ticket.customerFirstName} {ticket.customerLastName}
                                    </span>
                                    <span className="time">
                                        Checked in at {new Date(ticket.checkedInAt).toLocaleTimeString()}
                                    </span>
                                    <span className="staff">
                                        by {ticket.checkedInBy ? `${ticket.checkedInBy.firstName} ${ticket.checkedInBy.lastName}` : 'N/A'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No check-ins recorded yet.</p>
                    )}
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

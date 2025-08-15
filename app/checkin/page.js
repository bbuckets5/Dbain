'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/modal'; // Import the new Modal component
import { useRouter } from 'next/navigation'; // Import the useRouter hook

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
                // Corrected endpoint to match your server
                const response = await fetch('/api/events');
                if (!response.ok) throw new Error('Could not fetch events.');
                const data = await response.json();
                setEvents(data);
                if (data.length === 0) {
                     showCustomAlert('No Events Found', 'There are no events available for you to manage.');
                }
            } catch (error) {
                console.error('Failed to fetch events', error);
                showCustomAlert('Error', 'Could not load event list. Please try again later.');
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
                const response = await fetch(`/api/checkin/stats/${selectedEventId}`);
                if (!response.ok) throw new Error('Failed to load stats');
                const data = await response.json();
                setStats(data);
                setScanResult({ message: '<i class="fas fa-qrcode"></i> Ready to scan', type: 'info' });
            } catch (error) {
                console.error('Failed to fetch stats', error);
                setStats(null);
                showCustomAlert('Error', 'Could not load stats for the selected event.');
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
            const response = await fetch('/api/tickets/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, eventId: selectedEventId })
            });
            const result = await response.json();
            if (response.ok) {
                setScanResult({ message: `<i class="fas fa-check-circle"></i> ${result.message || 'Valid Ticket'}`, type: 'success' });
                setStats(prevStats => ({ ...prevStats, checkedInCount: prevStats.checkedInCount + 1 }));
            } else {
                setScanResult({ message: `<i class="fas fa-times-circle"></i> ${result.message || 'Invalid Ticket'}`, type: 'error' });
                showCustomAlert('Check-in Failed', result.message);
            }
        } catch (error) {
            console.error('Check-in error:', error);
            setScanResult({ message: 'Network error during check-in', type: 'error' });
            showCustomAlert('Error', 'A network error occurred.');
        } finally {
            setTicketId('');
            setIsLoading(false);
            // Clear the message after a few seconds and set to ready state
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
                onClose={() => setModal({ isOpen: false, title: '', message: '' })} 
            />
        </>
    );
}
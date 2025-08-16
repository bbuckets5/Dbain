'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from './ActionsDropdown';

export default function ManageEventsTab() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/events'); 
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch events.');
            }
            const data = await response.json();
            setEvents(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleUpdateStatus = async (eventId, newStatus) => {
        try {
            const response = await fetch(`/api/submissions/${eventId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || `Failed to update status.`);
            }
            fetchEvents(); 
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    // --- NEW FUNCTION ADDED HERE ---
    const handleFinishEvent = async (eventId, eventName) => {
        if (!confirm(`Are you sure you want to mark "${eventName}" as completed? It will be removed from the homepage.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/events/${eventId}/finish`, {
                method: 'PATCH',
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to finish event.');
            }
            alert(result.message);
            fetchEvents(); // Refresh the events list
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    const handleEdit = (eventId) => {
        router.push(`/admin-dashboard/edit-event/${eventId}`);
    };

    const handleRefundEvent = async (eventId, eventName) => {
        // ... (This function remains unchanged)
    };
    
    const handleDeleteEvent = async (eventId, eventName) => {
        // ... (This function remains unchanged)
    };

    if (loading) return <p>Loading events...</p>;
    if (error) return <p className="error-msg">{error}</p>;

    return (
        <div className="admin-event-list">
            {events.length === 0 ? (
                <p>No event submissions found.</p>
            ) : (
                events.map(event => {
                    const dropdownActions = [];
                    if (event.status === 'pending') {
                        dropdownActions.push({
                            label: 'Deny',
                            onClick: () => handleUpdateStatus(event._id, 'denied'),
                            className: 'is-destructive' 
                        });
                    }
                    if (event.status === 'approved' && event.ticketsSold > 0) {
                        dropdownActions.push({
                            label: 'Refund Event',
                            onClick: () => handleRefundEvent(event._id, event.eventName),
                            className: 'is-destructive'
                        });
                    }
                    dropdownActions.push({
                        label: 'Delete Permanently',
                        onClick: () => handleDeleteEvent(event._id, event.eventName),
                        className: 'is-destructive'
                    });

                    return (
                        <div key={event._id} className="submission-card glass">
                            <h4>{event.eventName}</h4>
                            <p><strong>Submitter:</strong> {event.firstName} {event.lastName}</p>
                            <p><strong>Date:</strong> {new Date(event.eventDate).toLocaleDateString()}</p>
                            <p><strong>Tickets Sold:</strong> {event.ticketsSold} / {event.ticketCount}</p>
                            <p><strong>Status:</strong> <span className={`status-indicator status-${event.status}`}>{event.status}</span></p>
                            
                            <div className="submission-actions">
                                <button onClick={() => handleEdit(event._id)} className="cta-button edit-btn">Edit</button>

                                {event.status === 'pending' && (
                                    <button onClick={() => handleUpdateStatus(event._id, 'approved')} className="cta-button approve-btn">Approve</button>
                                )}
                                
                                {/* --- UPDATED "FINISH EVENT" BUTTON --- */}
                                {event.status === 'approved' && (
                                    <button onClick={() => handleFinishEvent(event._id, event.eventName)} className="cta-button">Finish Event</button>
                                )}

                                <ActionsDropdown actions={dropdownActions} />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from './ActionsDropdown';

// Helper function to automatically add the auth token to our requests
const authedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'An API error occurred.');
    }
    return data;
};

export default function ManageEventsTab() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await authedFetch('/api/submissions');
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
            await authedFetch(`/api/submissions/${eventId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            alert(`Event status updated to ${newStatus}.`);
            fetchEvents(); 
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleFinishEvent = async (eventId, eventName) => {
        if (!confirm(`Are you sure you want to mark "${eventName}" as finished?`)) return;
        try {
            await authedFetch(`/api/admin/events/${eventId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'finished' }),
            });
            alert(`Event "${eventName}" has been marked as finished.`);
            fetchEvents();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    const handleEdit = (eventId) => {
        router.push(`/admin-dashboard/edit-event/${eventId}`);
    };

    const handleRefundEvent = async (eventId, eventName) => {
        if (!confirm(`Are you sure you want to refund all tickets for "${eventName}"? This action cannot be undone.`)) return;
        try {
            const result = await authedFetch(`/api/refunds/event/${eventId}`, {
                method: 'POST',
            });
            alert(result.message);
            fetchEvents();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    const handleDeleteEvent = async (eventId, eventName) => {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${eventName}"? This will also delete all tickets sold and cannot be undone.`)) return;
        try {
            const result = await authedFetch(`/api/admin/events/${eventId}`, {
                method: 'DELETE',
            });
            alert(result.message);
            fetchEvents();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
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
                            label: 'Refund All Tickets',
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

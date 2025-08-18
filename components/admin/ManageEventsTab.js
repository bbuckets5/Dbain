'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from './ActionsDropdown';

// --- A helper function to automatically add the auth token to our requests ---
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
            // Now using our secure helper function
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
            const result = await authedFetch(`/api/submissions/${eventId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            alert(`Status updated successfully.`);
            fetchEvents(); 
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    const handleEdit = (eventId) => {
        router.push(`/admin-dashboard/edit-event/${eventId}`);
    };

    const handleDeleteEvent = async (eventId, eventName) => {
        if (!confirm(`Are you sure you want to permanently delete "${eventName}"? This will also delete all associated tickets and cannot be undone.`)) {
            return;
        }
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

    // The other functions can be filled out similarly
    const handleFinishEvent = async (eventId, eventName) => { /* Similar to above */ };
    const handleRefundEvent = async (eventId, eventName) => { /* Similar to above */ };

    if (loading) return <p>Loading events...</p>;
    if (error) return <p className="error-msg">{error}</p>;

    return (
        <div className="admin-event-list">
            {events.length === 0 ? (
                <p>No event submissions found.</p>
            ) : (
                events.map(event => (
                    <div key={event._id} className="submission-card glass">
                        <h4>{event.eventName}</h4>
                        <p><strong>Status:</strong> <span className={`status-indicator status-${event.status}`}>{event.status}</span></p>
                        {/* Other event details... */}
                        <div className="submission-actions">
                            <button onClick={() => handleEdit(event._id)} className="cta-button edit-btn">Edit</button>
                            {event.status === 'pending' && (
                                <button onClick={() => handleUpdateStatus(event._id, 'approved')} className="cta-button approve-btn">Approve</button>
                            )}
                            <button onClick={() => handleDeleteEvent(event._id, event.eventName)} className="cta-button is-destructive">Delete</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

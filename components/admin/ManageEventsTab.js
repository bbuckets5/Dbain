'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from './ActionsDropdown';
import { getLocalEventDate } from '@/lib/dateUtils';
import EventReport from '@/components/EventReport';
// --- FIX: The top-level import of 'html2pdf.js' is removed ---

// Helper: fetch with auth token
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
    if (!res.ok) throw new Error(data.message || 'An API error occurred.');
    return data;
};

export default function ManageEventsTab() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();
    const [isPrinting, setIsPrinting] = useState(false);
    const [reportData, setReportData] = useState(null);
    const reportRef = useRef();

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await authedFetch('/api/submissions');
            setEvents(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleDownloadReport = async (eventId, eventName) => {
        // --- FIX: Dynamically import the library inside the click handler ---
        const html2pdf = (await import('html2pdf.js')).default;
        
        if (isPrinting) return;
        setIsPrinting(true);
        try {
            const data = await authedFetch(`/api/events/${eventId}/report`);
            setReportData({ ...data, eventName: eventName });
        } catch (err) {
            alert(`Error fetching report data: ${err.message}`);
            setIsPrinting(false);
        }
    };

    useEffect(() => {
        const generatePdf = async () => {
            if (reportData && reportRef.current) {
                // --- FIX: Dynamically import here as well for this effect ---
                const html2pdf = (await import('html2pdf.js')).default;

                const options = {
                    filename: `${reportData.eventName.replace(/ /g, '_')}_Report.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
    
                html2pdf().from(reportRef.current).set(options).save().then(() => {
                    setReportData(null);
                    setIsPrinting(false);
                });
            }
        };
        generatePdf();
    }, [reportData]);

    const handleUpdateStatus = async (eventId, newStatus) => {
        try {
            await authedFetch(`/api/submissions/${eventId}/status`, {
                method: 'PATCH',
                body: { status: newStatus },
            });
            alert(`Event status updated to ${newStatus}.`);
            fetchEvents();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleFinishEvent = async (eventId, eventName) => {
        if (!confirm(`Mark "${eventName}" as finished?`)) return;
        try {
            await authedFetch(`/api/admin/events/${eventId}`, {
                method: 'PUT',
                body: { status: 'finished' },
            });
            alert(`Event "${eventName}" marked as finished.`);
            fetchEvents();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleEdit = (eventId) => {
        router.push(`/admin-dashboard/edit-event/${eventId}`);
    };

    const handleRefundEvent = async (eventId, eventName) => {
        if (!confirm(`Refund all tickets for "${eventName}"? This cannot be undone.`)) return;
        try {
            const result = await authedFetch(`/api/refunds/event/${eventId}`, { method: 'POST' });
            alert(result.message || 'Refund triggered.');
            fetchEvents();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleDeleteEvent = async (eventId, eventName) => {
        if (!confirm(`DELETE "${eventName}" permanently? Tickets will also be deleted.`)) return;
        try {
            const result = await authedFetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
            alert(result.message || 'Event deleted.');
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
                events.map((event) => {
                    const { shortDate, time } = getLocalEventDate(event);

                    const dropdownActions = [];
                    if (event.status === 'pending') {
                        dropdownActions.push({
                            label: 'Deny',
                            onClick: () => handleUpdateStatus(event._id, 'denied'),
                            className: 'is-destructive',
                        });
                    }
                    if (event.status === 'approved' && event.ticketsSold > 0) {
                        dropdownActions.push({
                            label: 'Refund All Tickets',
                            onClick: () => handleRefundEvent(event._id, event.eventName),
                            className: 'is-destructive',
                        });
                    }
                    dropdownActions.push({
                        label: 'Delete Permanently',
                        onClick: () => handleDeleteEvent(event._id, event.eventName),
                        className: 'is-destructive',
                    });

                    return (
                        <div key={event._id} className="submission-card glass">
                            <h4>{event.eventName}</h4>
                            <p><strong>Submitter:</strong> {event.firstName} {event.lastName}</p>
                            <p><strong>Date:</strong> {shortDate} at {time}</p>
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
                                
                                {event.status === 'finished' && (
                                    <button onClick={() => handleDownloadReport(event._id, event.eventName)} className="cta-button" disabled={isPrinting}>
                                        {isPrinting ? 'Generating...' : 'Download Report'}
                                    </button>
                                )}

                                <ActionsDropdown actions={dropdownActions} />
                            </div>
                        </div>
                    );
                })
            )}
            
            {reportData && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <EventReport ref={reportRef} reportData={reportData} />
                </div>
            )}
        </div>
    );
}

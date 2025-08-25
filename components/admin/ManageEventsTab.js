'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ActionsDropdown from './ActionsDropdown';
import { getLocalEventDate } from '@/lib/dateUtils';
import EventReport from '@/components/EventReport';

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
    
    // --- FIX: Add state for pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // --- FIX: Update fetchEvents to handle pages ---
    const fetchEvents = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authedFetch(`/api/submissions?page=${page}`);
            setEvents(data.events || []); // The API now returns an object with an 'events' array
            setCurrentPage(data.currentPage || 1);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents(1); // Fetch the first page on initial load
    }, []);

    const handleDownloadReport = async (eventId, eventName) => {
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
            fetchEvents(currentPage); // Refetch the current page after an update
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
            fetchEvents(currentPage); // Refetch the current page
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };
    
    // --- FIX: Add page change handler ---
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchEvents(newPage);
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
            fetchEvents(currentPage); // Refetch the current page
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleDeleteEvent = async (eventId, eventName) => {
        if (!confirm(`DELETE "${eventName}" permanently? Tickets will also be deleted.`)) return;
        try {
            const result = await authedFetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
            alert(result.message || 'Event deleted.');
            fetchEvents(1); // Go back to page 1 after deleting
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
            
            {/* --- FIX: Add pagination controls --- */}
            {!loading && totalPages > 1 && (
                <div className="pagination-controls">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage <= 1}
                        className="cta-button"
                    >
                        &larr; Previous
                    </button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage >= totalPages}
                        className="cta-button"
                    >
                        Next &rarr;
                    </button>
                </div>
            )}

            {reportData && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <EventReport ref={reportRef} reportData={reportData} />
                </div>
            )}
        </div>
    );
}

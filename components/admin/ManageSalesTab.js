// components/admin/ManageSalesTab.js

'use client';

import { useState, useEffect } from 'react';

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

export default function ManageSalesTab() {
    const [sales, setSales] = useState([]);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // --- NEW: Add state to track which ticket is being refunded ---
    const [refundingId, setRefundingId] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await authedFetch('/api/admin/events');
                setEvents(data);
            } catch (error) {
                console.error('Failed to fetch events for filter', error);
                setError('Could not load events for the filter.');
            }
        };
        fetchEvents();
    }, []);

    const fetchSales = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedEvent) params.append('eventId', selectedEvent);
            params.append('page', page);

            const data = await authedFetch(`/api/sales?${params.toString()}`);
            setSales(data.sales || []);
            setCurrentPage(data.currentPage || 1);
            setTotalPages(data.totalPages || 1);
        } catch (error) {
            console.error('Failed to fetch sales', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchSales(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, selectedEvent]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchSales(newPage);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedEvent('');
    };

    // --- NEW: Function to handle the refund process ---
    const handleRefund = async (ticketId) => {
        if (!window.confirm('Are you sure you want to refund this ticket? This action cannot be undone.')) {
            return;
        }

        setRefundingId(ticketId);
        try {
            await authedFetch(`/api/refunds/${ticketId}`, {
                method: 'POST',
            });

            // Update the UI instantly without a full refresh
            setSales(currentSales => 
                currentSales.map(sale => 
                    sale._id === ticketId ? { ...sale, status: 'refunded' } : sale
                )
            );
            alert('Ticket refunded successfully!');

        } catch (error) {
            console.error('Failed to refund ticket:', error);
            alert(`Refund failed: ${error.message}`);
        } finally {
            setRefundingId(null);
        }
    };


    return (
        <div id="manage-sales" className="admin-section glass">
            <h2>Manage Sales & Refunds</h2>
            <p>View all ticket sales and issue refunds.</p>

            <div className="sales-controls">
                <input 
                    type="search" 
                    id="sales-search-input" 
                    placeholder="Search by Ticket ID, Name, or Email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                    id="event-filter-select" 
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                >
                    <option value="">Filter by Event</option>
                    {events.map(event => (
                        <option key={event._id} value={event._id}>{event.eventName}</option>
                    ))}
                </select>
                <button id="clear-filters-btn" className="cta-button" onClick={handleClearFilters}>Clear</button>
            </div>

            <div id="sales-list-container">
                {loading && <p className="loading-message">Loading sales data...</p>}
                {error && <p className="error-msg">{error}</p>}
                {!loading && !error && sales.length === 0 ? (
                    <p className="empty-msg">No sales found matching your criteria.</p>
                ) : (
                    sales.map(sale => (
                        <div key={sale._id} className="sales-card glass">
                            <div className="sales-details">
                                <p><strong>Ticket ID:</strong> {sale._id}</p>
                                <p><strong>Event:</strong> {sale.eventId?.eventName || 'N/A'}</p>
                                <p><strong>Purchaser:</strong> {sale.userId ? `${sale.userId.firstName} ${sale.userId.lastName}` : `${sale.customerFirstName} ${sale.customerLastName} (Guest)`}</p>
                                <p><strong>Price:</strong> ${Number(sale.price).toFixed(2)}</p>
                                <p><strong>Status:</strong> <span className={`status-indicator status-${sale.status}`}>{sale.status}</span></p>
                            </div>
                            {/* --- MODIFIED: The sales actions div now contains the refund button logic --- */}
                            <div className="sales-actions">
                                {sale.status === 'valid' && (
                                    <button
                                        className="cta-button danger-btn"
                                        onClick={() => handleRefund(sale._id)}
                                        disabled={refundingId === sale._id}
                                    >
                                        {refundingId === sale._id ? 'Refunding...' : 'Refund Ticket'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!loading && !error && totalPages > 1 && (
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
        </div>
    );
}
// --- MODIFIED: The sales actions div now contains the refund button logic ---
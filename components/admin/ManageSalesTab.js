'use client';

import { useState, useEffect } from 'react';

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

export default function ManageSalesTab() {
    const [sales, setSales] = useState([]);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- FIX #2: Add state for pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch events for the filter dropdown
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // --- FIX #3: Use authedFetch to get events for the filter ---
                const data = await authedFetch('/api/admin/events');
                setEvents(data);
            } catch (error) {
                console.error('Failed to fetch events for filter', error);
                setError('Could not load events for the filter.'); // Show user-friendly error
            }
        };
        fetchEvents();
    }, []);

    // --- FIX #4: Update fetchSales to use authedFetch and handle pagination ---
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
            setError(error.message); // Show the actual error from authedFetch
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch sales data when filters or page change
    useEffect(() => {
        // Debounce search input
        const handler = setTimeout(() => {
            fetchSales(1); // Reset to page 1 on new search/filter
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, selectedEvent]);

    // --- FIX #5: Add page change handler ---
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage); // Optimistically update page number
            fetchSales(newPage);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedEvent('');
    };

    return (
        <div id="manage-sales" className="admin-section glass">
            <h2>Manage Sales & Refunds</h2>
            <p>View all ticket sales and issue refunds.</p>

            <div className="sales-controls">
                {/* ... input, select, and button elements ... (no changes needed here) */}
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
                            {/* ... sales details ... (no changes needed here) */}
                            <div className="sales-details">
                                <p><strong>Ticket ID:</strong> {sale._id}</p>
                                <p><strong>Event:</strong> {sale.eventId?.eventName || 'N/A'}</p>
                                <p><strong>Purchaser:</strong> {sale.userId ? `${sale.userId.firstName} ${sale.userId.lastName}` : `${sale.customerFirstName} ${sale.customerLastName} (Guest)`}</p>
                                <p><strong>Price:</strong> ${Number(sale.price).toFixed(2)}</p>
                                <p><strong>Status:</strong> <span className={`status-indicator status-${sale.status}`}>{sale.status}</span></p>
                            </div>
                            <div className="sales-actions">
                                {/* Add Resend and Refund button logic here if needed */}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* --- FIX #6: Add pagination controls to the UI --- */}
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
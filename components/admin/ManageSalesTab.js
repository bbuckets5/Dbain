'use client';

import { useState, useEffect } from 'react';

export default function ManageSalesTab() {
    const [sales, setSales] = useState([]);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEvent, setSelectedEvent] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch events for the filter dropdown
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch('/api/admin/events');
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error('Failed to fetch events for filter', error);
            }
        };
        fetchEvents();
    }, []);

    // Fetch sales data based on filters
    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedEvent) params.append('eventId', selectedEvent);
            
            try {
                const response = await fetch(`/api/sales?${params.toString()}`);
                const data = await response.json();
                setSales(data);
            } catch (error) {
                console.error('Failed to fetch sales', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, [searchTerm, selectedEvent]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedEvent('');
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
                {loading ? (
                    <p className="loading-message">Loading sales data...</p>
                ) : sales.length === 0 ? (
                    <p className="empty-msg">To view ticket sales, please search by Ticket ID, Name, or Email in the bar above.</p>
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
                            <div className="sales-actions">
                                {/* Add Resend and Refund button logic here if needed */}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
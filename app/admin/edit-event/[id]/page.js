'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch the specific event's data when the component loads
    useEffect(() => {
        if (!id) return;

        const fetchEventData = async () => {
            try {
                const response = await fetch(`/api/submissions/${id}`);
                if (!response.ok) throw new Error('Failed to fetch event data.');
                
                const eventData = await response.json();
                
                if (eventData.eventDate) {
                    eventData.eventDate = new Date(eventData.eventDate).toISOString().split('T')[0];
                }

                setFormData(eventData);
            } catch (err) {
                setMessage({ type: 'error', text: err.message });
            } finally {
                setLoading(false);
            }
        };
        fetchEventData();
    }, [id]);

    // Generic handler for simple form inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    // Specific handlers for the nested ticket types array
    const handleTicketTypeChange = (e, index) => {
        const { name, value } = e.target;
        const updatedTickets = [...formData.tickets];
        updatedTickets[index][name] = value;
        setFormData(prevData => ({ ...prevData, tickets: updatedTickets }));
    };

    const handleAddTicketType = () => {
        const newTickets = [...formData.tickets, { type: '', price: '', includes: '' }];
        setFormData(prevData => ({ ...prevData, tickets: newTickets }));
    };

    const handleRemoveTicketType = (index) => {
        if (formData.tickets.length <= 1) {
            alert("You must have at least one ticket type.");
            return;
        }
        const newTickets = [...formData.tickets];
        newTickets.splice(index, 1);
        setFormData(prevData => ({ ...prevData, tickets: newTickets }));
    };

    // --- FINAL handleSubmit FUNCTION ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            // We can send the formData state directly as JSON
            const response = await fetch(`/api/submissions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to update event.');
            }
            
            setMessage({ type: 'success', text: 'Event updated successfully! Redirecting...' });
            
            // Redirect back to the admin dashboard after a short delay
            setTimeout(() => {
                router.push('/admin-dashboard');
            }, 2000);

        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <p>Loading event data...</p>;
    if (message?.type === 'error') return <p className="error-msg">{message.text}</p>;
    if (!formData) return <p>No event data found.</p>;

    return (
        <div className="form-container glass">
            <h1 className="page-title">Edit Event: {formData.eventName}</h1>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="eventName">Event Name</label>
                    <input type="text" id="eventName" name="eventName" required value={formData.eventName || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="eventDate">Event Date</label>
                    <input type="date" id="eventDate" name="eventDate" required value={formData.eventDate || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="eventLocation">Event Location / Venue</label>
                    <input type="text" id="eventLocation" name="eventLocation" required value={formData.eventLocation || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="eventTime">Event Time</label>
                    <input type="time" id="eventTime" name="eventTime" required value={formData.eventTime || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="ticketCount">Total Number of Tickets to Sell</label>
                    <input type="number" id="ticketCount" name="ticketCount" min="0" required value={formData.ticketCount || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="eventDescription">Event Description</label>
                    <textarea id="eventDescription" name="eventDescription" rows="4" required value={formData.eventDescription || ''} onChange={handleChange}></textarea>
                </div>
                
                <div className="form-group">
                    <label>Define Ticket Types & Pricing</label>
                    <div id="ticket-types-wrapper">
                        {formData.tickets.map((ticket, index) => (
                            <div key={index} className="ticket-type-entry">
                                <input type="text" className="ticket-label" name="type" required value={ticket.type} onChange={(e) => handleTicketTypeChange(e, index)} />
                                <input type="number" className="ticket-price-input" name="price" step="0.01" required value={ticket.price} onChange={(e) => handleTicketTypeChange(e, index)} />
                                <textarea className="ticket-inclusions" name="includes" value={ticket.includes} onChange={(e) => handleTicketTypeChange(e, index)}></textarea>
                                <button type="button" className="remove-ticket-btn cta-button" onClick={() => handleRemoveTicketType(index)}>Remove</button>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="cta-button" onClick={handleAddTicketType}>Add Another Ticket Type</button>
                </div>

                {message && <p className={message.type === 'success' ? 'info-msg' : 'error-msg'}>{message.text}</p>}

                <div className="form-group">
                    <button type="submit" className="cta-button form-submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Event'}
                    </button>
                </div>
            </form>
        </div>
    );
}
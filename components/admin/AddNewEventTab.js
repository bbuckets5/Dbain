'use client';

import { useState } from 'react';

export default function AddNewEventTab({ onEventAdded }) {
    const [ticketTypes, setTicketTypes] = useState([{ label: '', price: '', includes: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const handleAddTicketType = () => {
        setTicketTypes([...ticketTypes, { label: '', price: '', includes: '' }]);
    };

    const handleRemoveTicketType = (index) => {
        if (ticketTypes.length > 1) {
            setTicketTypes(ticketTypes.filter((_, i) => i !== index));
        }
    };
    
    const handleTicketChange = (index, field, value) => {
        const newTicketTypes = [...ticketTypes];
        newTicketTypes[index][field] = value;
        setTicketTypes(newTicketTypes);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        const formData = new FormData(event.target);
        
        // Loop through the state and append each piece of ticket data correctly
        ticketTypes.forEach(ticket => {
            formData.append('ticket_type[]', ticket.label);
            formData.append('ticket_price[]', ticket.price);
            formData.append('ticket_includes[]', ticket.includes);
        });
        
        try {
            // --- FIX: Send to the ADMIN API, not the public one ---
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}` // We need to verify you are admin
                },
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Submission failed');
            
            setMessage({ type: 'success', text: 'Success! Event created and approved.' });
            event.target.reset(); 
            setTicketTypes([{ label: '', price: '', includes: '' }]); 
            
            if (onEventAdded) {
                setTimeout(() => onEventAdded(), 2000); 
            }

        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div id="add-new-event" className="admin-section glass">
            <h2>Add New Event Directly</h2>
            <p>Fill out the form below to add a new event directly to the system.</p>
            {message && <p className={message.type === 'error' ? 'error-msg' : 'info-msg'}>{message.text}</p>}
            <form id="add-event-form" className="admin-form" onSubmit={handleSubmit}>
                <div className="form-group"><label htmlFor="eventName">Event Name</label><input type="text" id="eventName" name="eventName" required /></div>
                <div className="form-group"><label htmlFor="eventDate">Event Date</label><input type="date" id="eventDate" name="eventDate" required /></div>
                <div className="form-group"><label htmlFor="eventTime">Event Time</label><input type="time" id="eventTime" name="eventTime" required /></div>
                <div className="form-group"><label htmlFor="eventLocation">Event Location / Venue</label><input type="text" id="eventLocation" name="eventLocation" required /></div>
                <div className="form-group"><label htmlFor="eventDescription">Event Description</label><textarea id="eventDescription" name="eventDescription" rows="4" required></textarea></div>
                
                <div className="form-group">
                    <label htmlFor="ticketCount">Total Tickets Available</label>
                    <input type="number" id="ticketCount" name="ticketCount" placeholder="e.g., 100" required />
                </div>
                
                <div className="form-group">
                    <label>Define Ticket Types & Pricing</label>
                    <div id="add-ticket-types-wrapper">
                        {ticketTypes.map((ticket, index) => (
                            <div key={index} className="ticket-type-entry">
                                <input type="text" className="ticket-label" placeholder="e.g., General Admission" required value={ticket.label} onChange={(e) => handleTicketChange(index, 'label', e.target.value)} />
                                <input type="number" className="ticket-price-input" placeholder="Price (e.g., 40.00)" min="0" step="0.01" required value={ticket.price} onChange={(e) => handleTicketChange(index, 'price', e.target.value)} />
                                <textarea className="ticket-inclusions" placeholder="What's included?" value={ticket.includes} onChange={(e) => handleTicketChange(index, 'includes', e.target.value)}></textarea>
                                {ticketTypes.length > 1 && <button type="button" className="remove-ticket-btn cta-button" onClick={() => handleRemoveTicketType(index)}>Remove</button>}
                            </div>
                        ))}
                    </div>
                    <button type="button" id="add-new-ticket-type-btn" className="cta-button" onClick={handleAddTicketType}>Add Another Ticket Type</button>
                </div>
                
                <div className="form-group"><label htmlFor="flyer">Event Flyer (JPG, PNG)</label><input type="file" id="flyer" name="flyer" accept=".jpg,.jpeg,.png" required /></div>
                <div className="form-group"><button type="submit" className="cta-button form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit New Event'}</button></div>
            </form>
        </div>
    );
}

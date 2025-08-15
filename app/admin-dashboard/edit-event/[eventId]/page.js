'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0];
};

export default function EditEventPage() {
    const { eventId } = useParams();
    const router = useRouter(); // Initialize router for redirection
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // State for submission
    const [message, setMessage] = useState(null); // State for success/error messages

    // State for each form field
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [ticketCount, setTicketCount] = useState(0);
    const [ticketTypes, setTicketTypes] = useState([{ label: '', price: '', includes: '' }]);
    const [currentFlyerUrl, setCurrentFlyerUrl] = useState('');
    
    useEffect(() => {
        if (!eventId) return;
        // Fetching logic remains the same
        const fetchEventData = async () => {
            try {
                const response = await fetch(`/api/admin/events/${eventId}`);
                if (!response.ok) throw new Error('Failed to fetch event data.');
                const data = await response.json();
                setEventName(data.eventName);
                setEventDate(formatDateForInput(data.eventDate));
                setEventTime(data.eventTime);
                setEventLocation(data.eventLocation);
                setEventDescription(data.eventDescription);
                setTicketCount(data.ticketCount);
                setTicketTypes(data.tickets && data.tickets.length > 0 ? data.tickets.map(t => ({ label: t.type, price: t.price, includes: t.includes })) : [{ label: '', price: '', includes: '' }]);
                setCurrentFlyerUrl(data.flyerImageThumbnailPath);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEventData();
    }, [eventId]);

    // ++ NEW: Updated submission logic ++
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        // We now get data from the controlled state, not directly from the form target,
        // because the controlled state is the single source of truth.
        const formData = new FormData();
        formData.append('eventName', eventName);
        formData.append('eventDate', eventDate);
        formData.append('eventTime', eventTime);
        formData.append('eventLocation', eventLocation);
        formData.append('eventDescription', eventDescription);
        formData.append('ticketCount', ticketCount);
        
        // Handle the file input separately
        const flyerInput = event.target.elements.flyer;
        if (flyerInput.files[0]) {
            formData.append('flyer', flyerInput.files[0]);
        }

        // Manually append ticket data from state
        ticketTypes.forEach(ticket => {
            formData.append('ticket_type[]', ticket.label);
            formData.append('ticket_price[]', ticket.price);
            formData.append('ticket_includes[]', ticket.includes);
        });

        try {
            const response = await fetch(`/api/admin/events/${eventId}`, {
                method: 'PUT',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to update event.');
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

    // Helper functions for ticket types remain the same
    const handleAddTicketType = () => setTicketTypes([...ticketTypes, { label: '', price: '', includes: '' }]);
    const handleRemoveTicketType = (index) => { if (ticketTypes.length > 1) setTicketTypes(ticketTypes.filter((_, i) => i !== index)); };
    const handleTicketChange = (index, field, value) => {
        const newTicketTypes = [...ticketTypes];
        newTicketTypes[index][field] = value;
        setTicketTypes(newTicketTypes);
    };

    if (loading) return <main className="main-content"><h1>Loading Event...</h1></main>;
    if (error) return <main className="main-content"><h1>Error</h1><p className="error-msg">{error}</p></main>;

    return (
        <main className="main-content">
            <h1>Edit Event: {eventName}</h1>
            <div className="form-container glass">
                {message && <p className={message.type === 'error' ? 'error-msg' : 'info-msg'}>{message.text}</p>}

                <form className="admin-form" onSubmit={handleSubmit}>
                    <div className="form-group"><label htmlFor="eventName">Event Name</label><input type="text" id="eventName" name="eventName" value={eventName} onChange={(e) => setEventName(e.target.value)} required /></div>
                    <div className="form-group"><label htmlFor="eventDate">Event Date</label><input type="date" id="eventDate" name="eventDate" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></div>
                    <div className="form-group"><label htmlFor="eventTime">Event Time</label><input type="time" id="eventTime" name="eventTime" value={eventTime} onChange={(e) => setEventTime(e.target.value)} required /></div>
                    <div className="form-group"><label htmlFor="eventLocation">Event Location / Venue</label><input type="text" id="eventLocation" name="eventLocation" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required /></div>
                    <div className="form-group"><label htmlFor="eventDescription">Event Description</label><textarea id="eventDescription" name="eventDescription" rows="4" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} required></textarea></div>
                    <div className="form-group"><label htmlFor="ticketCount">Total Tickets Available</label><input type="number" id="ticketCount" name="ticketCount" value={ticketCount} onChange={(e) => setTicketCount(e.target.value)} required /></div>
                    <div className="form-group">
                        <label>Define Ticket Types & Pricing</label>
                        <div id="add-ticket-types-wrapper">{ticketTypes.map((ticket, index) => (<div key={index} className="ticket-type-entry"><input type="text" className="ticket-label" placeholder="e.g., General Admission" required value={ticket.label} onChange={(e) => handleTicketChange(index, 'label', e.target.value)} /><input type="number" className="ticket-price-input" placeholder="Price (e.g., 40.00)" min="0" step="0.01" required value={ticket.price} onChange={(e) => handleTicketChange(index, 'price', e.target.value)} /><textarea className="ticket-inclusions" placeholder="What's included?" value={ticket.includes} onChange={(e) => handleTicketChange(index, 'includes', e.target.value)}></textarea>{ticketTypes.length > 1 && <button type="button" className="remove-ticket-btn cta-button" onClick={() => handleRemoveTicketType(index)}>Remove</button>}</div>))}</div>
                        <button type="button" id="add-new-ticket-type-btn" className="cta-button" onClick={handleAddTicketType}>Add Another Ticket Type</button>
                    </div>
                    {currentFlyerUrl && (<div className="form-group"><label>Current Flyer</label><img src={currentFlyerUrl} alt="Current event flyer" style={{ maxWidth: '200px', height: 'auto', borderRadius: '8px', display: 'block' }} /></div>)}
                    <div className="form-group"><label htmlFor="flyer">Upload New Flyer (Optional: Replaces current flyer)</label><input type="file" id="flyer" name="flyer" accept=".jpg,.jpeg,.png" /></div>
                    <div className="form-group">
                        <button type="submit" className="cta-button form-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Cleave from 'cleave.js/react';

// --- FIX: Add our standard authenticated fetch helper ---
const authedFetch = async (url, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
        // When using FormData, we DO NOT set Content-Type. The browser does it.
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // If body is a plain object, stringify it. Otherwise, use it as-is (for FormData).
    const body = options.body instanceof FormData || typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);

    const res = await fetch(url, { ...options, headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || 'An API error occurred.');
    }
    return data;
};


const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    // Adjust for timezone offset to prevent off-by-one-day errors in the input
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - timezoneOffset);
    return adjustedDate.toISOString().split('T')[0];
};

export default function EditEventPage() {
    const { eventId } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [ticketCount, setTicketCount] = useState(0);
    // --- FIX: Renamed 'label' to 'type' to match the database schema ---
    const [ticketTypes, setTicketTypes] = useState([{ type: '', price: '', includes: '' }]);
    const [currentFlyerUrl, setCurrentFlyerUrl] = useState('');
    
    useEffect(() => {
        if (!eventId) return;
        const fetchEventData = async () => {
            try {
                // --- FIX: Use authedFetch to load event data securely ---
                const data = await authedFetch(`/api/admin/events/${eventId}`);
                
                setEventName(data.eventName);
                setEventDate(formatDateForInput(data.eventDate));
                setEventTime(data.eventTime);
                setEventLocation(data.eventLocation);
                setEventDescription(data.eventDescription);
                setTicketCount(data.ticketCount);
                setTicketTypes(data.tickets && data.tickets.length > 0 ? data.tickets : [{ type: '', price: '', includes: '' }]);
                setCurrentFlyerUrl(data.flyerImageThumbnailPath);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEventData();
    }, [eventId]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('eventName', eventName);
        formData.append('eventDate', eventDate);
        formData.append('eventTime', eventTime);
        formData.append('eventLocation', eventLocation);
        formData.append('eventDescription', eventDescription);
        formData.append('ticketCount', ticketCount);
        
        const flyerInput = event.target.elements.flyer;
        if (flyerInput.files[0]) {
            formData.append('flyer', flyerInput.files[0]);
        }

        ticketTypes.forEach(ticket => {
            formData.append('ticket_type[]', ticket.type);
            formData.append('ticket_price[]', ticket.price);
            formData.append('ticket_includes[]', ticket.includes);
        });

        try {
            // --- FIX: Use authedFetch to submit the form securely ---
            await authedFetch(`/api/admin/events/${eventId}`, {
                method: 'PUT',
                body: formData,
            });

            setMessage({ type: 'success', text: 'Event updated successfully! Redirecting...' });

            setTimeout(() => {
                router.push('/admin-dashboard');
            }, 2000);

        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTicketType = () => setTicketTypes([...ticketTypes, { type: '', price: '', includes: '' }]);
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
                        <div id="add-ticket-types-wrapper">{ticketTypes.map((ticket, index) => (<div key={index} className="ticket-type-entry"><input type="text" className="ticket-label" placeholder="e.g., General Admission" required value={ticket.type} onChange={(e) => handleTicketChange(index, 'type', e.target.value)} /><input type="number" className="ticket-price-input" placeholder="Price (e.g., 40.00)" min="0" step="0.01" required value={ticket.price} onChange={(e) => handleTicketChange(index, 'price', e.target.value)} /><textarea className="ticket-inclusions" placeholder="What's included?" value={ticket.includes} onChange={(e) => handleTicketChange(index, 'includes', e.target.value)}></textarea>{ticketTypes.length > 1 && <button type="button" className="remove-ticket-btn cta-button" onClick={() => handleRemoveTicketType(index)}>Remove</button>}</div>))}</div>
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

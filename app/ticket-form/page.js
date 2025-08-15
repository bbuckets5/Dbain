'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';

export default function TicketFormPage() {
    // State for all form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [phone, setPhone] = useState('');
    const [ticketCount, setTicketCount] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [flyer, setFlyer] = useState(null);
    const [ticketTypes, setTicketTypes] = useState([{ type: '', price: '', includes: '' }]);
    
    // State for loading and messages
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // --- HANDLER FUNCTIONS ---
    const handleTicketTypeChange = (e, index) => {
        const { name, value } = e.target;
        const list = [...ticketTypes];
        list[index][name] = value;
        setTicketTypes(list);
    };

    const handleAddTicketType = () => {
        setTicketTypes([...ticketTypes, { type: '', price: '', includes: '' }]);
    };

    const handleRemoveTicketType = (index) => {
        if (ticketTypes.length <= 1) {
            alert("You must define at least one ticket type.");
            return;
        }
        const list = [...ticketTypes];
        list.splice(index, 1);
        setTicketTypes(list);
    };
    
    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setBusinessName('');
        setEventName('');
        setEventDate('');
        setEventLocation('');
        setEventTime('');
        setPhone('');
        setTicketCount('');
        setEventDescription('');
        setFlyer(null);
        setTicketTypes([{ type: '', price: '', includes: '' }]);
        document.getElementById('event-submission-form').reset();
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        if (!flyer) {
            alert("Please select an event flyer.");
            setIsLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('businessName', businessName);
        formData.append('eventName', eventName);
        formData.append('eventDate', eventDate);
        formData.append('eventLocation', eventLocation);
        formData.append('eventTime', eventTime);
        formData.append('phone', phone);
        formData.append('ticketCount', ticketCount);
        formData.append('eventDescription', eventDescription);

        ticketTypes.forEach(ticket => {
            formData.append('ticket_type[]', ticket.type);
            formData.append('ticket_price[]', ticket.price);
            formData.append('ticket_includes[]', ticket.includes);
        });

        const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        try {
            const compressedFile = await imageCompression(flyer, options);
            formData.append('flyer', compressedFile, compressedFile.name);

            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Something went wrong');
            }
            
            setMessage({ type: 'success', text: result.message });
            resetForm();

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <h1 className="page-title">Ticket Your Event</h1>
            <p className="form-description">Fill out the form below to get your event listed.</p>

            <div className="form-container glass">
                
                <form id="event-submission-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input type="text" id="firstName" name="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input type="text" id="lastName" name="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="businessName">Business Name</label>
                        <input type="text" id="businessName" name="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventName">Event Name</label>
                        <input type="text" id="eventName" name="eventName" required value={eventName} onChange={(e) => setEventName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventDate">Event Date</label>
                        <input type="date" id="eventDate" name="eventDate" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventLocation">Event Location / Venue</label>
                        <input type="text" id="eventLocation" name="eventLocation" placeholder="e.g., Grand Park" required value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventTime">Event Time</label>
                        <input type="time" id="eventTime" name="eventTime" required value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Telephone Contact</label>
                        <input type="tel" id="phone" name="phone" placeholder="(123) 456-7890" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="ticketCount">Total Number of Tickets to Sell</label>
                        <input type="number" id="ticketCount" name="ticketCount" min="0" required value={ticketCount} onChange={(e) => setTicketCount(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventDescription">Event Description</label>
                        <textarea id="eventDescription" name="eventDescription" rows="4" placeholder="Describe your event..." required value={eventDescription} onChange={(e) => setEventDescription(e.target.value)}></textarea>
                    </div>

                    <div className="form-group">
                        <label>Define Ticket Types & Pricing</label>
                        <div id="ticket-types-wrapper">
                            {ticketTypes.map((ticket, index) => (
                                <div key={index} className="ticket-type-entry">
                                    <input type="text" className="ticket-label" name="type" placeholder="e.g., General Admission" required value={ticket.type} onChange={(e) => handleTicketTypeChange(e, index)} />
                                    <input type="number" className="ticket-price-input" name="price" placeholder="e.g., 40.00" step="0.01" required value={ticket.price} onChange={(e) => handleTicketTypeChange(e, index)} />
                                    <textarea className="ticket-inclusions" name="includes" placeholder="What's included?" value={ticket.includes} onChange={(e) => handleTicketTypeChange(e, index)}></textarea>
                                    <button type="button" className="remove-ticket-btn cta-button" onClick={() => handleRemoveTicketType(index)}>Remove</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" id="add-ticket-type" className="cta-button" onClick={handleAddTicketType}>Add Another Ticket Type</button>
                    </div>

                    <div className="form-group">
                        <label htmlFor="flyer">Event Flyer/Image (JPG, PNG)</label>
                        <input type="file" id="flyer" name="flyer" accept=".jpg,.jpeg,.png" required onChange={(e) => setFlyer(e.target.files[0])} />
                        <small>Accepted formats: JPG, PNG. Max size: 6MB.</small>
                    </div>

                    {message && (
                        <div className={`form-message ${message.type === 'error' ? 'error-msg' : 'info-msg'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="form-group">
                        <button type="submit" className="cta-button form-submit-btn" disabled={isLoading}>
                            {isLoading ? 'Processing...' : 'Submit Event'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
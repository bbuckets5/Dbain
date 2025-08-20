'use client';

import 'cleave.js/dist/addons/cleave-phone.us';
import { useState } from 'react';
import Link from 'next/link';
import Cleave from 'cleave.js/react'; // For phone number formatting

const initialFormState = {
    firstName: '',
    lastName: '',
    businessName: '',
    submitterEmail: '',
    eventName: '',
    eventDate: '',
    eventLocation: '',
    eventTime: '',
    phone: '',
    ticketCount: '',
    eventDescription: '',
    ticketTypes: [{ type: '', price: '', includes: '' }],
};

export default function TicketFormPage() {
    const [formState, setFormState] = useState(initialFormState);
    const [flyer, setFlyer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleTicketTypeChange = (e, index) => {
        const { name, value } = e.target;
        const list = [...formState.ticketTypes];
        list[index][name] = value;
        setFormState(prev => ({ ...prev, ticketTypes: list }));
    };

    const handleAddTicketType = () => {
        setFormState(prev => ({
            ...prev,
            ticketTypes: [...prev.ticketTypes, { type: '', price: '', includes: '' }]
        }));
    };

    const handleRemoveTicketType = (index) => {
        if (formState.ticketTypes.length <= 1) return;
        const list = [...formState.ticketTypes];
        list.splice(index, 1);
        setFormState(prev => ({ ...prev, ticketTypes: list }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        if (!flyer) {
            setMessage({ type: 'error', text: 'Please select an event flyer.' });
            setIsLoading(false);
            return;
        }

        // 1. Create a FormData object
        const formData = new FormData();

        // 2. Add all the text fields from your form state
        for (const key in formState) {
            if (key !== 'ticketTypes') {
                formData.append(key, formState[key]);
            }
        }

        // 3. Add the ticket types correctly for the backend
        formState.ticketTypes.forEach(ticket => {
            formData.append('ticket_type[]', ticket.type);
            formData.append('ticket_price[]', ticket.price);
            formData.append('ticket_includes[]', ticket.includes);
        });

        // 4. Add the flyer file
        formData.append('flyer', flyer);

        try {
            // 5. Send the FormData to your API
            //    DO NOT set the 'Content-Type' header, the browser does it for you.
            const submitResponse = await fetch('/api/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await submitResponse.json();
            if (!submitResponse.ok) {
                throw new Error(result.message || 'An unknown error occurred.');
            }

            setMessage({ type: 'success', text: 'Event submitted successfully! It is now pending approval.' });
            setFormState(initialFormState);
            setFlyer(null);
            document.getElementById('event-submission-form').reset();

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
                        <input type="text" id="firstName" name="firstName" required value={formState.firstName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input type="text" id="lastName" name="lastName" required value={formState.lastName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="businessName">Business Name</label>
                        <input type="text" id="businessName" name="businessName" value={formState.businessName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="submitterEmail">Your Email Address (for notifications)</label>
                        <input type="email" id="submitterEmail" name="submitterEmail" required value={formState.submitterEmail} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventName">Event Name</label>
                        <input type="text" id="eventName" name="eventName" required value={formState.eventName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventDate">Event Date</label>
                        <input type="date" id="eventDate" name="eventDate" required value={formState.eventDate} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventLocation">Event Location / Venue</label>
                        <input type="text" id="eventLocation" name="eventLocation" placeholder="e.g., Grand Park" required value={formState.eventLocation} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventTime">Event Time</label>
                        <input type="time" id="eventTime" name="eventTime" required value={formState.eventTime} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Telephone Contact</label>
                        <Cleave 
                            id="phone" 
                            name="phone" 
                            value={formState.phone} 
                            onChange={handleInputChange} 
                            options={{ phone: true, phoneRegionCode: 'US' }} 
                            placeholder="(123) 456-7890"
                            className="your-input-class-name"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="ticketCount">Total Number of Tickets to Sell</label>
                        <input type="number" id="ticketCount" name="ticketCount" min="0" required value={formState.ticketCount} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="eventDescription">Event Description</label>
                        <textarea id="eventDescription" name="eventDescription" rows="4" placeholder="Describe your event..." required value={formState.eventDescription} onChange={handleInputChange}></textarea>
                    </div>
                    <div className="form-group">
                        <label>Define Ticket Types & Pricing</label>
                        <div id="ticket-types-wrapper">
                            {formState.ticketTypes.map((ticket, index) => (
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

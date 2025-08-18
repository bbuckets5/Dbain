'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import Link from 'next/link'; // Import Link if you need it

// A single state object is cleaner than many individual useState hooks
const initialFormState = {
    firstName: '',
    lastName: '',
    businessName: '',
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

        try {
            // 1. Prepare parameters for the signature
            const paramsToSign = {
                timestamp: Math.round(new Date().getTime() / 1000),
                folder: 'event-flyers',
            };
            
            // 2. Get the secure signature from our API (CORRECTED to POST)
            const signResponse = await fetch('/api/sign-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paramsToSign }),
            });
            if (!signResponse.ok) throw new Error('Could not get upload signature.');
            const signData = await signResponse.json();

            // 3. Prepare FormData for a direct upload to Cloudinary
            const uploadFormData = new FormData();
            uploadFormData.append('file', flyer);
            uploadFormData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
            uploadFormData.append('timestamp', paramsToSign.timestamp);
            uploadFormData.append('signature', signData.signature);
            uploadFormData.append('folder', 'event-flyers');

            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
            
            const uploadResponse = await fetch(cloudinaryUrl, {
                method: 'POST',
                body: uploadFormData,
            });
            
            if (!uploadResponse.ok) throw new Error('Failed to upload flyer to Cloudinary.');
            const uploadData = await uploadResponse.json();

            // 4. Now, submit the event details to our own API
            const eventPayload = {
                ...formState,
                flyerPublicId: uploadData.public_id,   // This is now guaranteed to exist
                flyerSecureUrl: uploadData.secure_url,
            };

            const submitResponse = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventPayload),
            });
            
            const result = await submitResponse.json();
            if (!submitResponse.ok) throw new Error(result.message || 'Failed to submit event details.');

            setMessage({ type: 'success', text: 'Event submitted successfully! It is now pending approval.' });
            setFormState(initialFormState); // Reset the form
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
                    {/* Simplified input fields to use the single formState object */}
                    <input type="text" name="firstName" required value={formState.firstName} onChange={handleInputChange} placeholder="First Name"/>
                    <input type="text" name="lastName" required value={formState.lastName} onChange={handleInputChange} placeholder="Last Name" />
                    {/* ... other form inputs ... */}
                    {formState.ticketTypes.map((ticket, index) => (
                        <div key={index} className="ticket-type-entry">
                            <input type="text" name="type" placeholder="e.g., General Admission" required value={ticket.type} onChange={(e) => handleTicketTypeChange(e, index)} />
                            <input type="number" name="price" placeholder="e.g., 40.00" step="0.01" required value={ticket.price} onChange={(e) => handleTicketTypeChange(e, index)} />
                            <textarea name="includes" placeholder="What's included?" value={ticket.includes} onChange={(e) => handleTicketTypeChange(e, index)}></textarea>
                            <button type="button" onClick={() => handleRemoveTicketType(index)}>Remove</button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddTicketType}>Add Another Ticket Type</button>
                    <input type="file" name="flyer" accept=".jpg,.jpeg,.png" required onChange={(e) => setFlyer(e.target.files[0])} />
                    {/* ... message and submit button ... */}
                     {message && (
                        <div className={`form-message ${message.type === 'error' ? 'error-msg' : 'info-msg'}`}>
                            {message.text}
                        </div>
                    )}
                    <button type="submit" disabled={isLoading}>{isLoading ? 'Processing...' : 'Submit Event'}</button>
                </form>
            </div>
        </>
    );
}
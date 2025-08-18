'use client';

import { useState } from 'react';
import Link from 'next/link';

// Using a single state object is cleaner
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
            
            // 2. Get the secure signature from our API using the correct POST method
            const signResponse = await fetch('/api/sign-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paramsToSign }),
            });
            if (!signResponse.ok) throw new Error('Could not get upload signature from server.');
            const signData = await signResponse.json();

            // 3. Prepare FormData for the direct upload to Cloudinary
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

            // 4. Submit the final event details to our own API
            const eventPayload = {
                ...formState,
                flyerPublicId: uploadData.public_id,   // This ID is now guaranteed to exist
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
            setFormState(initialFormState);
            setFlyer(null);
            document.getElementById('event-submission-form').reset();

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // The rest of your JSX form goes here...
    return (
        <form id="event-submission-form" onSubmit={handleSubmit}>
            {/* Remember to fill in all your form inputs here */}
        </form>
    );
}

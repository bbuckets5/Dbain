'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function EditEventPage() {
    return (
        <div className="container">
            <Header />

            <main className="main-content">
                <h1>Edit Event</h1>
                <p className="form-description">Update the event details below.</p>

                <div className="form-container glass">
                    <div id="form-message-container" className="hidden"></div>
                    <form id="edit-event-form">
                        <div className="form-group">
                            <label htmlFor="eventName">Event Name</label>
                            <input type="text" id="eventName" name="eventName" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="eventDate">Event Date</label>
                            <input type="date" id="eventDate" name="eventDate" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="eventTime">Event Time</label>
                            <input type="time" id="eventTime" name="eventTime" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="eventLocation">Event Location / Venue</label>
                            <input type="text" id="eventLocation" name="eventLocation" required />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ticketCount">Total Number of Tickets to Sell</label>
                            <input type="number" id="ticketCount" name="ticketCount" min="1" required />
                        </div>

                        <div className="form-group">
                            <label htmlFor="eventDescription">Event Description</label>
                            <textarea id="eventDescription" name="eventDescription" rows="4" required></textarea>
                        </div>

                        <div className="form-group">
                            <label>Define Ticket Types & Pricing</label>
                            <div id="ticket-types-wrapper">
                            </div>
                            <button type="button" id="add-ticket-type" className="cta-button">Add Another Ticket Type</button>
                        </div>

                        <div className="form-group">
                            <label htmlFor="flyer">Event Flyer</label>
                            <input type="file" id="flyer" name="flyer" accept="image/*" />
                            <small>Upload a new image to change. Accepted formats: JPG, PNG.</small>
                            <div id="current-flyer-preview" style={{ marginTop: '10px' }}>
                                <img id="flyer-preview-img" src="" alt="Current Event Flyer" style={{ maxWidth: '200px', display: 'none' }} />
                                <p id="no-flyer-msg" style={{ display: 'none', color: 'gray' }}>No flyer currently uploaded.</p>
                            </div>
                            <div className="checkbox-group" style={{ marginTop: '10px' }}>
                                <input type="checkbox" id="remove-flyer-checkbox" />
                                <label htmlFor="remove-flyer-checkbox">Remove Current Flyer</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <button type="submit" id="edit-event-submit-btn" className="cta-button form-submit-btn">Update Event</button>
                        </div>
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    );
}
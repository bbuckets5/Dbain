'use client';

import { useState, useMemo } from 'react';

export default function AddNewEventTab({ onEventAdded }) {
    // Standard GA State
    const [ticketTypes, setTicketTypes] = useState([{ label: '', price: '', includes: '' }]);
    
    // Reserved Seating State
    const [isReservedSeating, setIsReservedSeating] = useState(false);
    const [sections, setSections] = useState([
        { id: Date.now(), name: 'Main Floor', rows: [{ id: Date.now() + 1, label: 'A', count: 10, price: 50 }] }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    // --- GA Handlers ---
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

    // --- Reserved Seating Handlers ---
    const handleAddSection = () => {
        setSections([...sections, { 
            id: Date.now(), 
            name: `Section ${sections.length + 1}`, 
            rows: [{ id: Date.now() + 1, label: 'A', count: 10, price: 50 }] 
        }]);
    };

    const handleRemoveSection = (sectionIndex) => {
        if (sections.length > 1) {
            setSections(sections.filter((_, i) => i !== sectionIndex));
        }
    };

    const handleSectionNameChange = (index, value) => {
        const newSections = [...sections];
        newSections[index].name = value;
        setSections(newSections);
    };

    const handleAddRow = (sectionIndex) => {
        const newSections = [...sections];
        // Auto-predict next row label (A -> B, B -> C)
        const lastRowLabel = newSections[sectionIndex].rows[newSections[sectionIndex].rows.length - 1]?.label || 'A';
        const nextLabel = String.fromCharCode(lastRowLabel.charCodeAt(0) + 1);
        
        newSections[sectionIndex].rows.push({ id: Date.now(), label: nextLabel, count: 10, price: 50 });
        setSections(newSections);
    };

    const handleRemoveRow = (sectionIndex, rowIndex) => {
        const newSections = [...sections];
        if (newSections[sectionIndex].rows.length > 1) {
            newSections[sectionIndex].rows.splice(rowIndex, 1);
            setSections(newSections);
        }
    };

    const handleRowChange = (sectionIndex, rowIndex, field, value) => {
        const newSections = [...sections];
        newSections[sectionIndex].rows[rowIndex][field] = value;
        setSections(newSections);
    };

    // Calculate total tickets dynamically for Reserved Seating
    const totalReservedSeats = useMemo(() => {
        return sections.reduce((total, section) => {
            return total + section.rows.reduce((sectionTotal, row) => sectionTotal + parseInt(row.count || 0), 0);
        }, 0);
    }, [sections]);

    // --- Submission ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        const formData = new FormData(event.target);
        
        // Append the toggle status
        formData.append('isReservedSeating', isReservedSeating);

        if (isReservedSeating) {
            // 1. Calculate and append total tickets automatically
            formData.set('ticketCount', totalReservedSeats);

            // 2. Generate the massive array of individual seat objects
            const generatedSeats = [];
            
            sections.forEach(section => {
                section.rows.forEach(row => {
                    const rowPrice = parseFloat(row.price);
                    const seatCount = parseInt(row.count);
                    
                    for (let i = 1; i <= seatCount; i++) {
                        generatedSeats.push({
                            section: section.name,
                            row: row.label,
                            number: i.toString(),
                            price: rowPrice,
                            status: 'available'
                        });
                    }
                });
            });

            // Send as a JSON string because FormData can't handle complex arrays of objects easily
            formData.append('seats_config', JSON.stringify(generatedSeats));

        } else {
            // Standard GA Logic
            ticketTypes.forEach(ticket => {
                formData.append('ticket_type[]', ticket.label);
                formData.append('ticket_price[]', ticket.price);
                formData.append('ticket_includes[]', ticket.includes);
            });
        }
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Submission failed');
            
            setMessage({ type: 'success', text: 'Success! Event created and approved.' });
            event.target.reset(); 
            // Reset States
            setTicketTypes([{ label: '', price: '', includes: '' }]); 
            setIsReservedSeating(false);
            setSections([{ id: Date.now(), name: 'Main Floor', rows: [{ id: Date.now() + 1, label: 'A', count: 10, price: 50 }] }]);
            
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
                
                {/* --- TOGGLE SWITCH --- */}
                <div className="form-group" style={{ margin: '20px 0', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                        <input 
                            type="checkbox" 
                            checked={isReservedSeating} 
                            onChange={(e) => setIsReservedSeating(e.target.checked)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Enable Reserved Seating (Seat Map)</span>
                    </label>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '5px' }}>
                        {isReservedSeating 
                            ? "Attendees will pick specific seats from a map. You will define sections and rows." 
                            : "Standard General Admission. Attendees just buy a ticket type."}
                    </p>
                </div>

                {/* --- CONDITIONAL UI --- */}
                {!isReservedSeating ? (
                    // STANDARD GENERAL ADMISSION UI
                    <>
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
                    </>
                ) : (
                    // RESERVED SEATING BUILDER UI
                    <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                        <label>Build Seating Chart</label>
                        <p style={{marginBottom: '10px'}}>Define your sections and rows. The system will generate individual seats automatically.</p>
                        
                        {sections.map((section, sIndex) => (
                            <div key={section.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <input 
                                        type="text" 
                                        value={section.name} 
                                        onChange={(e) => handleSectionNameChange(sIndex, e.target.value)}
                                        placeholder="Section Name (e.g. Orchestra)"
                                        style={{ fontWeight: 'bold', width: '70%' }}
                                    />
                                    {sections.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveSection(sIndex)} className="cta-button" style={{ background: '#ff4444', fontSize: '0.8rem' }}>Delete Section</button>
                                    )}
                                </div>

                                {section.rows.map((row, rIndex) => (
                                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: '0.7rem'}}>Row Label</span>
                                            <input type="text" value={row.label} onChange={(e) => handleRowChange(sIndex, rIndex, 'label', e.target.value)} placeholder="A" />
                                        </div>
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: '0.7rem'}}>Seat Count</span>
                                            <input type="number" value={row.count} onChange={(e) => handleRowChange(sIndex, rIndex, 'count', e.target.value)} placeholder="10" />
                                        </div>
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: '0.7rem'}}>Price ($)</span>
                                            <input type="number" value={row.price} onChange={(e) => handleRowChange(sIndex, rIndex, 'price', e.target.value)} placeholder="50" />
                                        </div>
                                        {section.rows.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveRow(sIndex, rIndex)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', marginTop: '15px' }}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => handleAddRow(sIndex)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '5px 10px', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add Row</button>
                            </div>
                        ))}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <button type="button" onClick={handleAddSection} className="cta-button" style={{ background: '#28a745' }}>+ Add Section</button>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00d4ff' }}>
                                Total Seats: {totalReservedSeats}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="form-group"><label htmlFor="flyer">Event Flyer (JPG, PNG)</label><input type="file" id="flyer" name="flyer" accept=".jpg,.jpeg,.png" required /></div>
                <div className="form-group"><button type="submit" className="cta-button form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit New Event'}</button></div>
            </form>
        </div>
    );
}

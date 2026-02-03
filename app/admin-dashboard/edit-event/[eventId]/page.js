'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';

// --- Helper: Authenticated Fetch ---
const authedFetch = async (url, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const body = options.body instanceof FormData || typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);

    const res = await fetch(url, { ...options, headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'An API error occurred.');
    return data;
};

const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - timezoneOffset);
    return adjustedDate.toISOString().split('T')[0];
};

export default function EditEventPage({ params }) {
    // Unwrap params for Next.js 15
    const resolvedParams = use(params);
    const eventId = resolvedParams.eventId;

    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    // Basic Fields
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [currentFlyerUrl, setCurrentFlyerUrl] = useState('');

    // --- Mode Toggle ---
    const [isReservedSeating, setIsReservedSeating] = useState(false);

    // --- General Admission Data ---
    const [ticketCount, setTicketCount] = useState(0);
    const [ticketTypes, setTicketTypes] = useState([{ type: '', price: '', includes: '' }]);

    // --- Reserved Seating Data ---
    const [sections, setSections] = useState([]);

    // --- 1. Fetch Data on Load ---
    useEffect(() => {
        if (!eventId) return;
        const fetchEventData = async () => {
            try {
                const data = await authedFetch(`/api/admin/events/${eventId}`);
                
                setEventName(data.eventName);
                setEventDate(formatDateForInput(data.eventDate));
                setEventTime(data.eventTime);
                setEventLocation(data.eventLocation);
                setEventDescription(data.eventDescription);
                setCurrentFlyerUrl(data.flyerImageThumbnailPath);
                
                setIsReservedSeating(data.isReservedSeating || false);

                if (data.isReservedSeating) {
                    // Reconstruct Sections/Rows from the flat 'seats' array
                    // This is complex: We need to turn [Seat, Seat] back into "Section A: Row 1"
                    const reconstructed = reconstructSectionsFromSeats(data.seats);
                    setSections(reconstructed);
                } else {
                    setTicketCount(data.ticketCount);
                    setTicketTypes(data.tickets && data.tickets.length > 0 ? data.tickets : [{ type: '', price: '', includes: '' }]);
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchEventData();
    }, [eventId]);

    // Helper: Turn the database's flat list of 500 seats back into the UI's "Section/Row" builder
    const reconstructSectionsFromSeats = (seats) => {
        if (!seats || seats.length === 0) return [];
        
        const map = {};
        seats.forEach(seat => {
            if (!map[seat.section]) map[seat.section] = {};
            if (!map[seat.section][seat.row]) {
                map[seat.section][seat.row] = { count: 0, price: seat.price };
            }
            map[seat.section][seat.row].count++;
        });

        return Object.keys(map).map((secName, i) => ({
            id: Date.now() + i,
            name: secName,
            rows: Object.keys(map[secName]).map((rowLabel, j) => ({
                id: Date.now() + i + j + 100,
                label: rowLabel,
                count: map[secName][rowLabel].count,
                price: map[secName][rowLabel].price
            }))
        }));
    };

    // --- Builders Handlers (Same as AddNewEventTab) ---
    const handleAddTicketType = () => setTicketTypes([...ticketTypes, { type: '', price: '', includes: '' }]);
    const handleRemoveTicketType = (index) => { if (ticketTypes.length > 1) setTicketTypes(ticketTypes.filter((_, i) => i !== index)); };
    const handleTicketChange = (index, field, value) => {
        const newTicketTypes = [...ticketTypes];
        newTicketTypes[index][field] = value;
        setTicketTypes(newTicketTypes);
    };

    const handleAddSection = () => setSections([...sections, { id: Date.now(), name: `Section ${sections.length + 1}`, rows: [{ id: Date.now() + 1, label: 'A', count: 10, price: 50 }] }]);
    const handleRemoveSection = (i) => { if (sections.length > 1) setSections(sections.filter((_, idx) => idx !== i)); };
    const handleSectionNameChange = (i, val) => { const newS = [...sections]; newS[i].name = val; setSections(newS); };
    const handleAddRow = (sIdx) => {
        const newS = [...sections];
        const lastRow = newS[sIdx].rows[newS[sIdx].rows.length - 1]?.label || 'A';
        const nextLabel = String.fromCharCode(lastRow.charCodeAt(0) + 1);
        newS[sIdx].rows.push({ id: Date.now(), label: nextLabel, count: 10, price: 50 });
        setSections(newS);
    };
    const handleRemoveRow = (sIdx, rIdx) => {
        const newS = [...sections];
        if (newS[sIdx].rows.length > 1) {
            newS[sIdx].rows.splice(rIdx, 1);
            setSections(newS);
        }
    };
    const handleRowChange = (sIdx, rIdx, field, val) => {
        const newS = [...sections];
        newS[sIdx].rows[rIdx][field] = val;
        setSections(newS);
    };

    // Calculate total tickets dynamically for Reserved Seating
    const totalReservedSeats = useMemo(() => {
        return sections.reduce((total, section) => {
            return total + section.rows.reduce((sectionTotal, row) => sectionTotal + parseInt(row.count || 0), 0);
        }, 0);
    }, [sections]);


    // --- Submit Handler ---
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
        
        // Pass the toggle state
        formData.append('isReservedSeating', isReservedSeating);

        const flyerInput = event.target.elements.flyer;
        if (flyerInput.files[0]) {
            formData.append('flyer', flyerInput.files[0]);
        }

        if (isReservedSeating) {
            // Recalculate seats from the builder
            formData.set('ticketCount', totalReservedSeats);
            
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
            formData.append('seats_config', JSON.stringify(generatedSeats));

        } else {
            // GA Logic
            formData.append('ticketCount', ticketCount);
            ticketTypes.forEach(ticket => {
                formData.append('ticket_type[]', ticket.type);
                formData.append('ticket_price[]', ticket.price);
                formData.append('ticket_includes[]', ticket.includes);
            });
        }

        try {
            // Note: Since we are technically replacing the whole seat configuration, 
            // the backend might need to delete old seats and create new ones.
            // For now, we assume the backend handles this overwrite in the PUT method.
            await authedFetch(`/api/admin/events/${eventId}`, {
                method: 'PUT',
                body: formData,
            });

            setMessage({ type: 'success', text: 'Event updated successfully! Redirecting...' });
            setTimeout(() => router.push('/admin-dashboard'), 2000);

        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsSubmitting(false);
        }
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

                    {/* --- READ-ONLY TOGGLE --- */}
                    {/* We usually don't want people switching from Seating -> GA easily after creation, so we make this read-only or just informative */}
                    <div className="form-group" style={{ margin: '20px 0', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" checked={isReservedSeating} disabled style={{ width: '20px', height: '20px' }} />
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                {isReservedSeating ? "Reserved Seating Event" : "General Admission Event"}
                            </span>
                        </label>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '5px' }}>
                            (You cannot switch between Seating modes after event creation)
                        </p>
                    </div>

                    {/* --- CONDITIONAL UI --- */}
                    {!isReservedSeating ? (
                        <>
                            <div className="form-group"><label htmlFor="ticketCount">Total Tickets Available</label><input type="number" id="ticketCount" name="ticketCount" value={ticketCount} onChange={(e) => setTicketCount(e.target.value)} required /></div>
                            <div className="form-group">
                                <label>Define Ticket Types & Pricing</label>
                                <div id="add-ticket-types-wrapper">{ticketTypes.map((ticket, index) => (<div key={index} className="ticket-type-entry"><input type="text" className="ticket-label" placeholder="e.g., General Admission" required value={ticket.type} onChange={(e) => handleTicketChange(index, 'type', e.target.value)} /><input type="number" className="ticket-price-input" placeholder="Price (e.g., 40.00)" min="0" step="0.01" required value={ticket.price} onChange={(e) => handleTicketChange(index, 'price', e.target.value)} /><textarea className="ticket-inclusions" placeholder="What's included?" value={ticket.includes} onChange={(e) => handleTicketChange(index, 'includes', e.target.value)}></textarea>{ticketTypes.length > 1 && <button type="button" className="remove-ticket-btn cta-button" onClick={() => handleRemoveTicketType(index)}>Remove</button>}</div>))}</div>
                                <button type="button" id="add-new-ticket-type-btn" className="cta-button" onClick={handleAddTicketType}>Add Another Ticket Type</button>
                            </div>
                        </>
                    ) : (
                        <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                            <label>Edit Seating Chart</label>
                            <p style={{marginBottom: '10px', color: '#ffcc00'}}>Warning: Changing this will regenerate all seats. Previous holds/selections might be lost.</p>
                            
                            {sections.map((section, sIndex) => (
                                <div key={section.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <input type="text" value={section.name} onChange={(e) => handleSectionNameChange(sIndex, e.target.value)} placeholder="Section Name" style={{ fontWeight: 'bold', width: '70%' }} />
                                        {sections.length > 1 && <button type="button" onClick={() => handleRemoveSection(sIndex)} className="cta-button" style={{ background: '#ff4444', fontSize: '0.8rem' }}>Delete Section</button>}
                                    </div>
                                    {section.rows.map((row, rIndex) => (
                                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                                            <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.7rem'}}>Row</span><input type="text" value={row.label} onChange={(e) => handleRowChange(sIndex, rIndex, 'label', e.target.value)} /></div>
                                            <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.7rem'}}>Count</span><input type="number" value={row.count} onChange={(e) => handleRowChange(sIndex, rIndex, 'count', e.target.value)} /></div>
                                            <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.7rem'}}>Price</span><input type="number" value={row.price} onChange={(e) => handleRowChange(sIndex, rIndex, 'price', e.target.value)} /></div>
                                            {section.rows.length > 1 && <button type="button" onClick={() => handleRemoveRow(sIndex, rIndex)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', marginTop: '15px' }}><i className="fas fa-trash"></i></button>}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddRow(sIndex)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '5px 10px', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add Row</button>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                <button type="button" onClick={handleAddSection} className="cta-button" style={{ background: '#28a745' }}>+ Add Section</button>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00d4ff' }}>Total Seats: {totalReservedSeats}</div>
                            </div>
                        </div>
                    )}

                    {currentFlyerUrl && (<div className="form-group"><label>Current Flyer</label><img src={currentFlyerUrl} alt="Current event flyer" style={{ maxWidth: '200px', height: 'auto', borderRadius: '8px', display: 'block' }} /></div>)}
                    <div className="form-group"><label htmlFor="flyer">Upload New Flyer (Optional: Replaces current flyer)</label><input type="file" id="flyer" name="flyer" accept=".jpg,.jpeg,.png" /></div>
                    <div className="form-group"><button type="submit" className="cta-button form-submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button></div>
                </form>
            </div>
        </main>
    );
}

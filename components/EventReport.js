import React from 'react';

// This component is the visual template for our PDF.
// We use React.forwardRef to allow the PDF library to directly access the component's underlying HTML element.
const EventReport = React.forwardRef(({ reportData }, ref) => {
    
    // Basic inline styles for a clean, printable look
    const styles = {
        page: {
            fontFamily: 'Arial, sans-serif',
            padding: '40px',
            color: '#333',
            width: '210mm', // Standard A4 paper width
            minHeight: '297mm', // Standard A4 paper height
        },
        header: {
            textAlign: 'center',
            borderBottom: '2px solid #eee',
            paddingBottom: '20px',
            marginBottom: '30px',
        },
        eventName: {
            fontSize: '28px',
            margin: '0',
        },
        eventMeta: {
            fontSize: '14px',
            color: '#666',
        },
        section: {
            marginBottom: '30px',
        },
        sectionTitle: {
            fontSize: '20px',
            borderBottom: '1px solid #eee',
            paddingBottom: '10px',
            marginBottom: '15px',
        },
        summaryGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
        },
        summaryBox: {
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '5px',
        },
        summaryLabel: {
            fontSize: '14px',
            color: '#666',
        },
        summaryValue: {
            fontSize: '22px',
            fontWeight: 'bold',
        },
        attendeeTable: {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
        },
        tableHeader: {
            backgroundColor: '#f2f2f2',
            fontWeight: 'bold',
        },
        tableCell: {
            padding: '8px',
            border: '1px solid #ddd',
            textAlign: 'left',
        }
    };

    // Default to empty data to prevent errors if data is missing
    const { event = {}, attendees = [], totalRevenue = 0 } = reportData || {};

    return (
        <div ref={ref} style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.eventName}>{event.eventName || 'Event Report'}</h1>
                <p style={styles.eventMeta}>
                    {event.formattedDate || 'N/A'} at {event.formattedTime || 'N/A'} <br />
                    {event.eventLocation || 'N/A'}
                </p>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Sales Summary</h2>
                <div style={styles.summaryGrid}>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Total Tickets Sold</div>
                        <div style={styles.summaryValue}>{attendees.length} / {event.ticketCount || 0}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Total Revenue</div>
                        <div style={styles.summaryValue}>${Number(totalRevenue).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Attendee List</h2>
                <table style={styles.attendeeTable}>
                    <thead>
                        <tr style={styles.tableHeader}>
                            <th style={styles.tableCell}>Ticket ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Ticket Type</th>
                            <th style={styles.tableCell}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendees.length > 0 ? attendees.map(ticket => (
                            <tr key={ticket._id}>
                                <td style={styles.tableCell}>{ticket._id}</td>
                                <td style={styles.tableCell}>{ticket.customerFirstName} {ticket.customerLastName}</td>
                                <td style={styles.tableCell}>{ticket.ticketType}</td>
                                <td style={styles.tableCell}>{ticket.status}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" style={{...styles.tableCell, textAlign: 'center'}}>No attendees found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// Set a display name for the component, which is helpful for debugging
EventReport.displayName = 'EventReport';

export default EventReport;

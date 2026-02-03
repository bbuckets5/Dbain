'use client';

import { useState, useMemo } from 'react';

export default function SeatingChart({ seats, onSeatSelect, selectedSeats }) {
    const [activeSection, setActiveSection] = useState(null);

    // 1. Group seats by Section -> Row
    // Result: { "Orchestra": { "A": [Seat, Seat], "B": [Seat, Seat] }, "Balcony": { ... } }
    const seatingMap = useMemo(() => {
        const map = {};
        seats.forEach(seat => {
            if (!map[seat.section]) {
                map[seat.section] = {};
            }
            if (!map[seat.section][seat.row]) {
                map[seat.section][seat.row] = [];
            }
            map[seat.section][seat.row].push(seat);
        });
        
        // Sort rows alphabetically (A, B, C...)
        Object.keys(map).forEach(section => {
            const sortedRows = Object.keys(map[section]).sort();
            const sortedRowObj = {};
            sortedRows.forEach(row => {
                sortedRowObj[row] = map[section][row].sort((a, b) => {
                    // Try to sort numbers numerically if possible, else string
                    const numA = parseInt(a.number);
                    const numB = parseInt(b.number);
                    return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.number.localeCompare(b.number);
                });
            });
            map[section] = sortedRowObj;
        });

        return map;
    }, [seats]);

    const sections = Object.keys(seatingMap);
    
    // Set initial active section
    if (!activeSection && sections.length > 0) {
        setActiveSection(sections[0]);
    }

    // Helper to check seat status
    const getSeatStatus = (seat) => {
        // Is it already in the cart/selected by THIS user?
        if (selectedSeats.some(s => s._id === seat._id)) return 'selected';
        
        // Is it sold or held by someone else?
        if (seat.status === 'sold') return 'sold';
        if (seat.status === 'held') return 'held'; // In real implementation, check if held by *current* user
        
        return 'available';
    };

    return (
        <div className="seating-chart-container">
            <style jsx>{`
                .seating-chart-container {
                    margin-top: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.2);
                }
                .section-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    overflow-x: auto;
                    padding-bottom: 5px;
                }
                .section-tab {
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    color: white;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s;
                }
                .section-tab.active {
                    background: #00d4ff;
                    color: black;
                    font-weight: bold;
                    border-color: #00d4ff;
                }
                .stage-indicator {
                    width: 80%;
                    margin: 0 auto 30px auto;
                    height: 30px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
                    border-top: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50% 50% 0 0 / 20px 20px 0 0;
                    text-align: center;
                    color: rgba(255,255,255,0.5);
                    font-size: 0.8rem;
                    line-height: 30px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                .rows-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: center;
                }
                .seat-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .row-label {
                    width: 30px;
                    text-align: right;
                    font-weight: bold;
                    color: rgba(255,255,255,0.7);
                }
                .seats-grid {
                    display: flex;
                    gap: 6px;
                }
                .seat {
                    width: 30px;
                    height: 30px;
                    border-radius: 6px;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    cursor: pointer;
                    transition: transform 0.1s;
                    color: white;
                }
                .seat:hover:not(:disabled) {
                    transform: scale(1.1);
                }
                .seat.available {
                    background-color: #28a745; /* Green */
                    box-shadow: 0 2px 5px rgba(40, 167, 69, 0.3);
                }
                .seat.selected {
                    background-color: #ff9900; /* Orange */
                    box-shadow: 0 0 10px #ff9900;
                    color: black;
                    font-weight: bold;
                }
                .seat.sold {
                    background-color: #444; /* Dark Gray */
                    color: #888;
                    cursor: not-allowed;
                    opacity: 0.6;
                }
                .seat.held {
                    background-color: #666; /* Light Gray */
                    cursor: not-allowed;
                }
                .legend {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    color: rgba(255,255,255,0.7);
                }
                .legend-dot {
                    width: 15px;
                    height: 15px;
                    border-radius: 3px;
                }
            `}</style>

            {/* Section Tabs */}
            {sections.length > 1 && (
                <div className="section-tabs">
                    {sections.map(section => (
                        <button 
                            key={section} 
                            className={`section-tab ${activeSection === section ? 'active' : ''}`}
                            onClick={() => setActiveSection(section)}
                        >
                            {section}
                        </button>
                    ))}
                </div>
            )}

            <div className="stage-indicator">Stage</div>

            {/* The Grid */}
            <div className="rows-container">
                {activeSection && seatingMap[activeSection] && Object.keys(seatingMap[activeSection]).map(rowLabel => (
                    <div key={rowLabel} className="seat-row">
                        <div className="row-label">{rowLabel}</div>
                        <div className="seats-grid">
                            {seatingMap[activeSection][rowLabel].map(seat => {
                                const status = getSeatStatus(seat);
                                return (
                                    <button
                                        key={seat._id}
                                        className={`seat ${status}`}
                                        onClick={() => status === 'available' || status === 'selected' ? onSeatSelect(seat) : null}
                                        disabled={status === 'sold' || status === 'held'}
                                        title={`Row ${seat.row} Seat ${seat.number} - $${seat.price}`}
                                    >
                                        {seat.number}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="legend">
                <div className="legend-item">
                    <div className="legend-dot" style={{background: '#28a745'}}></div>
                    <span>Available</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{background: '#ff9900'}}></div>
                    <span>Selected</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot" style={{background: '#444'}}></div>
                    <span>Sold / Taken</span>
                </div>
            </div>
        </div>
    );
}

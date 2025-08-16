// In components/TicketManager.js
'use client';

import { useState } from 'react';
import { useUser } from '@/components/UserContext';

function showCustomAlert(title, message, type) {
    alert(`${title}: ${message}`);
}

// 1. Accept the new 'eventHasStarted' prop
export default function TicketManager({ tickets, eventName, isSoldOut, eventHasStarted, eventId }) {
    const { addToCart } = useUser(); 
    const [quantities, setQuantities] = useState({});

    const handleQuantityChange = (ticketId, amount) => {
        const currentQuantity = quantities[ticketId] || 0;
        const newQuantity = Math.max(0, currentQuantity + amount);
        setQuantities(prev => ({ ...prev, [ticketId]: newQuantity }));
    };

    const handleAddToCart = (ticket) => {
        const quantity = quantities[ticket._id] || 0;
        if (quantity === 0) {
            showCustomAlert('Quantity Error', "Please select a quantity greater than zero.", 'error');
            return;
        }

        const newItem = {
            id: `${eventId}_${ticket._id}`,
            name: ticket.type, 
            quantity: quantity,
            price: ticket.price,
            eventName: eventName
        };

        addToCart(newItem);
        showCustomAlert('Cart Updated', `${quantity} x ${ticket.type} ticket(s) for "${eventName}" added!`, 'success');
    };

    // 2. Add a check for 'eventHasStarted' at the top
    if (eventHasStarted) {
        return (
            <div className="ticket-purchase-area event-started">
                <h3>Ticket Sales Closed</h3>
                <p className="info-msg"><i className="fas fa-clock"></i> This event has already started.</p>
            </div>
        );
    }

    if (isSoldOut) {
        return (
            <div className="ticket-purchase-area sold-out">
                <h3>Tickets Unavailable</h3>
                <p className="info-msg"><i className="fas fa-ban"></i> This event is currently sold out.</p>
            </div>
        );
    }

    return (
        <div className="ticket-purchase-area">
            <h3>Ticket Options</h3>
            <ul className="ticket-options-list">
                {tickets && tickets.length > 0 ? (
                    tickets.map(ticket => (
                        <li key={ticket._id} className="ticket-option glass">
                            <div className="ticket-info">
                                <h4>{ticket.type}</h4>
                                <p className="ticket-price">${Number(ticket.price).toFixed(2)}</p>
                                {ticket.includes && <p className="ticket-includes">{ticket.includes}</p>}
                            </div>
                            <div className="ticket-controls">
                                <div className="quantity-selector">
                                    <button className="quantity-btn minus-btn" onClick={() => handleQuantityChange(ticket._id, -1)}>-</button>
                                    <span className="quantity-display">{quantities[ticket._id] || 0}</span>
                                    <button className="quantity-btn plus-btn" onClick={() => handleQuantityChange(ticket._id, 1)}>+</button>
                                </div>
                                <button className="cta-button add-to-cart-btn" onClick={() => handleAddToCart(ticket)}>Add to Cart</button>
                            </div>
                        </li>
                    ))
                ) : (
                    <p className="info-msg">No tickets are available for this event.</p>
                )}
            </ul>
        </div>
    );
}
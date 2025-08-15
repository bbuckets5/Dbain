// In models/ticket.js

import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    eventId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Submission', // Links to the event in the submissions collection
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // The user who bought the ticket, if they were logged in
        default: null
    },
    ticketType: { type: String, required: true },
    price: { type: Number, required: true },
    customerFirstName: { type: String, required: true },
    customerLastName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['active', 'refunded', 'checked-in'], 
        default: 'active' 
    },
}, { timestamps: true });

// This line prevents errors in development by reusing the existing model
export default mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
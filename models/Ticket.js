// models/Ticket.js

import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ticketType: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    customerFirstName: {
        type: String,
        required: true
    },
    customerLastName: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['valid', 'refunded', 'checked-in'], // Corrected to 'valid'
        default: 'valid' // Corrected to 'valid'
    },
    qrCodeUrl: { // ADDED: Field for the Cloudinary URL
        type: String,
    },
    checkedInAt: {
        type: Date,
        default: null
    },
    checkedInBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

}, { timestamps: true }); // This handles createdAt (purchase date) and updatedAt automatically

export default mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

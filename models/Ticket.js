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
    
    // ADDED: Fields for check-in records
    checkedInAt: { type: Date, default: null },
    checkedInBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },

}, { timestamps: true });

export default mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

// models/event.js
import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  businessName: { type: String, default: '' },
  eventName: { type: String, required: true },
  eventDescription: { type: String, default: 'No description provided.' },
  eventDate: { type: Date, required: true },
  eventTime: { type: String, required: true },
  eventLocation: { type: String, required: true },
  phone: { type: String, default: '' },
  ticketCount: { type: Number, required: true, min: 0 },
  flyerImagePath: { type: String, default: null },
  flyerImageThumbnailPath: { type: String, default: null },
  flyerImagePlaceholderPath: { type: String, default: null },
  tickets: [{
    type: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    includes: { type: String, default: '' }
  }],
  status: {
    type: String,
    // Add 'finished' to this list of allowed statuses
    enum: ['pending', 'approved', 'denied', 'finished'], 
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now },
  ticketsSold: { type: Number, default: 0 }
}, {
  collection: 'submissions' 
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);
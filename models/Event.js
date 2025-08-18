// models/Event.js
import mongoose from 'mongoose';

const TicketOptionSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    includes: { type: String, default: '', trim: true },
  },
  { _id: false }
);

// Simple HH:mm validator (24-hour, zero-padded)
const TIME_REGEX = /^\d{2}:\d{2}$/;

const EventSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    businessName: { type: String, default: '', trim: true },

    // Email of the person who submitted the event
    submitterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: { type: String, default: '', trim: true },

    eventName: { type: String, required: true, trim: true },
    eventDescription: { type: String, default: 'No description provided.' },

    // --- Hardened date & time fields ---
    eventDate: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v instanceof Date && !isNaN(v.valueOf()),
        message: 'eventDate must be a valid Date.',
      },
    },
    eventTime: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => TIME_REGEX.test(v),
        message: 'eventTime must be in HH:mm format (24h, zero-padded, e.g. "18:30").',
      },
    },

    eventLocation: { type: String, required: true, trim: true },

    ticketCount: { type: Number, required: true, min: 0 },

    // Image fields
    flyerImagePath: { type: String, required: true, trim: true },
    flyerImageThumbnailPath: { type: String, trim: true },
    flyerImagePlaceholderPath: { type: String, trim: true },
    flyerPublicId: { type: String, required: true, trim: true },

    tickets: {
      type: [TicketOptionSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'finished'],
      default: 'pending',
      index: true,
    },

    submittedAt: { type: Date, default: Date.now },
    ticketsSold: { type: Number, default: 0, min: 0 },
  },
  {
    collection: 'submissions',
    timestamps: true, // adds createdAt/updatedAt
  }
);

// Helpful indexes for common queries
EventSchema.index({ eventDate: 1, status: 1 });
EventSchema.index({ submittedAt: -1 });

// Optional: sanitize potentially long description
EventSchema.path('eventDescription').set((v) => {
  if (typeof v !== 'string') return v;
  // Cap description length to avoid huge payloads
  return v.length > 10000 ? v.slice(0, 10000) : v;
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);


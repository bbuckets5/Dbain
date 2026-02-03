import mongoose from 'mongoose';

// --- NEW: Seat Schema for Reserved Seating ---
const SeatSchema = new mongoose.Schema({
  section: { type: String, default: 'General' }, // e.g., "Orchestra", "Section 101"
  row: { type: String, required: true },         // e.g., "A", "Front"
  number: { type: String, required: true },      // e.g., "1", "101" (String for flexibility)
  price: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    enum: ['available', 'held', 'sold', 'unavailable'], 
    default: 'available' 
  },
  // For the "Hold" timer functionality
  heldBy: { type: String }, // Stores a Session ID or Guest ID
  holdExpires: { type: Date }, // When the hold is released
  
  // Who actually bought it
  soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
});

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

    // --- OLD: General Admission Options ---
    tickets: {
      type: [TicketOptionSchema],
      default: [],
    },

    // --- NEW: Reserved Seating Fields ---
    isReservedSeating: { type: Boolean, default: false }, // The "Toggle Switch"
    seats: { type: [SeatSchema], default: [] },           // The array of all generated seats

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

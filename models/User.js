// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },

  // password reset
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date,   default: null },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);

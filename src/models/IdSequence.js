import mongoose from 'mongoose';

/**
 * ID Sequence Model
 * Tracks sequence numbers for different ID prefixes with date-based sequences
 * Matches Supabase ID sequence structure
 */
const idSequenceSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  prefix: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  date_str: {
    type: String,
    required: true,
    trim: true
  },
  last_sequence: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'id_sequences'
});

// Compound index for prefix and date_str combination
idSequenceSchema.index({ prefix: 1, date_str: 1 }, { unique: true });

// Pre-save middleware to update timestamp
idSequenceSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const IdSequence = mongoose.model('IdSequence', idSequenceSchema);

export default IdSequence;

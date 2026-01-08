const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  extractedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['new', 'messaged', 'replied', 'clicked', 'converted', 'ignored'],
    default: 'new'
  },
  messageStatus: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    seen: { type: Boolean, default: false },
    seenAt: { type: Date },
    replied: { type: Boolean, default: false },
    repliedAt: { type: Date }
  },
  linkTracking: {
    linkSent: { type: String, default: '' },
    clicked: { type: Boolean, default: false },
    clickedAt: { type: Date },
    clickCount: { type: Number, default: 0 },
    landingPageViewed: { type: Boolean, default: false },
    landingPageViewedAt: { type: Date }
  },
  notes: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Compound index to prevent duplicate username per category
leadSchema.index({ username: 1, category: 1 }, { unique: true });

// Index for efficient querying
leadSchema.index({ category: 1, extractedAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ extractedAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);

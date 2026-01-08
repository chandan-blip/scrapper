const mongoose = require('mongoose');

const extractionJobSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  sourceType: {
    type: String,
    enum: ['followers', 'comments', 'likes', 'hashtag'],
    required: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  extractedUsernames: [{
    type: String
  }],
  savedToDb: {
    type: Boolean,
    default: false
  },
  totalExtracted: {
    type: Number,
    default: 0
  },
  totalSaved: {
    type: Number,
    default: 0
  },
  duplicatesSkipped: {
    type: Number,
    default: 0
  },
  config: {
    iterations: { type: Number, default: 25 },
    scrollAmount: { type: Number, default: 1000 },
    delay: { type: Number, default: 2000 }
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  error: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('ExtractionJob', extractionJobSchema);

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  // Service Provider
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Basic Service Information
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Service title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [1000, 'Service description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },

  // Service Category and Type
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: [
      'home_services',
      'automotive',
      'healthcare',
      'education',
      'technology',
      'beauty_wellness',
      'professional_services',
      'entertainment',
      'maintenance',
      'consulting',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [String],

  // Service Details
  serviceType: {
    type: String,
    enum: ['one_time', 'recurring', 'subscription', 'consultation'],
    default: 'one_time'
  },
  duration: {
    type: Number, // in minutes
    min: [15, 'Duration must be at least 15 minutes']
  },
  availability: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: true } },
    sunday: { start: String, end: String, available: { type: Boolean, default: true } }
  },

  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'per_unit', 'negotiable'],
      required: true
    },
    amount: {
      type: Number,
      required: [true, 'Service price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'NOK',
      enum: ['NOK', 'EUR', 'USD']
    },
    additionalFees: [{
      name: String,
      amount: Number,
      description: String
    }]
  },

  // Location and Coverage
  serviceArea: {
    cities: [String],
    maxDistance: Number, // in kilometers
    travelFee: {
      type: Number,
      default: 0
    }
  },
  onSiteService: {
    type: Boolean,
    default: true
  },
  remoteService: {
    type: Boolean,
    default: false
  },

  // Media and Attachments
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false }
  }],
  videos: [{
    url: String,
    caption: String,
    duration: Number
  }],
  documents: [{
    name: String,
    url: String,
    type: String
  }],

  // Quality and Verification
  qualityRating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Status and Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_review'],
    default: 'pending_review'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,

  // Statistics
  viewCount: {
    type: Number,
    default: 0
  },
  inquiryCount: {
    type: Number,
    default: 0
  },
  bookingCount: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
serviceSchema.index({ provider: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ subcategory: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ 'serviceArea.cities': 1 });
serviceSchema.index({ isFeatured: 1, status: 1 });
serviceSchema.index({ qualityRating: { average: -1 } });

// Virtual for full price display
serviceSchema.virtual('fullPrice').get(function() {
  const basePrice = this.pricing.amount;
  const additionalFees = this.pricing.additionalFees.reduce((sum, fee) => sum + fee.amount, 0);
  return basePrice + additionalFees;
});

// Virtual for availability status
serviceSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && this.isVerified;
});

// Method to update view count
serviceSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to update inquiry count
serviceSchema.methods.incrementInquiryCount = function() {
  this.inquiryCount += 1;
  return this.save();
};

// Method to update booking count
serviceSchema.methods.incrementBookingCount = function() {
  this.bookingCount += 1;
  return this.save();
};

// Method to calculate average rating
serviceSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.qualityRating.average * this.qualityRating.count) + newRating;
  this.qualityRating.count += 1;
  this.qualityRating.average = totalRating / this.qualityRating.count;
  return this.save();
};

module.exports = mongoose.model('Service', serviceSchema);

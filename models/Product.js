const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  isAuction: {
    type: Boolean,
    default: false
  },
  auctionEndTime: {
    type: Date,
    default: null
  },
  category: {
    type: String,
    required: true
  },
  imageUrls: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['available', 'sold', 'inactive'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);

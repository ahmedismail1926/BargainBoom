const mongoose = require("mongoose");

const auctionBidSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create an index to quickly find the highest bid for a product
auctionBidSchema.index({ productId: 1, bidAmount: -1 });

module.exports = mongoose.model("AuctionBid", auctionBidSchema);

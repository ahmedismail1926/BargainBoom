const AuctionBid = require("../models/AuctionBid");
const Product = require("../models/Product");
const logger = require("../utils/logger");

/**
 * Create a new auction bid
 * @param {Object} bidData - The bid data
 * @returns {Promise<Object>} - The created bid
 */
exports.createBid = async (bidData) => {
  try {
    // First get the product to verify auction status and check max bid
    const product = await Product.findById(bidData.productId);

    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.isAuction) {
      throw new Error("This product is not in auction mode");
    }

    if (product.auctionEndTime < new Date()) {
      throw new Error("Auction has ended");
    }

    // Check if bid is greater than or equal to the current max bid (basePrice)
    if (bidData.bidAmount < product.basePrice) {
      throw new Error(
        `Bid must be greater than or equal to the current max bid of ${product.basePrice}`
      );
    }

    // Create the bid
    const bid = new AuctionBid(bidData);
    await bid.save();

    // Update the product's basePrice to reflect the new max bid
    await Product.findByIdAndUpdate(
      bidData.productId,
      { basePrice: bidData.bidAmount },
      { new: true }
    );

    return bid;
  } catch (error) {
    logger.error("Error creating auction bid:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get the current maximum bid for a product
 * @param {String} productId - The product ID
 * @returns {Promise<Object>} - The max bid info
 */
exports.getMaxBid = async (productId) => {
  try {
    // First check if product exists and is in auction mode
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.isAuction) {
      throw new Error("This product is not in auction mode");
    }

    // Get the highest bid for this product
    const maxBid = await AuctionBid.findOne({ productId })
      .sort({ bidAmount: -1 })
      .populate("buyerId", "name")
      .lean();

    return {
      productId,
      currentMaxBid: maxBid ? maxBid.bidAmount : product.basePrice,
      bidderName: maxBid ? maxBid.buyerId.name : null,
      bidderId: maxBid ? maxBid.buyerId._id : null,
      bidTime: maxBid ? maxBid.createdAt : null,
      auctionEndTime: product.auctionEndTime,
    };
  } catch (error) {
    logger.error("Error getting max bid:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get all bids for a product
 * @param {String} productId - The product ID
 * @returns {Promise<Array>} - Array of bids
 */
exports.getBidsByProduct = async (productId) => {
  try {
    return await AuctionBid.find({ productId })
      .populate("buyerId", "name")
      .sort({ bidAmount: -1 });
  } catch (error) {
    logger.error("Error getting bids by product:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get all bids by a buyer
 * @param {String} buyerId - The buyer ID
 * @returns {Promise<Array>} - Array of bids
 */
exports.getBidsByBuyer = async (buyerId) => {
  try {
    return await AuctionBid.find({ buyerId })
      .populate("productId")
      .sort("-createdAt");
  } catch (error) {
    logger.error("Error getting bids by buyer:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get the auction end time
 * @param {String} productId - The product ID
 * @returns {Promise<Object>} - End time details
 */
exports.getAuctionEndTime = async (productId) => {
  try {
    // Check if product exists and is in auction mode
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.isAuction) {
      throw new Error("This product is not in auction mode");
    }

    return {
      productId,
      auctionEndTime: product.auctionEndTime,
      hasEnded: product.auctionEndTime < new Date(),
      formattedEndTime: new Date(product.auctionEndTime).toISOString(),
    };
  } catch (error) {
    logger.error("Error getting auction end time:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const { validationResult } = require("express-validator");
const AuctionBid = require("../models/AuctionBid");
const Product = require("../models/Product");
const { errorResponse, successResponse } = require("../utils/responseHandler");
const logger = require("../utils/logger");

/**
 * Create a new bid for an auction
 */
exports.createBid = async (req, res, next) => {
  try {
    // Log the request for debugging
    logger.info(`Auction bid request received from IP: ${req.ip}`, {
      headers: {
        authorization: req.headers.authorization
          ? "Present (redacted)"
          : "Not present",
        "content-type": req.headers["content-type"],
      },
      body: req.body,
      user: req.user
        ? { id: req.user._id, role: req.user.role }
        : "Not authenticated",
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const { productId, bidAmount } = req.body;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    let product;
    try {
      product = await Product.findById(productId);
    } catch (err) {
      logger.error(`Error fetching product: ${err.message}`, {
        productId,
        error: err,
      });
      return errorResponse(res, "Invalid product ID format", 400);
    }

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    if (!product.isAuction) {
      return errorResponse(res, "This product is not in auction mode", 400);
    }

    if (product.auctionEndTime < new Date()) {
      return errorResponse(res, "Auction has ended", 400);
    }

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = product.sellerId;
    if (product.sellerId && product.sellerId._id) {
      sellerIdToCompare = product.sellerId._id;
    }

    // Compare as strings to ensure consistent comparison
    if (String(sellerIdToCompare) === String(req.user._id)) {
      return errorResponse(
        res,
        "Sellers cannot bid on their own products",
        400
      );
    }

    // Validate bid amount
    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
      return errorResponse(res, "Bid amount must be a positive number", 400);
    } // Get current max bid
    const currentMaxBid = await AuctionBid.findOne({ productId })
      .sort({ bidAmount: -1 })
      .lean();

    // Determine the minimum bid amount
    const minBidAmount = currentMaxBid
      ? currentMaxBid.bidAmount
      : product.basePrice;

    // Validate bid is higher than or equal to current price
    if (bidAmount < minBidAmount) {
      return errorResponse(res, `Bid must be at least ${minBidAmount}`, 400);
    }

    // Create the bid
    const bid = new AuctionBid({
      productId,
      buyerId: req.user._id,
      bidAmount,
    });

    await bid.save();

    logger.info(
      `New bid created: ${bidAmount} by user ${req.user._id} for product ${productId}`
    );

    // Update the product's base price to reflect the new max bid
    await Product.findByIdAndUpdate(
      productId,
      { basePrice: bidAmount },
      { new: true }
    );

    return successResponse(res, bid, "Bid created successfully", 201);
  } catch (error) {
    logger.error("Error creating bid:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(res, "An error occurred while creating the bid", 500);
  }
};

/**
 * Get the maximum bid for a product
 */
exports.getMaxBid = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    // First check if product exists and is in auction mode
    const product = await Product.findById(productId);

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    if (!product.isAuction) {
      return errorResponse(res, "This product is not in auction mode", 400);
    }

    // Get the highest bid for this product
    const maxBid = await AuctionBid.findOne({ productId })
      .sort({ bidAmount: -1 })
      .populate("buyerId", "name")
      .lean();

    const result = {
      productId,
      currentMaxBid: maxBid ? maxBid.bidAmount : product.basePrice,
      bidderName: maxBid ? maxBid.buyerId.name : null,
      bidderId: maxBid ? maxBid.buyerId._id : null,
      bidTime: maxBid ? maxBid.createdAt : null,
      auctionEndTime: product.auctionEndTime,
    };

    return successResponse(res, result, "Maximum bid retrieved successfully");
  } catch (error) {
    logger.error("Error getting max bid:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "An error occurred while retrieving the maximum bid",
      500
    );
  }
};

/**
 * Get all bids for a product
 */
exports.getBidsByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    const bids = await AuctionBid.find({ productId })
      .populate("buyerId", "name")
      .sort({ bidAmount: -1 });

    return successResponse(res, bids, "Bids retrieved successfully");
  } catch (error) {
    logger.error("Error getting bids by product:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "An error occurred while retrieving the bids",
      500
    );
  }
};

/**
 * Get all bids made by a buyer
 */
exports.getBidsByBuyer = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const buyerId = req.user._id;

    const bids = await AuctionBid.find({ buyerId })
      .populate("productId")
      .sort("-createdAt");

    return successResponse(res, bids, "Bids retrieved successfully");
  } catch (error) {
    logger.error("Error getting bids by buyer:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "An error occurred while retrieving the bids",
      500
    );
  }
};

/**
 * Get the auction end time
 */
exports.getAuctionEndTime = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    try {
      const auctionService = require("../services/auctionService");
      const endTimeData = await auctionService.getAuctionEndTime(productId);
      return successResponse(
        res,
        endTimeData,
        "Auction end time retrieved successfully"
      );
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  } catch (error) {
    logger.error("Error getting auction end time:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "An error occurred while retrieving auction end time",
      500
    );
  }
};

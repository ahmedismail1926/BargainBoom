const { validationResult } = require("express-validator");
const offerService = require("../services/offerService");
const productService = require("../services/productService");
const { errorResponse, successResponse } = require("../utils/responseHandler");
const logger = require("../utils/logger");

//counteroffer
exports.createOffer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const { productId, offerPrice, quantity = 1 } = req.body;

    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    let product;
    try {
      product = await productService.getProductById(productId);
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

    if (product.status !== "available") {
      return errorResponse(res, "Product is not available for offers", 400);
    }

    if (product.isAuction) {
      return errorResponse(
        res,
        "Cannot make counter offers on auction items",
        400
      );
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
        "Sellers cannot make offers on their own products",
        400
      );
    }

    // Validate price
    if (offerPrice <= 0) {
      return errorResponse(res, "Offer price must be greater than zero", 400);
    }

    // Check if quantity is valid
    if (!Number.isInteger(quantity) || quantity < 1) {
      return errorResponse(res, "Quantity must be a positive integer", 400);
    }

    if (quantity > product.quantity) {
      return errorResponse(
        res,
        "Requested quantity exceeds available quantity",
        400
      );
    }

    const offerData = {
      productId,
      buyerId: req.user._id,
      offerPrice,
      quantity,
    };

    const offer = await offerService.createOffer(offerData);
    return successResponse(res, offer, "Offer created successfully", 201);
  } catch (error) {
    logger.error("Error creating offer:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "Failed to create offer: " + (error.message || "Unknown error"),
      500
    );
  }
};

//seller's view
exports.getProductOffers = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const productId = req.params.productId;
    if (!productId) {
      return errorResponse(res, "Product ID is required", 400);
    }

    // Check if the product exists
    let product;
    try {
      product = await productService.getProductById(productId);
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

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = product.sellerId;
    if (product.sellerId && product.sellerId._id) {
      sellerIdToCompare = product.sellerId._id;
    }

    // Compare as strings to ensure consistent comparison
    if (String(sellerIdToCompare) !== String(req.user._id)) {
      logger.warn(
        `Unauthorized access attempt to view offers for product ${productId} by user ${req.user._id}`
      );
      return errorResponse(
        res,
        "Not authorized to view offers for this product",
        403
      );
    }

    const offers = await offerService.getOffersByProduct(productId);
    return successResponse(res, offers, "Offers retrieved successfully");
  } catch (error) {
    logger.error("Error getting product offers:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "Failed to retrieve offers: " + (error.message || "Unknown error"),
      500
    );
  }
};

exports.getBuyerOffers = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const offers = await offerService.getOffersByBuyer(req.user._id);
    return successResponse(res, offers, "Buyer offers retrieved successfully");
  } catch (error) {
    logger.error("Error getting buyer offers:", {
      error: error.message,
      userId: req.user?._id,
    });
    return errorResponse(
      res,
      "Failed to retrieve buyer offers: " + (error.message || "Unknown error"),
      500
    );
  }
};

exports.updateOfferStatus = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { status, counterPrice } = req.body;
    const offerId = req.params.id;

    if (!offerId) {
      return errorResponse(res, "Offer ID is required", 400);
    }

    let offer;
    try {
      offer = await offerService.getOfferById(offerId);
    } catch (err) {
      logger.error(`Error fetching offer: ${err.message}`, {
        offerId,
        error: err,
      });
      return errorResponse(res, "Invalid offer ID format", 400);
    }

    if (!offer) {
      return errorResponse(res, "Offer not found", 404);
    }

    // Handle case where productId might be populated or a raw ObjectId
    let productId = offer.productId;
    if (offer.productId && offer.productId._id) {
      productId = offer.productId._id;
    }

    let product;
    try {
      product = await productService.getProductById(productId);
    } catch (err) {
      logger.error(`Error fetching product: ${err.message}`, {
        productId,
        error: err,
      });
      return errorResponse(res, "Error retrieving product information", 500);
    }

    if (!product) {
      return errorResponse(res, "Product not found or has been removed", 404);
    }

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = product.sellerId;
    if (product.sellerId && product.sellerId._id) {
      sellerIdToCompare = product.sellerId._id;
    }

    // Compare as strings to ensure consistent comparison
    if (String(sellerIdToCompare) !== String(req.user._id)) {
      logger.warn(
        `Unauthorized update attempt for offer ${offerId} by user ${req.user._id}`
      );
      return errorResponse(res, "Not authorized to update this offer", 403);
    } // Validate status
    if (!["accepted", "rejected", "countered"].includes(status)) {
      return errorResponse(
        res,
        "Invalid status. Must be accepted, rejected, or countered",
        400
      );
    }

    // Validate quantity for acceptance
    if (status === "accepted") {
      // Check if product has enough quantity
      if (offer.quantity > product.quantity) {
        return errorResponse(
          res,
          "Cannot accept offer - not enough product quantity available",
          400
        );
      }
    }

    // If status is countered, counterPrice is required
    if (status === "countered") {
      if (!counterPrice) {
        return errorResponse(
          res,
          "Counter price is required when countering an offer",
          400
        );
      }

      if (counterPrice <= 0) {
        return errorResponse(
          res,
          "Counter price must be greater than zero",
          400
        );
      }
    }
    try {
      const updatedOffer = await offerService.updateOfferStatus(
        offerId,
        status,
        counterPrice
      );

      let message = `Offer ${status} successfully`;
      if (status === "accepted") {
        message =
          "Offer accepted successfully. Product quantity has been updated.";
      }

      return successResponse(res, updatedOffer, message);
    } catch (error) {
      logger.error(`Error during offer status update: ${error.message}`);
      return errorResponse(res, error.message, 400);
    }
  } catch (error) {
    logger.error("Error updating offer status:", {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse(
      res,
      "Failed to update offer: " + (error.message || "Unknown error"),
      500
    );
  }
};

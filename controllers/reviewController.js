const { validationResult } = require("express-validator");
const reviewService = require("../services/reviewService");
const orderService = require("../services/orderService");

/**
 * Create a new review
 */
exports.createReview = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, reviewedUserId, rating, comment } = req.body;

    // Check if the order exists
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is completed
    if (order.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Cannot review an incomplete order" });
    }

    // Extract IDs for comparison, handling both plain and populated IDs
    let buyerIdStr =
      typeof order.buyerId === "object" && order.buyerId._id
        ? order.buyerId._id.toString()
        : order.buyerId.toString();

    let sellerIdStr =
      typeof order.sellerId === "object" && order.sellerId._id
        ? order.sellerId._id.toString()
        : order.sellerId.toString();

    let currentUserIdStr = req.user._id.toString();

    console.log("Review authorization check:");
    console.log(`Order buyerId: ${buyerIdStr}`);
    console.log(`Order sellerId: ${sellerIdStr}`);
    console.log(`Current user ID: ${currentUserIdStr}`);

    // Check if the user is either the buyer or seller of the order
    if (buyerIdStr !== currentUserIdStr && sellerIdStr !== currentUserIdStr) {
      console.log("Authorization failed: User is neither buyer nor seller");
      return res
        .status(403)
        .json({ message: "Not authorized to review this order" });
    }

    // Check if the reviewed user is part of the order
    const reviewedUserIdStr = reviewedUserId.toString();
    if (reviewedUserIdStr !== buyerIdStr && reviewedUserIdStr !== sellerIdStr) {
      return res
        .status(400)
        .json({ message: "Can only review users involved in the order" });
    }

    // Check if the user is not reviewing themselves
    if (reviewedUserIdStr === currentUserIdStr) {
      return res.status(400).json({ message: "Cannot review yourself" });
    }

    // Check if a review already exists for this order by this user
    const existingReview = await reviewService.getReviewByOrderAndReviewer(
      orderId,
      req.user._id
    );
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this order" });
    }

    const reviewData = {
      reviewerId: req.user._id,
      reviewedUserId,
      orderId,
      rating,
      comment,
    };

    const review = await reviewService.createReview(reviewData);
    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    next(error);
  }
};

/**
 * Get reviews for a user
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await reviewService.getUserReviews(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reviews submitted by a user
 */
exports.getReviewsByUser = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await reviewService.getReviewsByReviewer(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

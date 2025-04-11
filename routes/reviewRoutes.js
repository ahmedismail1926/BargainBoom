const express = require("express");
const { check } = require("express-validator");
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/auth");

const router = express.Router();

// Create a new review
router.post(
  "/",
  auth,
  [
    check("orderId", "Order ID is required").not().isEmpty(),
    check("reviewedUserId", "Reviewed user ID is required").not().isEmpty(),
    check("rating", "Rating is required and must be between 1 and 5").isInt({
      min: 1,
      max: 5,
    }),
    check("comment", "Comment is required").not().isEmpty(),
  ],
  reviewController.createReview
);

// Get reviews for a user
router.get("/user/:userId", reviewController.getUserReviews);

// Get reviews submitted by the current user
router.get("/my-reviews", auth, reviewController.getReviewsByUser);

module.exports = router;

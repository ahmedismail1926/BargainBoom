const Review = require('../models/Review');

/**
 * Create a new review
 */
exports.createReview = async (reviewData) => {
  const review = new Review(reviewData);
  await review.save();
  return review;
};

/**
 * Get review by order and reviewer
 */
exports.getReviewByOrderAndReviewer = async (orderId, reviewerId) => {
  return await Review.findOne({ orderId, reviewerId });
};

/**
 * Get reviews for a user
 */
exports.getUserReviews = async (userId, page, limit) => {
  const skip = (page - 1) * limit;
  
  const reviews = await Review.find({ reviewedUserId: userId })
    .populate('reviewerId', 'name')
    .populate('orderId', 'productId')
    .populate({
      path: 'orderId',
      populate: {
        path: 'productId',
        select: 'title'
      }
    })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);
  
  const total = await Review.countDocuments({ reviewedUserId: userId });
  
  return {
    reviews,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get reviews submitted by a reviewer
 */
exports.getReviewsByReviewer = async (reviewerId, page, limit) => {
  const skip = (page - 1) * limit;
  
  const reviews = await Review.find({ reviewerId })
    .populate('reviewedUserId', 'name')
    .populate('orderId', 'productId')
    .populate({
      path: 'orderId',
      populate: {
        path: 'productId',
        select: 'title'
      }
    })
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);
  
  const total = await Review.countDocuments({ reviewerId });
  
  return {
    reviews,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
};

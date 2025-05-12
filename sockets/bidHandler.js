const Product = require("../models/Product");
const AuctionBid = require("../models/AuctionBid");
const logger = require("../utils/logger");

module.exports = (io, socket) => {
  // Join a bidding room for a product
  socket.on("join-bidding", async (productId) => {
    try {
      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return socket.emit("error", { message: "Product not found" });
      }

      // Check if product is in auction mode
      if (!product.isAuction) {
        return socket.emit("error", {
          message: "This product is not in auction mode",
        });
      }

      const roomId = `bidding-${productId}`;
      socket.join(roomId);
      logger.info(
        `User ${socket.user._id} joined bidding room for product ${productId}`
      );

      try {
        // Get the current max bid info
        const maxBid = await AuctionBid.findOne({ productId })
          .sort({ bidAmount: -1 })
          .populate("buyerId", "name")
          .lean();

        // Send current product info to the user
        socket.emit("auction-status", {
          productId: product._id,
          currentPrice: maxBid ? maxBid.bidAmount : product.basePrice,
          bidderName: maxBid ? maxBid.buyerId.name : null,
          bidTime: maxBid ? maxBid.createdAt : null,
          auctionEndTime: product.auctionEndTime,
          endsIn: product.auctionEndTime
            ? product.auctionEndTime - new Date()
            : null,
        });
      } catch (error) {
        logger.error("Error getting max bid info:", error);

        // Fallback to product base price if max bid info fails
        socket.emit("auction-status", {
          productId: product._id,
          currentPrice: product.basePrice,
          auctionEndTime: product.auctionEndTime,
          endsIn: product.auctionEndTime
            ? product.auctionEndTime - new Date()
            : null,
        });
      }
    } catch (error) {
      logger.error("Error joining bidding room:", error);
      socket.emit("error", { message: "Failed to join bidding room" });
    }
  });

  // Place a bid
  socket.on("place-bid", async (data) => {
    try {
      const { productId, bidAmount } = data;

      // Validate bid amount
      if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
        return socket.emit("bid-error", { message: "Invalid bid amount" });
      }

      // Find the product
      const product = await Product.findById(productId);

      if (!product) {
        return socket.emit("bid-error", { message: "Product not found" });
      }

      if (!product.isAuction) {
        return socket.emit("bid-error", {
          message: "This product is not in auction mode",
        });
      }

      if (product.auctionEndTime < new Date()) {
        return socket.emit("bid-error", { message: "Auction has ended" });
      }

      // Get current max bid
      const currentMaxBid = await AuctionBid.findOne({ productId })
        .sort({ bidAmount: -1 })
        .lean();

      // Determine the minimum bid amount
      const minBidAmount = currentMaxBid
        ? currentMaxBid.bidAmount
        : product.basePrice;

      // Validate bid is higher than or equal to current price
      if (bidAmount < minBidAmount) {
        return socket.emit("bid-error", {
          message: `Bid must be at least ${minBidAmount}`,
        });
      }

      // Check if the user is not the seller
      if (product.sellerId.toString() === socket.user._id.toString()) {
        return socket.emit("bid-error", {
          message: "Sellers cannot bid on their own products",
        });
      }

      // Create the bid
      const bid = new AuctionBid({
        productId,
        buyerId: socket.user._id,
        bidAmount,
      });

      await bid.save();

      logger.info(
        `New socket bid created: ${bidAmount} by user ${socket.user._id} for product ${productId}`
      );

      // Update the product's base price to reflect the new max bid
      await Product.findByIdAndUpdate(
        productId,
        { basePrice: bidAmount },
        { new: true }
      );

      // Get bidder's name
      const bidderName = socket.user.name;

      // Emit the new bid to all users in the room
      const roomId = `bidding-${productId}`;
      io.to(roomId).emit("new-bid", {
        productId,
        bidAmount,
        bidderId: socket.user._id,
        bidderName,
        timestamp: new Date(),
      });

      // Notify the seller about the new bid
      const sellerRoom = `user-${product.sellerId}`;
      io.to(sellerRoom).emit("bid-notification", {
        productId,
        productTitle: product.title,
        bidAmount,
        bidderName,
        timestamp: new Date(),
      });

      logger.info(
        `Bid notification sent to seller ${product.sellerId} for product ${productId}`
      );
    } catch (error) {
      logger.error("Error placing bid:", error);
      socket.emit("bid-error", {
        message: "Failed to place bid: " + error.message,
      });
    }
  });

  // Leave bidding room
  socket.on("leave-bidding", (productId) => {
    const roomId = `bidding-${productId}`;
    socket.leave(roomId);
    logger.info(
      `User ${socket.user._id} left bidding room for product ${productId}`
    );
  });
};

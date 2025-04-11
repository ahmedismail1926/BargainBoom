const Product = require('../models/Product');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  // Join a bidding room for a product
  socket.on('join-bidding', async (productId) => {
    try {
      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return socket.emit('error', { message: 'Product not found' });
      }
      
      // Check if product is in auction mode
      if (!product.isAuction) {
        return socket.emit('error', { message: 'This product is not in auction mode' });
      }
      
      const roomId = `bidding-${productId}`;
      socket.join(roomId);
      logger.info(`User ${socket.user._id} joined bidding room for product ${productId}`);
      
      // Send current product info to the user
      socket.emit('auction-status', {
        productId: product._id,
        currentPrice: product.basePrice,
        auctionEndTime: product.auctionEndTime,
        endsIn: product.auctionEndTime ? product.auctionEndTime - new Date() : null
      });
    } catch (error) {
      logger.error('Error joining bidding room:', error);
      socket.emit('error', { message: 'Failed to join bidding room' });
    }
  });
  
  // Place a bid
  socket.on('place-bid', async (data) => {
    try {
      const { productId, bidAmount } = data;
      
      // Validate bid amount
      if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
        return socket.emit('bid-error', { message: 'Invalid bid amount' });
      }
      
      // Find the product
      const product = await Product.findById(productId);
      
      if (!product) {
        return socket.emit('bid-error', { message: 'Product not found' });
      }
      
      if (!product.isAuction) {
        return socket.emit('bid-error', { message: 'This product is not in auction mode' });
      }
      
      if (product.auctionEndTime < new Date()) {
        return socket.emit('bid-error', { message: 'Auction has ended' });
      }
      
      // Validate bid is higher than current price
      if (bidAmount <= product.basePrice) {
        return socket.emit('bid-error', { 
          message: `Bid must be higher than the current price of ${product.basePrice}`
        });
      }
      
      // Check if the user is not the seller
      if (product.sellerId.toString() === socket.user._id.toString()) {
        return socket.emit('bid-error', { message: 'Sellers cannot bid on their own products' });
      }
      
      // Update the product's base price (current highest bid)
      product.basePrice = bidAmount;
      await product.save();
      
      // Get bidder's name
      const bidderName = socket.user.name;
      
      // Emit the new bid to all users in the room
      const roomId = `bidding-${productId}`;
      io.to(roomId).emit('new-bid', {
        productId,
        bidAmount,
        bidderId: socket.user._id,
        bidderName,
        timestamp: new Date()
      });
      
      // Notify the seller about the new bid
      notifySellerAboutBid(io, product.sellerId, {
        productId,
        productTitle: product.title,
        bidAmount,
        bidderName
      });
    } catch (error) {
      logger.error('Error placing bid:', error);
      socket.emit('bid-error', { message: 'Failed to place bid' });
    }
  });
  
  // Leave bidding room
  socket.on('leave-bidding', (productId) => {
    const roomId = `bidding-${productId}`;
    socket.leave(roomId);
    logger.info(`User ${socket.user._id} left bidding room for product ${productId}`);
  });
};

// Helper function to notify sellers about new bids
async function notifySellerAboutBid(io, sellerId, bidData) {
  // Find the seller's socket
  const sellerSocketId = getUserSocketId(io, sellerId);
  
  if (sellerSocketId) {
    io.to(sellerSocketId).emit('bid-notification', {
      productId: bidData.productId,
      productTitle: bidData.productTitle,
      bidAmount: bidData.bidAmount,
      bidderName: bidData.bidderName,
      timestamp: new Date()
    });
  }
}

// Helper function to find a user's socket
function getUserSocketId(io, userId) {
  const sockets = io.sockets.sockets;
  for (const [socketId, socket] of sockets) {
    if (socket.user && socket.user._id.toString() === userId.toString()) {
      return socketId;
    }
  }
  return null;
}
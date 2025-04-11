const { validationResult } = require('express-validator');
const orderService = require('../services/orderService');
const productService = require('../services/productService');

exports.createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { productId, quantity } = req.body;
    
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (product.status !== 'available') {
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }
    if (quantity > product.quantity) {
      return res.status(400).json({ message: 'Requested quantity exceeds available quantity' });
    }
    if (product.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Sellers cannot purchase their own products' });
    }
    const orderData = {
      productId,
      buyerId: req.user._id,
      sellerId: product.sellerId,
      quantity,
      price: product.basePrice
    };
    const order = await orderService.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};
exports.createOrderFromOffer = async (req, res, next) => {
  try {
    const { offerId } = req.body;
    
    const order = await orderService.createOrderFromOffer(offerId, req.user._id);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};
/**
 * Get buyer's orders
 */
exports.getBuyerOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;  
    const filters = {
      buyerId: req.user._id
    };
    
    if (status) filters.status = status;
    
    const orders = await orderService.getOrders(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

/**
 * Get seller's orders
 */
exports.getSellerOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filters = {
      sellerId: req.user._id
    };
    
    if (status) filters.status = status;
    
    const orders = await orderService.getOrders(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    
    const order = await orderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if the user is either the buyer or seller
    if (
      order.buyerId.toString() !== req.user._id.toString() &&
      order.sellerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const orderId = req.params.id;
    const { status } = req.body;
    
    const order = await orderService.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check permissions based on the status update
    switch (status) {
      case 'shipped':
        // Only sellers can mark as shipped
        if (order.sellerId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Only sellers can mark orders as shipped' });
        }
        break;
      case 'completed':
        // Only buyers can mark as completed
        if (order.buyerId.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Only buyers can mark orders as completed' });
        }
        break;
      case 'cancelled':
        // Either buyer or seller can cancel
        if (
          order.buyerId.toString() !== req.user._id.toString() &&
          order.sellerId.toString() !== req.user._id.toString()
        ) {
          return res.status(403).json({ message: 'Not authorized to cancel this order' });
        }
        break;
      default:
        return res.status(400).json({ message: 'Invalid status update' });
    }
    
    const updatedOrder = await orderService.updateOrderStatus(orderId, status);
    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};
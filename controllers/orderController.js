const { validationResult } = require("express-validator");
const orderService = require("../services/orderService");
const productService = require("../services/productService");

exports.createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;

    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.status !== "available") {
      return res
        .status(400)
        .json({ message: "Product is not available for purchase" });
    }
    if (quantity > product.quantity) {
      return res
        .status(400)
        .json({ message: "Requested quantity exceeds available quantity" });
    }
    if (product.sellerId.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Sellers cannot purchase their own products" });
    }
    const orderData = {
      productId,
      buyerId: req.user._id,
      sellerId: product.sellerId,
      quantity,
      price: product.basePrice,
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

    const order = await orderService.createOrderFromOffer(
      offerId,
      req.user._id
    );
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
      buyerId: req.user._id,
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
      sellerId: req.user._id,
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
    console.log("Looking up order with ID:", orderId);
    console.log("User making request:", req.user._id);

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      console.log("Order not found in controller");
      return res.status(404).json({ message: "Order not found" });
    }

    // Handle case where buyerId might be populated or a raw ObjectId
    let buyerIdToCompare = order.buyerId;
    if (order.buyerId && order.buyerId._id) {
      buyerIdToCompare = order.buyerId._id;
    }

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = order.sellerId;
    if (order.sellerId && order.sellerId._id) {
      sellerIdToCompare = order.sellerId._id;
    }

    console.log("Order authorization check:");
    console.log("Buyer ID to compare:", String(buyerIdToCompare));
    console.log("Seller ID to compare:", String(sellerIdToCompare));
    console.log("User ID:", String(req.user._id));

    // Check if the user is either the buyer or seller
    if (
      String(buyerIdToCompare) !== String(req.user._id) &&
      String(sellerIdToCompare) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error in getOrderById:", error);
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

    console.log(`Attempting to update order ${orderId} to status: ${status}`);
    console.log(
      "User ID making request:",
      req.user._id,
      "with role:",
      req.user.role
    );

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      console.log("Order not found during status update");
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("Order found:", {
      id: order._id,
      currentStatus: order.status,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
    });

    // Handle case where buyerId might be populated or a raw ObjectId
    let buyerIdToCompare = order.buyerId;
    if (order.buyerId && order.buyerId._id) {
      buyerIdToCompare = order.buyerId._id;
    }

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = order.sellerId;
    if (order.sellerId && order.sellerId._id) {
      sellerIdToCompare = order.sellerId._id;
    }

    console.log("Extracted IDs for comparison:");
    console.log("Buyer ID:", String(buyerIdToCompare));
    console.log("Seller ID:", String(sellerIdToCompare));
    console.log("User ID:", String(req.user._id));

    // Check permissions based on the status update
    switch (status) {
      case "shipped":
        // Only sellers can mark as shipped
        if (String(sellerIdToCompare) !== String(req.user._id)) {
          console.log("Authorization failed: User is not the seller");
          return res
            .status(403)
            .json({ message: "Only sellers can mark orders as shipped" });
        }
        break;
      case "completed":
        // Only buyers can mark as completed
        if (String(buyerIdToCompare) !== String(req.user._id)) {
          console.log("Authorization failed: User is not the buyer");
          return res
            .status(403)
            .json({ message: "Only buyers can mark orders as completed" });
        }
        break;
      case "cancelled":
        // Either buyer or seller can cancel
        if (
          String(buyerIdToCompare) !== String(req.user._id) &&
          String(sellerIdToCompare) !== String(req.user._id)
        ) {
          console.log("Authorization failed: User is neither buyer nor seller");
          return res
            .status(403)
            .json({ message: "Not authorized to cancel this order" });
        }
        break;
      default:
        return res.status(400).json({ message: "Invalid status update" });
    }

    console.log("Authorization passed, updating order status");
    const updatedOrder = await orderService.updateOrderStatus(orderId, status);
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    next(error);
  }
};

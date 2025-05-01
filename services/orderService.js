const Order = require("../models/Order");
const offerService = require("./offerService");
const productService = require("./productService");

exports.createOrder = async (orderData) => {
  const order = new Order(orderData);
  await order.save();

  await productService.updateProductQuantity(
    orderData.productId,
    orderData.quantity
  );

  return order;
};
exports.createOrderFromOffer = async (offerId, buyerId) => {
  const offer = await offerService.getOfferById(offerId);
  if (!offer) {
    throw new Error("Offer not found");
  }
  if (offer.status !== "accepted") {
    throw new Error("Offer is not accepted");
  }
  if (offer.buyerId._id.toString() !== buyerId.toString()) {
    throw new Error("Not authorized to create an order from this offer");
  }

  const product = await productService.getProductById(offer.productId._id);

  if (!product) {
    throw new Error("Product not found");
  }
  const orderData = {
    productId: product._id,
    buyerId: offer.buyerId._id,
    sellerId: product.sellerId,
    quantity: 1, // Default to 1
    price: offer.offerPrice,
  };

  const order = await exports.createOrder(orderData);
  return order;
};
exports.getOrders = async (filters, page, limit) => {
  const skip = (page - 1) * limit;
  const orders = await Order.find(filters)
    .populate("productId", "title imageUrls")
    .populate("buyerId", "name")
    .populate("sellerId", "name")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);
  const total = await Order.countDocuments(filters);

  return {
    orders,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  };
};
exports.getOrderById = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("productId")
    .populate("buyerId", "name")
    .populate("sellerId", "name");

  // Add debug logging to see what's being returned
  if (order) {
    console.log("Order found:", {
      id: order._id,
      buyerIdType: typeof order.buyerId,
      buyerId: order.buyerId._id
        ? order.buyerId._id.toString()
        : order.buyerId.toString(),
      sellerIdType: typeof order.sellerId,
      sellerId: order.sellerId._id
        ? order.sellerId._id.toString()
        : order.sellerId.toString(),
    });
  } else {
    console.log("Order not found for ID:", orderId);
  }

  return order;
};
exports.updateOrderStatus = async (orderId, status) => {
  return await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status,
        updatedAt: Date.now(),
      },
    },
    { new: true }
  );
};

const { validationResult } = require("express-validator");
const offerService = require("../services/offerService");
const productService = require("../services/productService");
//counteroffer
exports.createOffer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, offerPrice } = req.body;
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.status !== "available") {
      return res
        .status(400)
        .json({ message: "Product is not available for offers" });
    }
    if (product.isAuction) {
      return res
        .status(400)
        .json({ message: "Cannot make counter offers on auction items" });
    }
    if (product.sellerId.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Sellers cannot make offers on their own products" });
    }

    const offerData = {
      productId,
      buyerId: req.user._id,
      offerPrice,
    };

    const offer = await offerService.createOffer(offerData);
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
};
//seller's view
exports.getProductOffers = async (req, res, next) => {
  try {
    const productId = req.params.productId;

    // Check if the product exists
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = product.sellerId;
    if (product.sellerId && product.sellerId._id) {
      sellerIdToCompare = product.sellerId._id;
    }

    // Compare as strings to ensure consistent comparison
    if (String(sellerIdToCompare) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to view offers for this product" });
    }

    const offers = await offerService.getOffersByProduct(productId);
    res.status(200).json(offers);
  } catch (error) {
    next(error);
  }
};
exports.getBuyerOffers = async (req, res, next) => {
  try {
    const offers = await offerService.getOffersByBuyer(req.user._id);
    res.status(200).json(offers);
  } catch (error) {
    next(error);
  }
};
exports.updateOfferStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, counterPrice } = req.body;
    const offerId = req.params.id;

    const offer = await offerService.getOfferById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Handle case where productId might be populated or a raw ObjectId
    let productId = offer.productId;
    if (offer.productId && offer.productId._id) {
      productId = offer.productId._id;
    }

    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Handle case where sellerId might be populated or a raw ObjectId
    let sellerIdToCompare = product.sellerId;
    if (product.sellerId && product.sellerId._id) {
      sellerIdToCompare = product.sellerId._id;
    }

    // Compare as strings to ensure consistent comparison
    if (String(sellerIdToCompare) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this offer" });
    }

    // If status is countered, counterPrice is required
    if (status === "countered" && !counterPrice) {
      return res.status(400).json({
        message: "Counter price is required when countering an offer",
      });
    }

    const updatedOffer = await offerService.updateOfferStatus(
      offerId,
      status,
      counterPrice
    );
    res.status(200).json(updatedOffer);
  } catch (error) {
    next(error);
  }
};

const CounterOffer = require('../models/CounterOffer');
const productService = require('./productService');

exports.createOffer = async (offerData) => {
  const offer = new CounterOffer(offerData);
  await offer.save();
  return offer;
};
exports.getOfferById = async (offerId) => {
  return await CounterOffer.findById(offerId)
    .populate('productId')
    .populate('buyerId', 'name');
};


exports.getOffersByProduct = async (productId) => {
  return await CounterOffer.find({ productId })
    .populate('buyerId', 'name')
    .populate('productId', 'title basePrice')
    .sort('-createdAt');
};

exports.getOffersByBuyer = async (buyerId) => {
  return await CounterOffer.find({ buyerId })
    .populate('productId')
    .sort('-createdAt');
};
exports.updateOfferStatus = async (offerId, status, counterPrice) => {
  const updateData = { status };
  
  // If the status is countered, update the offer price
  if (status === 'countered' && counterPrice) {
    updateData.offerPrice = counterPrice;
  }
  
  return await CounterOffer.findByIdAndUpdate(
    offerId,
    { $set: updateData },
    { new: true }
  );
};
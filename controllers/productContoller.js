const { validationResult } = require('express-validator');
const productService = require('../services/productService');

exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const productData = {
      ...req.body,
      sellerId: req.user._id
    };
    const product = await productService.createProduct(productData);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};
// to change the limit dependingo n the frontend dw
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, isAuction, minPrice, maxPrice, sort } = req.query;
    
    const filters = {};
    
    if (category) filters.category = category;
    if (isAuction !== undefined) filters.isAuction = isAuction === 'true';
    if (minPrice !== undefined) filters.basePrice = { $gte: parseFloat(minPrice) };
    if (maxPrice !== undefined) {
      if (filters.basePrice) {
        filters.basePrice.$lte = parseFloat(maxPrice);
      } else {
        filters.basePrice = { $lte: parseFloat(maxPrice) };
      }
    }
    
    //by default show default...............
    filters.status = 'available';
    const products = await productService.getProducts(
      filters,
      parseInt(page),
      parseInt(limit),
      sort
    );
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};
exports.getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};
exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Checkingif the user is the seller
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }   
    const updatedProduct = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }
    await productService.deleteProduct(req.params.id);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
exports.getSellerProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filters = {
      sellerId: req.user._id
    };
    
    if (status) filters.status = status;
    
    const products = await productService.getProducts(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};
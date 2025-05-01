const { validationResult } = require("express-validator");
const productService = require("../services/productService");

exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user) {
      console.log("Authentication failure: No user object in request");
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if the user is a seller
    if (req.user.role !== "seller") {
      console.log(
        `User role (${req.user.role}) is not authorized to create products`
      );
      return res
        .status(403)
        .json({ message: "Only sellers can create products" });
    }

    console.log(`Authorized seller (${req.user._id}) creating product`);

    const productData = {
      ...req.body,
      sellerId: req.user._id,
    };
    const product = await productService.createProduct(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error("Product creation error:", error);
    next(error);
  }
};
// to change the limit dependingo n the frontend dw
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      isAuction,
      minPrice,
      maxPrice,
      sort,
    } = req.query;

    const filters = {};

    if (category) filters.category = category;
    if (isAuction !== undefined) filters.isAuction = isAuction === "true";
    if (minPrice !== undefined)
      filters.basePrice = { $gte: parseFloat(minPrice) };
    if (maxPrice !== undefined) {
      if (filters.basePrice) {
        filters.basePrice.$lte = parseFloat(maxPrice);
      } else {
        filters.basePrice = { $lte: parseFloat(maxPrice) };
      }
    }

    filters.status = "available";
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
      return res.status(404).json({ message: "Product not found" });
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
      return res.status(404).json({ message: "Product not found" });
    }

    // Enhanced debugging - log what we're actually comparing
    console.log("PRODUCT UPDATE AUTHORIZATION CHECK:");
    console.log("Product: ", product._id, product.title);
    console.log("Product sellerId (object): ", product.sellerId);
    console.log("Product sellerId (string): ", String(product.sellerId));
    console.log("User _id (from req): ", req.user._id);

    // The critical issue might be that product.sellerId is not directly populated
    // It might be nested inside a sellerId object due to population
    let sellerIdToCompare = product.sellerId;

    // Handle case where sellerId might be populated
    if (product.sellerId && product.sellerId._id) {
      sellerIdToCompare = product.sellerId._id;
      console.log("Using nested _id from populated sellerId");
    }

    console.log("Final comparison values:");
    console.log("Seller ID for comparison: ", String(sellerIdToCompare));
    console.log("User ID for comparison: ", String(req.user._id));

    // Try multiple comparison strategies to handle different object types
    if (
      String(sellerIdToCompare) !== String(req.user._id) &&
      sellerIdToCompare.toString() !== req.user._id.toString()
    ) {
      console.log("❌ Authorization failed - IDs don't match");
      return res
        .status(403)
        .json({ message: "Not authorized to update this product" });
    }

    console.log("✅ Authorization successful - updating product");

    const updatedProduct = await productService.updateProduct(
      req.params.id,
      req.body
    );
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    next(error);
  }
};
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

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
        .json({ message: "Not authorized to delete this product" });
    }

    await productService.deleteProduct(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    next(error);
  }
};
exports.getSellerProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filters = {
      sellerId: req.user._id,
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

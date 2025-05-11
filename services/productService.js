const Product = require('../models/Product');

exports.createProduct = async (productData) => {
  const product = new Product(productData);
  await product.save();
  return product;
};
exports.getProducts = async (filters, page, limit, sort = '-createdAt') => {
  const skip = (page - 1) * limit;
  
  const sortOption = {};
  
  // Parse sort string (e.g., 'price' or '-price')
  if (sort) {
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortOption[sortField] = sortOrder;
  }
  
  const products = await Product.find(filters)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate('sellerId', 'name');
  
  const total = await Product.countDocuments(filters);
  
  return {
    products,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
};

exports.getProductById = async (productId) => {
  return await Product.findById(productId).populate('sellerId', 'name');
};

exports.updateProduct = async (productId, updateData) => {
  updateData.updatedAt = Date.now();
  
  return await Product.findByIdAndUpdate(
    productId,
    { $set: updateData },
    { new: true }
  );
};

exports.deleteProduct = async (productId) => {
  return await Product.findByIdAndDelete(productId);
};
exports.updateProductQuantity = async (productId, quantityToReduce) => {
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  if (product.quantity < quantityToReduce) {
    throw new Error('Insufficient product quantity');
  }
  
  product.quantity -= quantityToReduce;
  
  if (product.quantity === 0) {
    product.status = 'sold';
  }
  await product.save();
  return product;
};

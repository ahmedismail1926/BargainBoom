const authService = require('../services/authService');
const { validationResult } = require('express-validator');
exports.register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, password, role } = req.body;
    
    const result = await authService.register({
      name,
      email,
      passwordHash: password, // Will be hashed in the model's pre-save hook
      role: role || 'buyer'
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
exports.getCurrentUser = async (req, res) => {
  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
};
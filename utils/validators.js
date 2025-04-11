const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Common validation rules
 */
exports.idValidator = (fieldName = 'id', location = 'params') => {
  const validator = mongoose.Types.ObjectId.isValid;
  
  if (location === 'params') {
    return param(fieldName).custom(value => {
      if (!validator(value)) {
        throw new Error(`Invalid ${fieldName} format`);
      }
      return true;
    });
  } else if (location === 'body') {
    return body(fieldName).custom(value => {
      if (!validator(value)) {
        throw new Error(`Invalid ${fieldName} format`);
      }
      return true;
    });
  } else if (location === 'query') {
    return query(fieldName).custom(value => {
      if (!validator(value)) {
        throw new Error(`Invalid ${fieldName} format`);
      }
      return true;
    });
  }
};

exports.paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Example user validators
exports.userCreateValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['buyer', 'seller']).withMessage('Role must be either buyer or seller')
];
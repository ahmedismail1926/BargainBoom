const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.stack);
  
  // Check if error is an API error with specific status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      message: err.message
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate value entered'
    });
  }
  
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      message: errors.join(', ')
    });
  }
  
  // Default to 500 server error
  res.status(500).json({
    message: 'Server error'
  });
};
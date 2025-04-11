exports.successResponse = (res, data, message = 'Operation successful', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  };
  
  exports.errorResponse = (res, message = 'Operation failed', statusCode = 400, errors = null) => {
    const response = {
      success: false,
      message
    };
    
    if (errors) {
      response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
  };
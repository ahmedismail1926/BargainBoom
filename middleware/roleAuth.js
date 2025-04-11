/**
 * Role-based authorization middleware
 * @param {Array} roles - Array of allowed roles
 */
module.exports = (roles = []) => {
    // Convert single role to array if not already
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized - Authentication required' });
      }
      
      // Check if user's role is in the allowed roles
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
      }
      
      next();
    };
  };
  
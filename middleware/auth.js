const passport = require("passport");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

module.exports = (req, res, next) => {
  // Log the incoming authorization header (with redaction for security)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    console.log("Auth header present:", authHeader.substring(0, 15) + "...");

    // Try manual verification for debugging
    try {
      const token = authHeader.split(" ")[1];
      if (token) {
        // Just decode without verification to see payload
        const decoded = jwt.decode(token);
        console.log("Token payload (decoded without verification):", decoded);
      }
    } catch (err) {
      console.log("Error decoding token:", err.message);
    }
  } else {
    console.log("No authorization header found");
  }

  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Auth middleware error:", err);
      return next(err);
    }

    if (!user) {
      console.log(
        "Authentication failed:",
        info ? info.message : "Unknown reason"
      );
      return res.status(401).json({
        message:
          info && info.message
            ? info.message
            : "Unauthorized - Authentication required",
      });
    }

    console.log(
      `User authenticated successfully: ${user._id} (role: ${user.role})`
    );

    // Add user to request
    req.user = user;
    next();
  })(req, res, next);
};

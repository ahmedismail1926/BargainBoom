const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env"); // Import from env.js instead of hardcoding
//mos auc
// Add debugging to see what secret is being used for verification
console.log(
  "JWT_SECRET in passport.js:",
  JWT_SECRET
    ? `${JWT_SECRET.substring(0, 3)}...${JWT_SECRET.substring(
        JWT_SECRET.length - 3
      )}`
    : "undefined"
);

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(options, async (payload, done) => {
    try {
      console.log("JWT payload received:", payload);
      const user = await User.findById(payload.id);

      if (user) {
        // Ensure user._id is available as a string to match product.sellerId correctly
        return done(null, {
          _id: user._id.toString(),
          id: user._id.toString(), // Add this for compatibility
          name: user.name,
          email: user.email,
          role: user.role,
        });
      }
      return done(null, false, { message: "User not found" });
    } catch (error) {
      console.error("JWT verification error:", error.message);
      return done(error, false);
    }
  })
);

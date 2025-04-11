const passport = require("passport");

module.exports = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      const errorMessage = info?.message || "No valid token provided";
      return res
        .status(401)
        .json({ message: `Unauthorized - ${errorMessage}` });
    }
    req.user = user;
    next();
  })(req, res, next);
};

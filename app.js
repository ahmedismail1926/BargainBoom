const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const passport = require("passport");
const { connect } = require("./config/db");
const errorMiddleware = require("./middleware/error");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config/env");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const offerRoutes = require("./routes/offerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const messageRoutes = require("./routes/messageRoutes");
const auctionRoutes = require("./routes/auctionRoutes");
const app = express();
connect();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize passport before setting up routes
require("./config/passport");
app.use(passport.initialize());

// Add a test route to verify JWT
app.get("/api/test-token", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      message: "Token is valid",
      decoded,
      secret:
        JWT_SECRET.substring(0, 3) +
        "..." +
        JWT_SECRET.substring(JWT_SECRET.length - 3),
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token: " + error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/auctions", auctionRoutes);

app.use(errorMiddleware);

module.exports = app;

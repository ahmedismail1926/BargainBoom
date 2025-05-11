const express = require("express");
const { check } = require("express-validator");
const productController = require("../controllers/productContoller");
const auth = require("../middleware/auth");

const router = express.Router();

// Move the seller route before the :id routes to prevent path conflicts
router.get("/seller/me", auth, productController.getSellerProducts);

router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// create //error here because of auth
router.post(
  "/",
  auth,
  [
    check("title", "Title is required").not().isEmpty(),
    check("description", "Description is required").not().isEmpty(),
    check(
      "basePrice",
      "Base price is required and must be a positive number"
    ).isFloat({ min: 0 }),
    check(
      "quantity",
      "Quantity is required and must be a positive integer"
    ).isInt({ min: 1 }),
    check("category", "Category is required").not().isEmpty(),
    check("isAuction", "isAuction must be a boolean").optional().isBoolean(),
    check("auctionEndTime", "Auction end time must be a valid date")
      .optional()
      .isISO8601(),
  ],
  productController.createProduct
);

router.put(
  "/:id",
  auth,
  [
    check("title", "Title is required").optional().not().isEmpty(),
    check("description", "Description is required").optional().not().isEmpty(),
    check("basePrice", "Base price must be a positive number")
      .optional()
      .isFloat({ min: 0 }),
    check("quantity", "Quantity must be a positive integer")
      .optional()
      .isInt({ min: 1 }),
    check("category", "Category is required").optional().not().isEmpty(),
    check("status", "Status must be valid")
      .optional()
      .isIn(["available", "sold", "inactive"]),
    check("isAuction", "isAuction must be a boolean").optional().isBoolean(),
    check("auctionEndTime", "Auction end time must be a valid date")
      .optional()
      .isISO8601(),
  ],
  productController.updateProduct
);

router.delete("/:id", auth, productController.deleteProduct);

module.exports = router;

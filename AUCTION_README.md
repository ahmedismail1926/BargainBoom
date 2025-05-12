# Auction Functionality Testing Instructions

This README provides step-by-step instructions for testing the auction functionality in the BragginBoom e-commerce application.

## Prerequisites

- Node.js and npm installed
- MongoDB running locally or connection to MongoDB Atlas
- Required environment variables set in `config.env`

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

## Automated Testing

An automated test script is provided to validate the auction functionality:

```
node utils/testAuction.js
```

This script will:
- Create a test auction product
- Create test users and place bids
- Validate that the max bid is tracked correctly
- Clean up the test data

## Manual Testing Using Postman or REST Client

### 1. Create an Auction Product

Make a POST request to `/api/products` with:

```json
{
  "title": "Test Auction Item",
  "description": "This is a test auction item",
  "basePrice": 100,
  "quantity": 1,
  "category": "Electronics",
  "isAuction": true,
  "auctionEndTime": "2025-06-12T00:00:00.000Z"
}
```

Include an Authorization header with your seller's JWT token.

### 2. Get the Product ID

Make a GET request to `/api/products` to list all products and find the ID of your auction product.

### 3. Place Bids

Make POST requests to `/api/auctions` with:

```json
{
  "productId": "YOUR_PRODUCT_ID",
  "bidAmount": 110
}
```

Include an Authorization header with your buyer's JWT token.

Try placing multiple bids with different users to test the bidding process.

### 4. Get Max Bid

Make a GET request to `/api/auctions/max-bid/YOUR_PRODUCT_ID` to verify the current max bid.

## Testing with WebSockets

You can use a WebSocket client like Postman or Socket.IO client to test real-time functionality:

1. Connect to the WebSocket server with your JWT token
2. Join a bidding room: `join-bidding` with product ID
3. Listen for `auction-status` and `new-bid` events
4. Place bids using the `place-bid` event

## Expected Behavior

- New bids must be greater than or equal to the current max bid
- When a new bid is placed, all connected clients should receive the update
- The product's basePrice should be updated to reflect the max bid
- The seller should receive notifications when new bids are placed

## For More Information

See the detailed documentation in `AUCTION_DOCS.md`.

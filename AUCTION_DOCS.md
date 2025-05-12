# Auction Functionality Documentation

## Overview

This document explains the improved auction functionality in the BragginBoom e-commerce application. The implementation allows sellers to create auction-style listings and buyers to place bids, with real-time updates for all users.

## Key Features

1. **Max Offer Price Tracking**: 
   - The system tracks and returns the maximum offer price for auction products
   - The max offer price is displayed on the frontend
   - New offers must be greater than or equal to the current max offer

2. **Real-time Bidding**:
   - WebSocket implementation allows real-time bid updates
   - All buyers can see the current max offer
   - Notifications are sent to the seller when new bids are placed

3. **API Endpoints**:
   - RESTful endpoints for creating bids and retrieving max bid information
   - Socket.io integration for real-time updates

## Implementation Details

### Models

1. **AuctionBid Model**:
   - `productId`: Reference to the Product model
   - `buyerId`: Reference to the User model (the bidder)
   - `bidAmount`: The amount of the bid
   - `createdAt`: Timestamp of when the bid was created

2. **Product Model** (auction-related fields):
   - `isAuction`: Boolean indicating if the product is an auction
   - `auctionEndTime`: Date when the auction ends
   - `basePrice`: Used to track the current highest bid amount

### Services

1. **Auction Service**:
   - `createBid()`: Creates a new bid and updates the product's max bid
   - `getMaxBid()`: Retrieves the maximum bid for a product
   - `getBidsByProduct()`: Gets all bids for a product
   - `getBidsByBuyer()`: Gets all bids by a specific buyer

### API Endpoints

1. **Create Bid**:
   - `POST /api/auctions`
   - Requires authentication
   - Required fields: `productId`, `bidAmount`

2. **Get Max Bid**:
   - `GET /api/auctions/max-bid/:productId`
   - Returns current max bid information

3. **Get Bids by Product**:
   - `GET /api/auctions/product/:productId`
   - Returns all bids for a product sorted by bid amount (highest first)

4. **Get Bids by Buyer**:
   - `GET /api/auctions/my-bids`
   - Requires authentication
   - Returns all bids made by the authenticated user

5. **Get Auction End Time**:
   - `GET /api/auctions/end-time/:productId`
   - Returns information about the auction end time
   - Includes formatted end time and whether the auction has ended

### WebSocket Events

1. **join-bidding**:
   - Client event to join a product's bidding room
   - Server responds with current auction status

2. **place-bid**:
   - Client event to place a bid
   - Server validates and broadcasts the new bid to all users in the room

3. **new-bid**:
   - Server event sent to all users in a bidding room when a new bid is placed

4. **bid-notification**:
   - Server event sent to the seller when a new bid is placed on their product

## Testing Instructions

### Automated Testing

1. Run the test script to validate the auction functionality:
   ```
   node utils/testAuction.js
   ```

   This script will:
   - Create a test auction product
   - Create test users and place bids
   - Validate that the max bid is tracked correctly
   - Clean up the test data

### Manual Testing

#### Setting Up an Auction Product

1. Log in as a seller
2. Create a new product and set `isAuction` to `true`
3. Set an `auctionEndTime` in the future
4. Set a starting price in the `basePrice` field

#### Testing Bidding

1. Log in as a buyer
2. Navigate to the auction product
3. Place a bid greater than or equal to the current max bid
4. Verify that the bid is accepted and the max bid is updated

#### Testing Invalid Bids

1. Try to place a bid lower than the current max bid
2. Verify that the system rejects the bid with an appropriate error message

#### Testing Real-time Updates

1. Open the same auction product in two different browsers/tabs
2. Log in as different buyers in each
3. Place a bid in one browser
4. Verify that the other browser receives the update in real-time without refreshing

## API Usage Examples

### Creating a Bid

```javascript
// Example: Creating a bid via API
fetch('/api/auctions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    productId: '60f7a3c5e8a3f1234567890a',
    bidAmount: 150.00
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### Getting the Max Bid

```javascript
// Example: Retrieving max bid information
fetch('/api/auctions/max-bid/60f7a3c5e8a3f1234567890a')
.then(response => response.json())
.then(data => {
  console.log('Current max bid:', data.data.currentMaxBid);
  console.log('Bidder:', data.data.bidderName);
})
.catch(error => console.error('Error:', error));
```

### Getting the Auction End Time

```javascript
// Example: Retrieving auction end time
fetch('/api/auctions/end-time/60f7a3c5e8a3f1234567890a')
.then(response => response.json())
.then(data => {
  console.log('Auction end time:', new Date(data.data.auctionEndTime).toLocaleString());
  console.log('Has auction ended?', data.data.hasEnded ? 'Yes' : 'No');
  console.log('Formatted end time:', data.data.formattedEndTime);
})
.catch(error => console.error('Error:', error));
```

### WebSocket Integration

```javascript
// Example: Connecting to WebSocket and joining a bidding room
const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Join a bidding room
socket.emit('join-bidding', '60f7a3c5e8a3f1234567890a');

// Listen for auction status
socket.on('auction-status', (data) => {
  console.log('Current price:', data.currentPrice);
  console.log('Bidder:', data.bidderName);
  console.log('Auction ends in:', data.endsIn);
});

// Listen for new bids
socket.on('new-bid', (data) => {
  console.log(`New bid of $${data.bidAmount} by ${data.bidderName}`);
  // Update UI with new bid information
});

// Place a bid
socket.emit('place-bid', {
  productId: '60f7a3c5e8a3f1234567890a',
  bidAmount: 160.00
});

// Handle bid errors
socket.on('bid-error', (error) => {
  console.error('Bid error:', error.message);
});
```

## Troubleshooting

### Common Issues

1. **Bid not being accepted**:
   - Ensure the bid amount is greater than or equal to the current max bid
   - Verify the auction end time hasn't passed
   - Check that you're not the seller of the product

2. **Real-time updates not working**:
   - Ensure WebSocket connection is established
   - Verify you've joined the correct bidding room
   - Check for any connection errors in the browser console

3. **Max bid not updating correctly**:
   - Verify the bid was successfully created (check database)
   - Ensure the product's basePrice is being updated with the max bid

### Logging

Check the application logs for detailed error information:
- `logs/combined.log` - Contains all application logs
- `logs/error.log` - Contains only error logs

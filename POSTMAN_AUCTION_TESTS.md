# Auction Functionality Postman Tests

## Overview

This document provides Postman requests for testing the auction functionality. Import these requests into Postman to test the auction system.

## 1. Authentication

### Login as Buyer

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
    "email": "buyer@example.com",
    "password": "yourpassword"
}
```

Save the token from the response for use in subsequent requests.

## 2. Get Auction End Time

### Request

```
GET http://localhost:5000/api/auctions/end-time/{{productId}}
```

Replace `{{productId}}` with an actual auction product ID.

### Example Response

```json
{
    "success": true,
    "data": {
        "productId": "645f3d2a1e3a4f32a0b7c8d9",
        "auctionEndTime": "2025-06-01T00:00:00.000Z",
        "hasEnded": false,
        "formattedEndTime": "2025-06-01T00:00:00.000Z"
    },
    "message": "Auction end time retrieved successfully"
}
```
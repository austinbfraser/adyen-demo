# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Adyen payment integration demo application built with React, Vite, and Express. The project demonstrates integration with Adyen's payment platform for various payment methods including cards, Google Pay, iDEAL, Klarna, and SEPA.

## Architecture

### Dual-Server Setup

The application has a unique architecture with two distinct servers:

1. **Express Backend Server** (`index.js`): Handles Adyen API integration and payment processing
   - Runs on port 8080 (configurable via `PORT` env var)
   - Provides payment API endpoints under `/api/*`
   - Manages payment methods, payment submission, and redirect handling
   - Configured to use Adyen's TEST environment

2. **Vite Frontend Dev Server**: Serves the React application during development
   - Default Vite port (5173)
   - Hot Module Replacement (HMR) enabled
   - Uses TanStack Router for client-side routing

### Key Components

- **Adyen Integration**: Backend uses `@adyen/api-library` with CheckoutAPI for payment operations
- **Frontend Framework**: React 19 with Vite 8 for fast development and builds
- **Routing**: TanStack Router configured with auto code-splitting
- **Styling**: CSS-based (App.css, index.css)

### Environment Configuration

The backend requires environment variables in `.env`:
- `ADYEN_API_KEY`: Adyen API key for authentication
- `ADYEN_MERCHANT_ACCOUNT`: Merchant account identifier
- `ADYEN_CLIENT_KEY`: Client-side key for Adyen components
- `ADYEN_HMAC_KEY`: (Optional) For webhook signature validation
- `PORT`: (Optional) Server port, defaults to 8080

## Development Commands

### Running the Application

```bash
# Start Vite dev server (frontend only)
npm run dev

# Start Express backend server
node index.js
```

**Note**: For full functionality, you need to run both servers:
1. `npm run dev` for the React frontend (with HMR)
2. `node index.js` for the Express backend (Adyen API)

### Building and Linting

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Payment Flow Architecture

### API Endpoints (Express Backend)

1. **`POST /api/paymentMethods`**: Fetches available payment methods for the merchant
2. **`POST /api/payments`**: Initiates a payment transaction
   - Handles 3DS2 authentication flow
   - Supports multiple payment methods (card, Klarna, etc.)
   - Returns payment response with action or result
3. **`POST /api/payments/details`**: Submits additional payment details (e.g., after 3DS redirect)
4. **`ALL /handleShopperRedirect`**: Handles redirects from payment providers
   - Processes both GET and POST redirects
   - Routes to appropriate result pages based on payment status

### Client-Side Routing (Commented in Backend)

The backend includes commented route handlers for different checkout pages:
- `/checkout/dropin`: Drop-in payment UI
- `/checkout/card`: Card payment
- `/checkout/googlepay`: Google Pay
- `/checkout/ideal`: iDEAL
- `/checkout/klarna`: Klarna
- `/checkout/sepa`: SEPA Direct Debit
- `/result/:type`: Payment result page

**Note**: These routes use `res.render()` which suggests a view engine was planned but the current setup uses React for the frontend. Future work may involve implementing these as React routes.

### Payment Data Structure

All payment requests include:
- Amount: Hardcoded to 10000 minor units (€100)
- Currency: Auto-detected based on payment method
- Browser info and shopper IP for 3DS2
- Return URL for redirect-based flows
- Line items for certain payment methods (e.g., Klarna)

## Code Style

- ES6+ JavaScript with module syntax (`import`/`export`)
- React functional components with hooks
- ESLint configuration includes React hooks and React Refresh plugins
- Browser and Node globals configured
- JSX enabled for `.js` and `.jsx` files

## Important Notes

1. **HTTPS/HTTP Detection**: The backend detects protocol from `req.socket.encrypted` for constructing return URLs
2. **Webhook Implementation**: Webhook handling code is commented out but includes HMAC validation logic
3. **Test Environment**: Application is configured to use Adyen TEST environment (see `client.setEnvironment("TEST")`)
4. **Currency Logic**: Currency is auto-selected based on payment method type (see `findCurrency()` helper)
5. **__dirname**: The Express app uses `__dirname` which may need adjustment if converting to ES modules (currently uses CommonJS-style path handling)

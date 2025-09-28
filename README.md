# Sumsub ID Verification POC (TypeScript)

A simple proof of concept for identity verification using Sumsub's WebSDK and REST API, built with Node.js/Express and TypeScript.

## Features

- 🔐 Secure ID verification with multiple levels
- 📱 Mobile-responsive web interface
- ⚡ Real-time verification status updates
- 🔄 Token refresh handling
- 📊 Verification level selection dropdown

## Available Verification Levels

- **Basic KYC Level** - Basic identity verification
- **ID Only** - Document verification only
- **ID and Liveness** - Document + liveness check (default)
- **IDV and Phone Verification** - Full verification with phone

## Prerequisites

- Node.js 18+
- Sumsub account with API credentials
- TypeScript knowledge (optional)

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create `.env.local` file:
   ```env
   SUMSUB_APP_TOKEN=your_app_token
   SUMSUB_SECRET_KEY=your_secret_key
   SUMSUB_LEVEL_NAME=id-and-liveness
   SUMSUB_ENVIRONMENT=sandbox
   PORT=3000
   ```

3. **Build and run:**
   ```bash
   # Development mode
   npm run dev

   # Production build
   npm run build
   npm start
   ```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and run development server
- `npm start` - Run compiled production server
- `npm run start:js` - Run original JavaScript version (fallback)

## Project Structure

```
├── src/
│   └── server.ts          # TypeScript server with type safety
├── public/
│   └── index.html         # Frontend with Sumsub WebSDK
├── dist/                  # Compiled JavaScript (ignored in git)
├── tsconfig.json          # TypeScript configuration
└── .env.local            # Environment variables (not in git)
```

## API Endpoints

- `POST /api/access-token` - Generate verification token
- `POST /api/refresh-token` - Refresh expired token
- `GET /api/applicant/:id` - Check verification status

## Usage

1. Open http://localhost:3000
2. Enter a unique user ID
3. Select verification level
4. Click "Start Verification Process"
5. Complete the verification steps
6. Check status using the status button

## Development

Built with:
- **Backend:** Node.js, Express, TypeScript
- **Frontend:** Vanilla JavaScript, Sumsub WebSDK
- **API:** Sumsub REST API v1

## Environment

- **Sandbox:** For testing (default)
- **Production:** For live verification

---

*This is a proof of concept for demonstration purposes.*
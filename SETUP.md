# MGNREGA Performance Tracker - Setup Guide

## Prerequisites

- **Node.js** >= 18 ([Download](https://nodejs.org/))
- **npm** >= 9
- **PostgreSQL** database (or use Neon DB for cloud hosting)

## Quick Start (Development)

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for both client and server (monorepo setup).

### 2. Configure Environment Variables

The project is pre-configured with a Neon DB connection. If you want to use a local PostgreSQL database:

**For Local PostgreSQL:**
1. Create a database: `createdb mgnrega_tracker`
2. Edit `server/.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://username:password@localhost:5432/mgnrega_tracker
REDIS_MOCK=true
```

**For Neon DB (Cloud):**
The `.env` file is already configured. Make sure `DATABASE_URL` is valid.

### 3. Initialize Database

Run the initialization script to create tables and load sample data:

```bash
npm run init-db
```

This will:
- Create the database schema (districts, monthly_stats, aggregates, fetch_logs tables)
- Load sample district and statistics data
- Create necessary indexes and triggers

### 4. Start Development Servers

```bash
npm run dev
```

This starts both:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3000 (Express server)

The frontend will automatically proxy API requests to the backend.

### 5. Open in Browser

Navigate to http://localhost:5173 and select a district to view MGNREGA performance data.

## Available Scripts

### Root Level
```bash
npm run dev           # Start both frontend and backend in development mode
npm run build         # Build both frontend and backend for production
npm start             # Start the production server (backend only)
npm run init-db       # Initialize database schema and sample data
npm run dev:client    # Start only the frontend
npm run dev:server    # Start only the backend
```

### Server (from `server/` directory)
```bash
npm run dev           # Start with nodemon (auto-reload on changes)
npm run build         # Compile TypeScript to JavaScript
npm start             # Run compiled JavaScript
npm run init-db       # Initialize database
```

### Client (from `client/` directory)
```bash
npm run dev           # Start Vite dev server
npm run build         # Build for production
npm run preview       # Preview production build locally
npm run lint          # Lint TypeScript and React files
```

## Project Structure

```
fellowship/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Utility functions
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # Entry point
│   └── package.json
│
├── server/                    # Express + Node.js backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── db/               # Database & Redis setup
│   │   ├── types/            # TypeScript interfaces
│   │   └── server.ts         # Main server file
│   ├── scripts/
│   │   └── init-neon-db.js  # Database initialization
│   ├── dist/                 # Compiled JavaScript (generated)
│   └── package.json
│
├── package.json              # Root package with workspace config
├── nginx.conf                # Nginx reverse proxy config (for production)
├── ecosystem.config.js       # PM2 config (for production)
└── README.md
```

## Database Schema

The database includes 4 main tables:

1. **districts** - District metadata (codes, names, centroids)
2. **monthly_stats** - Monthly performance metrics per district
3. **aggregates** - Pre-computed aggregated metrics
4. **fetch_logs** - Logs of API calls and errors

## API Endpoints

- `GET /api/v1/districts` - List all districts
- `GET /api/v1/districts/:id/summary` - Get district performance summary
- `GET /api/v1/districts/:id/history` - Get historical data (past N months)
- `GET /api/v1/districts/nearby?lat=X&lon=Y` - Find nearest district by coordinates
- `GET /api/v1/health` - Health check

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Make sure PostgreSQL is running and the `DATABASE_URL` in `server/.env` is correct.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: 
- Change the port in `server/.env`: `PORT=3001`
- Or kill the process: `lsof -i :3000` then `kill -9 <PID>`

### Module Not Found Errors
```
Error: Cannot find module 'express'
```
**Solution**: Run `npm install` from the root directory.

### Build Errors
```
TypeScript compilation failed
```
**Solution**: Run `npm run build` to see detailed errors, then check for missing dependencies or type issues.

### Frontend can't reach backend
```
Error: Failed to fetch /api/v1/districts
```
**Solution**: Make sure both servers are running and the API URL in `client/.env` is correct.

## Performance Tuning

### For Development
- Redis is mocked in-memory by default (set `REDIS_MOCK=true`)
- Hot reload is enabled for both frontend and backend

### For Production
- Set `NODE_ENV=production` in `server/.env`
- Use real Redis instead of mock
- Enable caching with appropriate `CACHE_TTL`
- Use PM2 for process management: `pm2 start ecosystem.config.js`
- Use nginx as reverse proxy (see `nginx.conf`)

## Data Updates

To fetch fresh MGNREGA data from data.gov.in:

1. Configure API credentials in `server/.env`:
```env
DATA_GOV_API_KEY=your_api_key_here
DATA_GOV_MGNREGA_RESOURCE_ID=your_resource_id
```

2. The ETL service will run on a schedule (configurable via `ETL_SCHEDULE`)

For manual refresh, call:
```bash
npm run init-db  # Reset with fresh sample data
```

## Deployment

For production deployment, see [Deployment Guide](./deploy.sh)

---

Need help? Check the [README.md](./README.md) or open an issue on GitHub.
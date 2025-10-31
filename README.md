# MGNREGA Performance Tracker

A mobile-first, voice-friendly web application for tracking MGNREGA performance metrics at the district level.

## Features

- 📱 Mobile-first design with accessibility features
- 🗣️ Voice readout and basic voice commands
- 📊 Visual performance metrics with simple indicators
- 🌍 District auto-detection (optional)
- 📵 Offline support via PWA
- 🔄 Automatic data sync with fallback mechanisms

## Tech Stack

- Frontend: React + TypeScript + Vite + PWA
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Redis
- Storage: S3/MinIO for raw data backups
- Deployment: PM2 + nginx

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6
- PM2 (for production)

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # In server directory
   cp .env.example .env
   # Edit .env with your configurations
   ```

4. Set up the database:
   ```bash
   psql -U postgres
   CREATE DATABASE mgnrega_tracker;
   \c mgnrega_tracker
   \i server/src/db/schema.sql
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set up nginx:
   ```bash
   sudo apt install nginx
   # Configure reverse proxy
   ```

3. Start with PM2:
   ```bash
   cd server
   pm2 start ecosystem.config.js
   ```

## API Endpoints

- `GET /api/v1/districts` - List all districts
- `GET /api/v1/districts/:id/summary` - Get district performance summary
- `GET /api/v1/districts/:id/history` - Get historical data
- `GET /api/v1/state/:id/summary` - Get state-level averages

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
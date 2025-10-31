import express from 'express';
import { DistrictService } from '../services/district.service';
import { GeolocationService } from '../services/geolocation.service';

const router = express.Router();
const districtService = new DistrictService();
const geolocationService = new GeolocationService();

// Initialize geolocation service
geolocationService.initialize().catch(err => console.error('Failed to initialize geolocation service:', err));

// Get all districts
router.get('/districts', async (req, res) => {
  try {
    const districts = await districtService.getDistricts();
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearest district by lat/lon (with caching)
router.get('/districts/nearby', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Please provide lat and lon query parameters'
      });
    }

    const latNum = parseFloat(lat as string);
    const lonNum = parseFloat(lon as string);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Coordinates must be valid numbers'
      });
    }

    const district = await geolocationService.findNearestDistrict(latNum, lonNum);

    if (!district) {
      return res.status(404).json({
        error: 'No district found',
        message: 'Could not find a district near the given coordinates'
      });
    }

    res.json(district);
  } catch (error) {
    console.error('Error finding nearby district:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to find nearby district'
    });
  }
});

// Get nearby districts within radius
router.get('/districts/nearby-multiple', async (req, res) => {
  try {
    const { lat, lon, radius = '50' } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon' });
    }

    const latNum = parseFloat(lat as string);
    const lonNum = parseFloat(lon as string);
    const radiusNum = Math.min(parseInt(radius as string) || 50, 200); // Cap at 200km

    const districts = await geolocationService.findNearbyDistricts(latNum, lonNum, radiusNum);
    res.json(districts);
  } catch (error) {
    console.error('Error finding nearby districts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get district summary with fallback to cached data
router.get('/districts/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;

    const districtId = parseInt(id);
    if (isNaN(districtId)) {
      return res.status(400).json({ error: 'Invalid district ID' });
    }

    const summary = await districtService.getDistrictSummary(
      districtId,
      month as string | undefined
    );

    if (!summary) {
      return res.status(404).json({ error: 'District not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching district summary:', error);
    res.status(500).json({
      error: 'Failed to fetch district summary',
      details: (error as any)?.message
    });
  }
});

// Get district history
router.get('/districts/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { months = '12' } = req.query;

    const districtId = parseInt(id);
    if (isNaN(districtId)) {
      return res.status(400).json({ error: 'Invalid district ID' });
    }

    const monthsNum = Math.min(parseInt(months as string) || 12, 60); // Cap at 5 years

    const history = await districtService.getDistrictHistory(districtId, monthsNum);
    res.json(history || []);
  } catch (error) {
    console.error('Error fetching district history:', error);
    res.status(500).json({
      error: 'Failed to fetch district history',
      details: (error as any)?.message
    });
  }
});

// Health check with database verification
router.get('/health', async (req, res) => {
  try {
    const Database = require('../db').default;
    const result = await Database.query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: (error as any)?.message
    });
  }
});

export default router;
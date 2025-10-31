import express from 'express';
import { DistrictService } from '../services/district.service';

const router = express.Router();
const districtService = new DistrictService();

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

// Get nearest district by lat/lon
router.get('/districts/nearby', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Missing lat or lon' });
    const latNum = parseFloat(lat as string);
    const lonNum = parseFloat(lon as string);
    const district = await districtService.findNearestDistrict(latNum, lonNum);
    if (!district) return res.status(404).json({ error: 'No district found' });
    res.json(district);
  } catch (error) {
    console.error('Error finding nearby district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get district summary
router.get('/districts/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;
    const summary = await districtService.getDistrictSummary(
      parseInt(id), 
      month as string | undefined
    );
    res.json(summary);
  } catch (error) {
    console.error('Error fetching district summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get district history
router.get('/districts/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { months = '12' } = req.query;
    // Implementation needed
    res.json({ message: 'Not implemented yet' });
  } catch (error) {
    console.error('Error fetching district history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;